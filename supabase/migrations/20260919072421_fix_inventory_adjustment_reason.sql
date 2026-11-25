create or replace function public.adjust_website_inventory(
  p_company_id uuid,
  p_product_id uuid,
  p_change numeric,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_product public.website_products%rowtype;
  v_after numeric;
  v_tx_id uuid;
  v_before numeric;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id=v_uid and p.company_id=p_company_id
      and coalesce(p.active,true)=true and p.role in ('admin','super_admin')
  ) then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  if p_change is null or p_change = 0 then
    raise exception 'Stock change must be non-zero.';
  end if;

  select * into v_product
  from public.website_products
  where company_id=p_company_id and id=p_product_id
  for update;

  if not found then raise exception 'Product not found.'; end if;
  if coalesce(v_product.track_inventory,true)=false then
    raise exception 'Inventory tracking is disabled for this product.';
  end if;

  v_before:=coalesce(v_product.stock_quantity,0);
  v_after:=v_before+p_change;
  if v_after<0 then raise exception 'Stock cannot go below zero.'; end if;

  update public.website_products
  set stock_quantity=v_after,updated_at=now()
  where company_id=p_company_id and id=p_product_id;

  insert into public.website_inventory_transactions(
    company_id,product_id,change_quantity,quantity_before,quantity_after,
    reason,reference_type,reference_id,created_by,created_at
  ) values (
    p_company_id,p_product_id,p_change,v_before,v_after,
    coalesce(nullif(trim(coalesce(p_reason,'')),''),'Manual adjustment'),
    'manual',null,v_uid,now()
  ) returning id into v_tx_id;

  return jsonb_build_object(
    'transaction_id',v_tx_id,
    'product_id',p_product_id,
    'quantity_before',v_before,
    'quantity_after',v_after,
    'change_quantity',p_change
  );
end;
$function$;

revoke all on function public.adjust_website_inventory(uuid,uuid,numeric,text) from public;
grant execute on function public.adjust_website_inventory(uuid,uuid,numeric,text) to authenticated;
