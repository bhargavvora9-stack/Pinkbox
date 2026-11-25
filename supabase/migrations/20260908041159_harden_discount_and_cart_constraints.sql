DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='website_discounts_percentage_check') THEN
    ALTER TABLE public.website_discounts ADD CONSTRAINT website_discounts_percentage_check CHECK (discount_type <> 'percentage' OR value <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='website_discounts_minimum_order_check') THEN
    ALTER TABLE public.website_discounts ADD CONSTRAINT website_discounts_minimum_order_check CHECK (coalesce(minimum_order_amount,0) >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='website_discounts_maximum_discount_check') THEN
    ALTER TABLE public.website_discounts ADD CONSTRAINT website_discounts_maximum_discount_check CHECK (maximum_discount_amount IS NULL OR maximum_discount_amount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='website_discounts_usage_limit_check') THEN
    ALTER TABLE public.website_discounts ADD CONSTRAINT website_discounts_usage_limit_check CHECK (usage_limit IS NULL OR usage_limit >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='website_discounts_usage_count_check') THEN
    ALTER TABLE public.website_discounts ADD CONSTRAINT website_discounts_usage_count_check CHECK (coalesce(usage_count,0) >= 0 AND (usage_limit IS NULL OR coalesce(usage_count,0) <= usage_limit));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='website_abandoned_carts_company_session_key') THEN
    ALTER TABLE public.website_abandoned_carts ADD CONSTRAINT website_abandoned_carts_company_session_key UNIQUE (company_id,session_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_website_orders_company_created ON public.website_orders(company_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_website_order_items_company_order ON public.website_order_items(company_id,order_id);
CREATE INDEX IF NOT EXISTS idx_website_products_company_active ON public.website_products(company_id,is_active);
CREATE INDEX IF NOT EXISTS idx_website_discounts_company_active_code ON public.website_discounts(company_id,is_active,code);
CREATE INDEX IF NOT EXISTS idx_website_abandoned_carts_company_status ON public.website_abandoned_carts(company_id,status,recovered);
