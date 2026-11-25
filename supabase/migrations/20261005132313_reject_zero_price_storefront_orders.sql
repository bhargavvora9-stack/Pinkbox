DO $$
DECLARE
  v_sql text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO v_sql
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'place_website_order'
  ORDER BY p.oid DESC
  LIMIT 1;

  v_sql := replace(
    v_sql,
    '  if not found then raise exception ''Product not found or inactive.''; end if;',
    '  if not found then raise exception ''Product not found or inactive.''; end if;
  if coalesce(v_product.price,0)<=0 then raise exception ''Product price is not configured yet.''; end if;'
  );

  EXECUTE v_sql;
END $$;
