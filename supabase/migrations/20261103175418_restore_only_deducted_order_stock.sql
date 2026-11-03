-- Restore only stock that checkout actually deducted; do not create stock for untracked or backordered quantities.
CREATE OR REPLACE FUNCTION public.restore_website_order_stock_on_terminal_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_item record;
  v_before numeric;
  v_after numeric;
  v_restored boolean;
  v_restore_qty numeric;
begin
  if tg_op <> 'UPDATE' then return new; end if;
  if lower(coalesce(new.order_status,'')) not in ('cancelled','returned','refunded') then return new; end if;
  if lower(coalesce(old.order_status,'')) in ('cancelled','returned','refunded') then return new; end if;

  for v_item in
    select oi.product_id,oi.variant_id
    from public.website_order_items oi
    where oi.company_id=new.company_id and oi.order_id=new.id and oi.product_id is not null
    group by oi.product_id,oi.variant_id
  loop
    select exists(
      select 1 from public.website_inventory_transactions it
      where it.company_id=new.company_id
        and it.product_id=v_item.product_id
        and it.variant_id is not distinct from v_item.variant_id
        and it.reference_type='website_order_restock'
        and it.reference_id=new.id
    ) into v_restored;

    if not v_restored then
      -- Restore only the quantity that was actually deducted at checkout.
      -- This avoids creating stock for untracked products or backordered quantities.
      select coalesce(sum(greatest(it.quantity_before-it.quantity_after,0)),0)
        into v_restore_qty
      from public.website_inventory_transactions it
      where it.company_id=new.company_id
        and it.product_id=v_item.product_id
        and it.variant_id is not distinct from v_item.variant_id
        and it.reference_type='website_order'
        and it.reference_id=new.id;

      if v_restore_qty>0 then
        if v_item.variant_id is not null then
          select stock_quantity into v_before
          from public.website_product_variants
          where company_id=new.company_id and id=v_item.variant_id and product_id=v_item.product_id
          for update;
          if found then
            v_after:=coalesce(v_before,0)+v_restore_qty;
            update public.website_product_variants
            set stock_quantity=v_after,updated_at=now()
            where company_id=new.company_id and id=v_item.variant_id and product_id=v_item.product_id;
            insert into public.website_inventory_transactions(
              company_id,product_id,variant_id,change_quantity,quantity_before,quantity_after,
              reason,reference_type,reference_id,created_at
            ) values(
              new.company_id,v_item.product_id,v_item.variant_id,v_restore_qty,v_before,v_after,
              'Restored for website order '||new.order_number||' ('||lower(new.order_status)||')',
              'website_order_restock',new.id,now()
            );
          end if;
        else
          select stock_quantity into v_before
          from public.website_products
          where company_id=new.company_id and id=v_item.product_id
          for update;
          if found then
            v_after:=coalesce(v_before,0)+v_restore_qty;
            update public.website_products set stock_quantity=v_after,updated_at=now()
            where company_id=new.company_id and id=v_item.product_id;
            insert into public.website_inventory_transactions(
              company_id,product_id,variant_id,change_quantity,quantity_before,quantity_after,
              reason,reference_type,reference_id,created_at
            ) values(
              new.company_id,v_item.product_id,null,v_restore_qty,v_before,v_after,
              'Restored for website order '||new.order_number||' ('||lower(new.order_status)||')',
              'website_order_restock',new.id,now()
            );
          end if;
        end if;
      end if;
    end if;
  end loop;
  return new;
end;
$function$;
