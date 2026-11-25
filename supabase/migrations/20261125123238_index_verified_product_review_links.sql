CREATE INDEX IF NOT EXISTS website_product_reviews_auth_user_idx
  ON public.website_product_reviews (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS website_product_reviews_verified_order_idx
  ON public.website_product_reviews (verified_order_id)
  WHERE verified_order_id IS NOT NULL;
