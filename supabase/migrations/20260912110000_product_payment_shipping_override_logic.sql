create or replace function public.place_website_order(
 p_company_id uuid,
 p_name text,
 p_phone text,
 p_email text,
 p_address jsonb,
 p_items jsonb,
 p_payment_method text default 'COD',
 p_note text default null,
 p_coupon_code text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
 v_order_id uuid; v_customer_id uuid; v_order_no text;
 v_subtotal numeric:=0; v_shipping numeric:=0; v_discount numeric:=0; v_total numeric:=0;
 v_item jsonb; v_product public.website_products%rowtype; v_qty numeric; v_line numeric;
 v_before numeric; v_after numeric; v_coupon public.website_discounts%rowtype;
 v_code text:=upper(trim(coalesce(p_coupon_code,'')));
 v_agg_qty numeric; v_has_default_shipping boolean:=false; v_selected text:=upper(coalesce(p_payment_method,'COD'));
begin
 if not exists(select 1 from public.website_settings where company_id=p_company_id and slug='pinkbox' and status='active') then raise exception 'Store is not configured.'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'At least one product is required.'; end if;
 if jsonb_array_length(p_items)>100 then raise exception 'Too many products in one order.'; end if;
 if v_selected not in ('COD','ONLINE') then raise exception 'Invalid payment method.'; end if;
 if length(trim(coalesce(p_name,'')))<2 or length(trim(coalesce(p_phone,'')))<7 or length(trim(coalesce(p_address->>'address','')))<5 then raise exception 'Valid name, phone and delivery address are required.'; end if;
 for v_item in select value from jsonb_array_elements(p_items) loop
  if not (v_item ? 'product_id') then raise exception 'Product id is required.'; end if;
  if (v_item->>'product_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'Invalid product id.'; end if;
  begin v_qty := (v_item->>'quantity')::numeric; exception when others then raise exception 'Invalid product quantity.'; end;
  if v_qty<=0 or v_qty>100 or v_qty<>trunc(v_qty) then raise exception 'Product quantity must be a whole number between 1 and 100.'; end if;
  select * into v_product from public.website_products where company_id=p_company_id and id=(v_item->>'product_id')::uuid and is_active=true for update;
  if not found then raise exception 'Product not found or inactive.'; end if;
  if v_selected='COD' and coalesce(v_product.cod_override,(select coalesce(cod_enabled,true) from public.website_settings where company_id=p_company_id and slug='pinkbox'))=false then raise exception 'Cash on Delivery is not available for one or more products.'; end if;
  if v_selected='ONLINE' and coalesce(v_product.online_payment_override,(select coalesce(online_payment_enabled,false) from public.website_settings where company_id=p_company_id and slug='pinkbox'))=false then raise exception 'Online payment is not available for one or more products.'; end if;
  if v_product.track_inventory and not v_product.allow_backorder then
   select coalesce(sum((x.value->>'quantity')::numeric),0) into v_agg_qty from jsonb_array_elements(p_items) x where x.value->>'product_id'=v_product.id::text;
   if coalesce(v_product.stock_quantity,0)<coalesce(v_agg_qty,0) then raise exception 'Insufficient stock for %.',v_product.title; end if;
  end if;
  v_line:=round(coalesce(v_product.price,0)*v_qty,2); v_subtotal:=v_subtotal+v_line;
  if v_product.shipping_charge_override is null then v_has_default_shipping:=true; else v_shipping:=v_shipping+round(greatest(0,v_product.shipping_charge_override)*v_qty,2); end if;
 end loop;
 if v_code<>'' then
  select * into v_coupon from public.website_discounts where company_id=p_company_id and upper(code)=v_code and is_active=true and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now()) and (usage_limit is null or coalesce(usage_count,0)<usage_limit) for update;
  if not found then raise exception 'Invalid or expired coupon code.'; end if;
  if coalesce(v_subtotal,0)<coalesce(v_coupon.minimum_order_amount,0) then raise exception 'Minimum order amount for this coupon is %.',v_coupon.minimum_order_amount; end if;
  if v_coupon.discount_type='percentage' then v_discount:=round(v_subtotal*coalesce(v_coupon.value,0)/100,2); else v_discount:=coalesce(v_coupon.value,0); end if;
  if v_coupon.maximum_discount_amount is not null then v_discount:=least(v_discount,v_coupon.maximum_discount_amount); end if;
  v_discount:=greatest(0,least(v_discount,v_subtotal));
  update public.website_discounts set usage_count=coalesce(usage_count,0)+1,updated_at=now() where id=v_coupon.id and company_id=p_company_id;
 end if;
 if exists(select 1 from public.website_settings where company_id=p_company_id and slug='pinkbox' and coalesce(shipping_enabled,true)) then
  if coalesce((select free_shipping_threshold from public.website_settings where company_id=p_company_id and slug='pinkbox'),0)>0 and (v_subtotal-v_discount)>=(select free_shipping_threshold from public.website_settings where company_id=p_company_id and slug='pinkbox') then
   v_shipping:=0;
  elsif v_has_default_shipping then
   v_shipping:=v_shipping+coalesce((select default_shipping_charge from public.website_settings where company_id=p_company_id and slug='pinkbox'),0);
  end if;
 else v_shipping:=0; end if;
 v_total:=greatest(0,v_subtotal-v_discount)+v_shipping;
 select id into v_customer_id from public.customers where company_id=p_company_id and phone1=trim(p_phone) limit 1;
 if v_customer_id is null then insert into public.customers(company_id,client_name,phone1,email,address,pincode,city,state,created_at,updated_at) values(p_company_id,trim(p_name),trim(p_phone),nullif(trim(coalesce(p_email,'')),''),p_address->>'address',p_address->>'pincode',p_address->>'city',p_address->>'state',now(),now()) returning id into v_customer_id;
 else update public.customers set client_name=coalesce(nullif(trim(p_name),''),client_name),email=coalesce(nullif(trim(coalesce(p_email,'')),''),email),address=coalesce(p_address->>'address',address),pincode=coalesce(p_address->>'pincode',pincode),city=coalesce(p_address->>'city',city),state=coalesce(p_address->>'state',state),updated_at=now() where id=v_customer_id and company_id=p_company_id; end if;
 v_order_no:='PB-'||to_char(clock_timestamp(),'YYMMDDHH24MISSMS');
 insert into public.website_orders(company_id,order_number,customer_id,customer_name,customer_phone,customer_email,shipping_address,billing_address,subtotal,discount_amount,shipping_amount,tax_amount,total_amount,payment_method,payment_status,order_status,notes,created_at,updated_at) values(p_company_id,v_order_no,v_customer_id,trim(p_name),trim(p_phone),nullif(trim(coalesce(p_email,'')),''),p_address,p_address,v_subtotal,v_discount,v_shipping,0,v_total,v_selected,'pending','pending',nullif(trim(coalesce(p_note,'')),''),now(),now()) returning id into v_order_id;
 for v_item in select value from jsonb_array_elements(p_items) loop
  v_qty:=(v_item->>'quantity')::numeric;
  select * into v_product from public.website_products where company_id=p_company_id and id=(v_item->>'product_id')::uuid for update;
  v_line:=round(coalesce(v_product.price,0)*v_qty,2);
  insert into public.website_order_items(company_id,order_id,product_id,product_name,sku,quantity,unit_price,discount_amount,tax_amount,line_total) values(p_company_id,v_order_id,v_product.id,v_product.title,v_product.sku,v_qty,v_product.price,0,0,v_line);
  if v_product.track_inventory then v_before:=coalesce(v_product.stock_quantity,0); v_after:=greatest(v_before-v_qty,0); update public.website_products set stock_quantity=v_after,updated_at=now() where id=v_product.id and company_id=p_company_id; insert into public.website_inventory_transactions(company_id,product_id,change_quantity,quantity_before,quantity_after,reason,reference_type,reference_id,created_at) values(p_company_id,v_product.id,-v_qty,v_before,v_after,'Website order '||v_order_no,'website_order',v_order_id,now()); end if;
 end loop;
 insert into public.website_order_status_history(company_id,order_id,status,note,created_at) values(p_company_id,v_order_id,'pending','Order placed from PinkBox website',now());
 return jsonb_build_object('order_id',v_order_id,'order_number',v_order_no,'subtotal',v_subtotal,'discount_amount',v_discount,'shipping_amount',v_shipping,'total_amount',v_total,'item_count',jsonb_array_length(p_items));
end;
$$;
