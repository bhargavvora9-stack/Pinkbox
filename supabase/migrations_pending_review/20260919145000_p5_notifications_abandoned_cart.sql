-- P5 notification setup and safe abandoned-cart reminders.

alter table public.website_abandoned_carts
  add column if not exists last_reminder_at timestamptz;

create index if not exists idx_website_abandoned_carts_reminder
  on public.website_abandoned_carts(company_id, status, recovered, last_activity_at, last_reminder_at);

insert into public.website_notification_settings(
  company_id, order_confirmation, shipping_updates, abandoned_cart_reminder, settings, updated_at
)
values(
  'd3286f1f-b2d1-4c09-8ee5-fe6c60134b3e', true, true, true, '{}'::jsonb, now()
)
on conflict (company_id) do nothing;

do $$
begin
  if not exists (
    select 1 from public.website_automations
    where company_id='d3286f1f-b2d1-4c09-8ee5-fe6c60134b3e'
      and name='Order Confirmation Email'
      and trigger_type='order_created'
      and action_type='create_notification'
  ) then
    insert into public.website_automations(company_id,name,trigger_type,action_type,config,is_active)
    values(
      'd3286f1f-b2d1-4c09-8ee5-fe6c60134b3e',
      'Order Confirmation Email',
      'order_created',
      'create_notification',
      jsonb_build_object(
        'channel','email',
        'subject','Your PinkBox order {{order_number}} has been received',
        'message','Hi {{customer_name}}, your PinkBox order {{order_number}} has been received. We will keep you updated as it moves through processing.'
      ),
      true
    );
  end if;

  if not exists (
    select 1 from public.website_automations
    where company_id='d3286f1f-b2d1-4c09-8ee5-fe6c60134b3e'
      and name='Shipping Update Email'
      and trigger_type='order_shipped'
      and action_type='create_notification'
  ) then
    insert into public.website_automations(company_id,name,trigger_type,action_type,config,is_active)
    values(
      'd3286f1f-b2d1-4c09-8ee5-fe6c60134b3e',
      'Shipping Update Email',
      'order_shipped',
      'create_notification',
      jsonb_build_object(
        'channel','email',
        'subject','Your PinkBox order {{order_number}} is {{order_status}}',
        'message','Hi {{customer_name}}, your PinkBox order {{order_number}} is now {{order_status}}. Track it here: {{tracking_url}}'
      ),
      true
    );
  end if;

  if not exists (
    select 1 from public.website_automations
    where company_id='d3286f1f-b2d1-4c09-8ee5-fe6c60134b3e'
      and name='Delivery Update Email'
      and trigger_type='order_delivered'
      and action_type='create_notification'
  ) then
    insert into public.website_automations(company_id,name,trigger_type,action_type,config,is_active)
    values(
      'd3286f1f-b2d1-4c09-8ee5-fe6c60134b3e',
      'Delivery Update Email',
      'order_delivered',
      'create_notification',
      jsonb_build_object(
        'channel','email',
        'subject','Your PinkBox order {{order_number}} has been delivered',
        'message','Hi {{customer_name}}, your PinkBox order {{order_number}} has been delivered. Thank you for shopping with PinkBox.'
      ),
      true
    );
  end if;

  if not exists (
    select 1 from public.website_automations
    where company_id='d3286f1f-b2d1-4c09-8ee5-fe6c60134b3e'
      and name='Abandoned Cart Reminder Email'
      and trigger_type='abandoned_cart'
      and action_type='create_notification'
  ) then
    insert into public.website_automations(company_id,name,trigger_type,action_type,config,is_active)
    values(
      'd3286f1f-b2d1-4c09-8ee5-fe6c60134b3e',
      'Abandoned Cart Reminder Email',
      'abandoned_cart',
      'create_notification',
      jsonb_build_object(
        'channel','email',
        'subject','You left items in your PinkBox cart',
        'message','Hi {{customer_name}}, you still have items in your PinkBox cart. You can return to PinkBox and complete your purchase when ready.'
      ),
      true
    );
  end if;
end $$;
