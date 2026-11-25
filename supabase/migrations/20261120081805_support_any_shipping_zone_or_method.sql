CREATE OR REPLACE FUNCTION public.calculate_website_shipping(
  p_company_id uuid,
  p_subtotal numeric,
  p_discount numeric,
  p_state text DEFAULT NULL::text,
  p_pincode text DEFAULT NULL::text,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS numeric
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
declare
  v_shipping numeric := 0;
  v_default numeric := 0;
  v_has_default boolean := false;
  v_item jsonb;
  v_product public.website_products%rowtype;
  v_qty numeric;
  v_rule_rate numeric;
  v_rule_found boolean := false;
  v_discounted numeric := greatest(0, coalesce(p_subtotal,0) - coalesce(p_discount,0));
  v_free_threshold numeric := 0;
  v_enabled boolean := true;
  v_variant_id uuid;
begin
  select coalesce(shipping_enabled,true),coalesce(default_shipping_charge,0),coalesce(free_shipping_threshold,0)
    into v_enabled,v_default,v_free_threshold
  from public.website_settings
  where company_id=p_company_id and slug='pinkbox' and status='active';

  if not v_enabled then return 0; end if;
  if v_free_threshold>0 and v_discounted>=v_free_threshold then return 0; end if;

  if jsonb_typeof(coalesce(p_items,'[]'::jsonb))='array' then
    for v_item in select value from jsonb_array_elements(p_items) loop
      begin
        v_qty:=greatest(1,(v_item->>'quantity')::numeric);
      exception when others then
        v_qty:=1;
      end;

      if (v_item ? 'product_id') then
        select * into v_product
        from public.website_products
        where company_id=p_company_id
          and id=(v_item->>'product_id')::uuid
          and is_active=true;

        if found then
          v_variant_id := nullif(v_item->>'variant_id','')::uuid;
          if v_variant_id is not null and not exists (
            select 1 from public.website_product_variants v
            where v.company_id=p_company_id
              and v.id=v_variant_id
              and v.product_id=v_product.id
              and v.is_active=true
          ) then
            v_has_default:=true;
          elsif v_product.shipping_charge_override is not null then
            v_shipping:=v_shipping+greatest(0,v_product.shipping_charge_override)*v_qty;
          else
            v_has_default:=true;
          end if;
        else
          v_has_default:=true;
        end if;
      else
        v_has_default:=true;
      end if;
    end loop;
  end if;

  if not v_has_default then return round(v_shipping,2); end if;

  -- A null zone or method means "Any" in the admin UI. Keep rules with
  -- specific zones/methods scoped to active matching records.
  select r.rate into v_rule_rate
  from public.website_shipping_rules r
  left join public.website_shipping_zones z
    on z.id=r.zone_id and z.company_id=r.company_id
  left join public.website_shipping_methods m
    on m.id=r.method_id and m.company_id=r.company_id
  where r.company_id=p_company_id
    and r.is_active=true
    and (r.zone_id is null or coalesce(z.is_active,false)=true)
    and (r.method_id is null or coalesce(m.is_active,false)=true)
    and r.min_order_amount<=v_discounted
    and (
      r.zone_id is null
      or (
        (jsonb_array_length(coalesce(z.pincodes,'[]'::jsonb))=0 and jsonb_array_length(coalesce(z.states,'[]'::jsonb))=0)
        or exists(select 1 from jsonb_array_elements_text(coalesce(z.pincodes,'[]'::jsonb)) x where trim(x)=trim(coalesce(p_pincode,'')))
        or exists(select 1 from jsonb_array_elements_text(coalesce(z.states,'[]'::jsonb)) x where lower(trim(x))=lower(trim(coalesce(p_state,''))))
      )
    )
  order by r.min_order_amount desc,r.rate asc
  limit 1;

  if v_rule_rate is not null then
    v_shipping:=v_shipping+greatest(0,v_rule_rate);
    v_rule_found:=true;
  end if;

  if not v_rule_found then
    v_shipping:=v_shipping+v_default;
  end if;

  return round(greatest(0,v_shipping),2);
end;
$function$;
