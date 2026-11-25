ALTER TABLE public.website_product_reviews
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_order_id uuid REFERENCES public.website_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_verified_purchase boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS website_product_reviews_one_per_customer_product_idx
  ON public.website_product_reviews (company_id, product_id, auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS website_orders_verified_review_lookup_idx
  ON public.website_orders (company_id, lower(customer_email), created_at DESC)
  WHERE order_status = 'delivered';

CREATE INDEX IF NOT EXISTS website_order_items_verified_review_lookup_idx
  ON public.website_order_items (company_id, product_id, order_id);
