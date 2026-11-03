CREATE OR REPLACE FUNCTION public.adjust_website_variant_stock(p_company_id uuid, p_variant_id uuid, p_change numeric, p_reason text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS website_inventory_transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_variant public.website_product_variants;
  v_track_inventory boolean;
  v_txn public.website_inventory_transactions;
  v_before numeric;
  v_after numeric;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id=auth.uid()
      and p.company_id=p_company_id
      and coalesce(p.active,true)=true
      and p.role in ('admin','super_admin')
  ) then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  if p_user_id is distinct from auth.uid() then
    raise exception 'Invalid user.' using errcode='42501';
  end if;

  if p_change is null or p_change=0 then
    raise exception 'Stock change must be non-zero.';
  end if;

  select p.track_inventory into v_track_inventory
  from public.website_products p
  join public.website_product_variants v
    on v.product_id=p.id and v.company_id=p.company_id
  where p.company_id=p_company_id and v.id=p_variant_id;

  if not found then
    raise exception 'Product variant not found.';
  end if;
  if not coalesce(v_track_inventory,true) then
    raise exception 'Inventory tracking is disabled for this product.';
  end if;

  select * into v_variant
  from public.website_product_variants
  where company_id=p_company_id and id=p_variant_id
  for update;

  if not found then
    raise exception 'Product variant not found.';
  end if;

  v_before:=coalesce(v_variant.stock_quantity,0);
  v_after:=v_before+p_change;
  if v_after<0 then
    raise exception 'This would take variant stock below zero (currently %).',v_before;
  end if;

  update public.website_product_variants
  set stock_quantity=v_after,updated_at=now()
  where company_id=p_company_id and id=p_variant_id;

  insert into public.website_inventory_transactions(
    company_id,product_id,variant_id,change_quantity,quantity_before,quantity_after,
    reason,reference_type,created_by
  ) values(
    p_company_id,v_variant.product_id,v_variant.id,p_change,v_before,v_after,
    left(coalesce(p_reason,'Manual variant adjustment'),500),'manual',p_user_id
  ) returning * into v_txn;

  return v_txn;
end;
$function$

