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
    'v_effective_price := case when v_variant.id is not null then coalesce(v_variant.price,0) else coalesce(v_product.price,0) end;',
    'v_effective_price := case when v_variant.id is not null then case when coalesce(v_variant.price,0)>0 then v_variant.price else coalesce(v_product.price,0) end else coalesce(v_product.price,0) end;'
  );

  v_sql := replace(
    v_sql,
    'if coalesce(v_variant.stock_quantity,0) < coalesce(v_agg_qty,0) then',
    'if coalesce(v_variant.stock_quantity,0) > 0 and coalesce(v_variant.stock_quantity,0) < coalesce(v_agg_qty,0) then'
  );

  EXECUTE v_sql;
END $$;
