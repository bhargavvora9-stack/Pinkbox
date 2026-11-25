-- Restore website inventory exactly once when an order becomes cancelled/returned/refunded.
-- The database trigger keeps Admin/API status changes consistent.

create or replace function public.restore_website_order_stock_on_terminal_status() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_item record;
  v_before numeric;
  v_after numeric;
  v_restored boolean;
begin
  if tg_op <> 'UPDATE' then return new; end if;
  if lower(coalesce(new.order_status,'')) not in ('cancelled','returned','refunded') then return new; end if;
  if lower(coalesce(old.order_status,'')) in ('cancelled','returned','refunded') then return new; end if;

  for v_item in
    select oi.product_id, oi.quantity
    from public.website_order_items oi
    where oi.company_id = new.company_id and oi.order_id = new.id and oi.product_id is not null
  loop
    select exists(
      select 1 from public.website_inventory_transactions it
      where it.company_id = new.company_id
        and it.product_id = v_item.product_id
        and it.reference_type = 'website_order_restock'
        and it.reference_id = new.id
    ) into v_restored;

    if not v_restored then
      select stock_quantity into v_before
      from public.website_products
      where company_id = new.company_id and id = v_item.product_id
      for update;

      if found then
        v_after := coalesce(v_before,0) + coalesce(v_item.quantity,0);
        update public.website_products
          set stock_quantity = v_after, updated_at = now()
          where company_id = new.company_id and id = v_item.product_id;

        insert into public.website_inventory_transactions(
          company_id, product_id, change_quantity, quantity_before, quantity_after,
          reason, reference_type, reference_id, created_at
        ) values (
          new.company_id, v_item.product_id, coalesce(v_item.quantity,0), v_before, v_after,
          'Restored for website order ' || new.order_number || ' (' || lower(new.order_status) || ')',
          'website_order_restock', new.id, now()
        );
      end if;
    end if;
  end loop;
  return new;
end;
$function$;

drop trigger if exists trg_restore_website_order_stock on public.website_orders;
create trigger trg_restore_website_order_stock
after update of order_status on public.website_orders
for each row execute function public.restore_website_order_stock_on_terminal_status();

revoke all on function public.restore_website_order_stock_on_terminal_status() from public, anon, authenticated;
