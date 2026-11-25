create or replace function public.place_website_order(p_company_id uuid, p_name text, p_phone text, p_email text, p_address jsonb, p_items jsonb, p_payment_method text default 'COD'::text, p_note text default null::text, p_coupon_code text default null::text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order_id uuid;
  v_customer_id uuid;
  v_order_no text;
  v_subtotal numeric := 0;
  v_shipping numeric := 0;
  v_total numeric := 0;
  v_item jsonb;
  v_product public.website_products%rowtype;
  v_qty numeric;
  v_line numeric;
  v_before numeric;
  v_after numeric;
begin
  if not exists (
    select 1 from public.website_settings
    where company_id = p_company_id and slug = 'pinkbox' and status = 'active'
  ) then
    raise exception 'Store is not configured.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one product is required.';
  end if;

  if nullif(trim(coalesce(p_coupon_code,'')), '') is not null then
    raise exception 'Coupons are not configured yet.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if not (v_item ? 'product_id') then raise exception 'Product id is required.'; end if;
    v_qty := coalesce((v_item->>'quantity')::numeric, 0);
    if v_qty <= 0 then raise exception 'Product quantity must be greater than zero.'; end if;

    select * into v_product
    from public.website_products
    where company_id = p_company_id
      and id = (v_item->>'product_id')::uuid
      and is_active = true
    for update;

    if not found then raise exception 'Product not found or inactive.'; end if;
    if v_product.track_inventory and not v_product.allow_backorder
       and coalesce(v_product.stock_quantity,0) < v_qty then
      raise exception 'Insufficient stock for %.', v_product.title;
    end if;

    v_line := coalesce(v_product.price,0) * v_qty;
    v_subtotal := v_subtotal + v_line;
  end loop;

  select coalesce(default_shipping_charge,0) into v_shipping
  from public.website_settings
  where company_id = p_company_id and slug = 'pinkbox';

  v_total := v_subtotal + v_shipping;

  select id into v_customer_id
  from public.customers
  where company_id = p_company_id and phone1 = trim(p_phone)
  limit 1;

  if v_customer_id is null then
    insert into public.customers(company_id,client_name,phone1,email,address,pincode,city,state,created_at,updated_at)
    values(p_company_id,trim(p_name),trim(p_phone),nullif(trim(coalesce(p_email,'')),''),p_address->>'address',p_address->>'pincode',p_address->>'city',p_address->>'state',now(),now())
    returning id into v_customer_id;
  else
    update public.customers
    set client_name=coalesce(nullif(trim(p_name),''),client_name),
        email=coalesce(nullif(trim(coalesce(p_email,'')),''),email),
        address=coalesce(p_address->>'address',address),
        pincode=coalesce(p_address->>'pincode',pincode),
        city=coalesce(p_address->>'city',city),
        state=coalesce(p_address->>'state',state),
        updated_at=now()
    where id=v_customer_id and company_id=p_company_id;
  end if;

  v_order_no := 'PB-' || to_char(clock_timestamp(),'YYMMDDHH24MISSMS');

  insert into public.website_orders(
    company_id,order_number,customer_id,customer_name,customer_phone,customer_email,
    shipping_address,billing_address,subtotal,discount_amount,shipping_amount,tax_amount,
    total_amount,payment_method,payment_status,order_status,notes,created_at,updated_at
  ) values(
    p_company_id,v_order_no,v_customer_id,trim(p_name),trim(p_phone),nullif(trim(coalesce(p_email,'')),''),
    p_address,p_address,v_subtotal,0,v_shipping,0,v_total,upper(coalesce(p_payment_method,'COD')),
    'pending','new',nullif(trim(coalesce(p_note,'')),''),now(),now()
  ) returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item->>'quantity')::numeric,0);
    select * into v_product from public.website_products
    where company_id=p_company_id and id=(v_item->>'product_id')::uuid for update;
    v_line := coalesce(v_product.price,0) * v_qty;

    insert into public.website_order_items(
      company_id,order_id,product_id,product_name,sku,quantity,unit_price,
      discount_amount,tax_amount,line_total
    ) values(
      p_company_id,v_order_id,v_product.id,v_product.title,v_product.sku,v_qty,v_product.price,0,0,v_line
    );

    if v_product.track_inventory then
      v_before := coalesce(v_product.stock_quantity,0);
      v_after := greatest(v_before-v_qty,0);
      update public.website_products
      set stock_quantity=v_after,updated_at=now()
      where id=v_product.id and company_id=p_company_id;

      insert into public.website_inventory_transactions(
        company_id,product_id,change_quantity,quantity_before,quantity_after,
        reason,reference_type,reference_id,created_at
      ) values(
        p_company_id,v_product.id,-v_qty,v_before,v_after,
        'Website order '||v_order_no,'website_order',v_order_id,now()
      );
    end if;
  end loop;

  insert into public.website_order_status_history(company_id,order_id,status,note,created_at)
  values(p_company_id,v_order_id,'new','Order placed from PinkBox website',now());

  return jsonb_build_object(
    'order_id',v_order_id,
    'order_number',v_order_no,
    'subtotal',v_subtotal,
    'discount_amount',0,
    'shipping_amount',v_shipping,
    'total_amount',v_total,
    'item_count',jsonb_array_length(p_items)
  );
end;
$function$;
