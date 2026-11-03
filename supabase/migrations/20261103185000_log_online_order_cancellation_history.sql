CREATE OR REPLACE FUNCTION public.cancel_website_online_order(p_order_id uuid, p_reason text DEFAULT 'Online payment failed or cancelled'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_order public.website_orders%rowtype;
begin
 select * into v_order from public.website_orders where id=p_order_id for update;
 if not found then raise exception 'Order not found.'; end if;
 if v_order.payment_method<>'ONLINE' then raise exception 'This order does not use online payment.'; end if;
 if v_order.payment_status='paid' then
   return jsonb_build_object('ok',true,'already_paid',true,'order_id',v_order.id);
 end if;
 if lower(coalesce(v_order.order_status,'')) in ('cancelled','returned') then
   return jsonb_build_object('ok',true,'already_cancelled',true,'order_id',v_order.id);
 end if;
 if lower(coalesce(v_order.order_status,''))<>'pending' then raise exception 'This online order is no longer pending payment.'; end if;

 update public.website_orders
 set payment_status=case when payment_status='pending' then 'failed' else payment_status end,
     order_status='cancelled',
     notes=case when nullif(trim(coalesce(p_reason,'')),'') is null then notes
                when nullif(trim(coalesce(notes,'')),'') is null then trim(p_reason)
                else notes||E'\n'||trim(p_reason) end,
     updated_at=now()
 where id=v_order.id;

 insert into public.website_order_status_history(company_id,order_id,status,note,created_at)
 values(v_order.company_id,v_order.id,'cancelled',nullif(trim(coalesce(p_reason,'')),''),now());

 return jsonb_build_object('ok',true,'cancelled',true,'order_id',v_order.id);
end;
$function$

