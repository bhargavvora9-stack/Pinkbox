update public.website_orders
set tracking_token=replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','')
where tracking_token is null or length(tracking_token)<>64;
