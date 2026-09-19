create or replace function public.adjust_website_stock(
  p_company_id uuid,
  p_product_id uuid,
  p_change numeric,
  p_reason text,
  p_user_id uuid
)
returns public.website_inventory_transactions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_product public.website_products;
  v_txn public.website_inventory_transactions;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = p_company_id
      and coalesce(p.active,true) = true
      and p.role in ('admin','super_admin')
  ) then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  if p_user_id is distinct from auth.uid() then
    raise exception 'Invalid user.' using errcode='42501';
  end if;

  if p_change is null or p_change = 0 then
    raise exception 'Stock change must be non-zero.';
  end if;

  select *
    into v_product
    from public.website_products
   where id = p_product_id
     and company_id = p_company_id
   for update;

  if not found then
    raise exception 'Product not found.';
  end if;

  if coalesce(v_product.stock_quantity,0) + p_change < 0 then
    raise exception 'This would take stock below zero (currently %).', coalesce(v_product.stock_quantity,0);
  end if;

  update public.website_products
     set stock_quantity = coalesce(v_product.stock_quantity,0) + p_change,
         updated_at = now()
   where id = p_product_id
     and company_id = p_company_id;

  insert into public.website_inventory_transactions (
    company_id, product_id, change_quantity, quantity_before, quantity_after,
    reason, reference_type, created_by
  ) values (
    p_company_id, p_product_id, p_change,
    coalesce(v_product.stock_quantity,0),
    coalesce(v_product.stock_quantity,0) + p_change,
    left(coalesce(p_reason,'Manual adjustment'),500),
    'manual',
    p_user_id
  )
  returning * into v_txn;

  return v_txn;
end;
$$;

revoke execute on function public.adjust_website_stock(uuid,uuid,numeric,text,uuid) from public, anon;
grant execute on function public.adjust_website_stock(uuid,uuid,numeric,text,uuid) to authenticated;