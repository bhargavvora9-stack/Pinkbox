REVOKE SELECT ON TABLE public.website_orders FROM authenticated;

GRANT SELECT (
  id,
  company_id,
  order_number,
  customer_id,
  customer_name,
  customer_phone,
  customer_email,
  shipping_address,
  billing_address,
  subtotal,
  discount_amount,
  shipping_amount,
  tax_amount,
  total_amount,
  payment_method,
  payment_status,
  order_status,
  notes,
  created_at,
  updated_at,
  coupon_code
) ON TABLE public.website_orders TO authenticated;
