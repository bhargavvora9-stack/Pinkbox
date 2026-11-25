create or replace function public.bulk_update_website_products(
  p_company_id uuid,
  p_user_id uuid,
  p_product_ids uuid[],
  p_field text,
  p_value jsonb,
  p_stock_mode text default 'set'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_changed integer := 0;
  v_before numeric;
  v_after numeric;
  v_value_text text;
  v_value_num numeric;
  v_value_bool boolean;
  v_value_nullable_bool boolean;
  v_value_nullable_num numeric;
begin
  if p_company_id is null or p_user_id is null then raise exception 'Company and user are required.'; end if;
  if coalesce(array_length(p_product_ids,1),0)=0 then raise exception 'At least one product is required.'; end if;
  if coalesce(array_length(p_product_ids,1),0)>200 then raise exception 'Maximum 200 products per bulk update.'; end if;
  if p_field not in ('brand','price','compare_at_price','cost_price','gst_percent','low_stock_threshold','track_inventory','allow_backorder','featured','is_active','cod_override','online_payment_override','shipping_charge_override','stock_quantity') then raise exception 'Field is not allowed for bulk update.'; end if;
  if p_field='stock_quantity' and p_stock_mode not in ('set','increase','decrease') then raise exception 'Invalid stock mode.'; end if;

  if p_field in ('price','compare_at_price','cost_price','gst_percent','low_stock_threshold','shipping_charge_override','stock_quantity') then
    if jsonb_typeof(p_value) not in ('number','string') then raise exception 'Value must be numeric.'; end if;
    begin v_value_num := (p_value #>> '{}')::numeric; exception when others then raise exception 'Value must be numeric.'; end;
    if v_value_num < 0 then raise exception 'Value cannot be negative.'; end if;
  elsif p_field in ('track_inventory','allow_backorder','featured','is_active') then
    if jsonb_typeof(p_value)<>'boolean' then raise exception 'Value must be boolean.'; end if;
    v_value_bool := (p_value #>> '{}')::boolean;
  elsif p_field in ('cod_override','online_payment_override') then
    if jsonb_typeof(p_value) not in ('boolean','null') then raise exception 'Value must be true, false, or null.'; end if;
    v_value_nullable_bool := case when jsonb_typeof(p_value)='null' then null else (p_value #>> '{}')::boolean end;
  elsif p_field='brand' then
    if jsonb_typeof(p_value)<>'string' then raise exception 'Brand must be text.'; end if;
    v_value_text := left(trim(p_value #>> '{}'),120);
  end if;

  if not exists (
    select 1 from public.profiles p where p.id=p_user_id and p.company_id=p_company_id and p.active=true and p.role in ('admin','super_admin')
  ) then raise exception 'Access denied.'; end if;

  for r in select id, stock_quantity from public.website_products where company_id=p_company_id and id=any(p_product_ids) for update loop
    if p_field='stock_quantity' then
      v_before := coalesce(r.stock_quantity,0);
      v_after := case p_stock_mode when 'increase' then v_before+v_value_num when 'decrease' then v_before-v_value_num else v_value_num end;
      if v_after < 0 then raise exception 'Stock cannot go below zero.'; end if;
      update public.website_products set stock_quantity=v_after, updated_at=now() where company_id=p_company_id and id=r.id;
      insert into public.website_inventory_transactions(company_id,product_id,change_quantity,quantity_before,quantity_after,reason,reference_type,reference_id,created_by)
      values(p_company_id,r.id,v_after-v_before,v_before,v_after,'Bulk stock update','bulk_update',null,p_user_id);
    elsif p_field in ('price','compare_at_price','cost_price','gst_percent','low_stock_threshold') then
      if p_field='price' then update public.website_products set price=v_value_num,updated_at=now() where company_id=p_company_id and id=r.id;
      elsif p_field='compare_at_price' then update public.website_products set compare_at_price=v_value_num,updated_at=now() where company_id=p_company_id and id=r.id;
      elsif p_field='cost_price' then update public.website_products set cost_price=v_value_num,updated_at=now() where company_id=p_company_id and id=r.id;
      elsif p_field='gst_percent' then update public.website_products set gst_percent=v_value_num,updated_at=now() where company_id=p_company_id and id=r.id;
      else update public.website_products set low_stock_threshold=v_value_num,updated_at=now() where company_id=p_company_id and id=r.id; end if;
    elsif p_field='shipping_charge_override' then
      update public.website_products set shipping_charge_override=v_value_num,updated_at=now() where company_id=p_company_id and id=r.id;
    elsif p_field='brand' then
      update public.website_products set brand=case when v_value_text='' then null else v_value_text end,updated_at=now() where company_id=p_company_id and id=r.id;
    elsif p_field='track_inventory' then update public.website_products set track_inventory=v_value_bool,updated_at=now() where company_id=p_company_id and id=r.id;
    elsif p_field='allow_backorder' then update public.website_products set allow_backorder=v_value_bool,updated_at=now() where company_id=p_company_id and id=r.id;
    elsif p_field='featured' then update public.website_products set featured=v_value_bool,updated_at=now() where company_id=p_company_id and id=r.id;
    elsif p_field='is_active' then update public.website_products set is_active=v_value_bool,updated_at=now() where company_id=p_company_id and id=r.id;
    elsif p_field='cod_override' then update public.website_products set cod_override=v_value_nullable_bool,updated_at=now() where company_id=p_company_id and id=r.id;
    elsif p_field='online_payment_override' then update public.website_products set online_payment_override=v_value_nullable_bool,updated_at=now() where company_id=p_company_id and id=r.id;
    end if;
    v_changed := v_changed+1;
  end loop;
  return jsonb_build_object('count',v_changed,'field',p_field,'stock_mode',case when p_field='stock_quantity' then p_stock_mode else null end);
end;
$$;

revoke all on function public.bulk_update_website_products(uuid,uuid,uuid[],text,jsonb,text) from public;
revoke all on function public.bulk_update_website_products(uuid,uuid,uuid[],text,jsonb,text) from anon;
revoke all on function public.bulk_update_website_products(uuid,uuid,uuid[],text,jsonb,text) from authenticated;
grant execute on function public.bulk_update_website_products(uuid,uuid,uuid[],text,jsonb,text) to service_role;
