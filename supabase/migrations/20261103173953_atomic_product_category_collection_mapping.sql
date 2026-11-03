create or replace function public.replace_website_product_links(
  p_company_id uuid,
  p_product_id uuid,
  p_relation text,
  p_related_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_expected integer;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = p_company_id
      and coalesce(p.active, true) = true
      and p.role in ('admin', 'super_admin')
  ) then
    raise exception 'Access denied.' using errcode = '42501';
  end if;

  if p_product_id is null then
    raise exception 'Product is required.';
  end if;

  if not exists (
    select 1 from public.website_products p
    where p.id = p_product_id and p.company_id = p_company_id
  ) then
    raise exception 'Product not found.' using errcode = 'P0002';
  end if;

  if p_relation is null or p_relation not in ('categories', 'collections') then
    raise exception 'Unsupported product relation.';
  end if;

  if coalesce(cardinality(p_related_ids), 0) <> (
    select count(distinct x) from unnest(coalesce(p_related_ids, array[]::uuid[])) as x
  ) then
    raise exception 'Duplicate relation ids are not allowed.';
  end if;

  v_expected := coalesce(cardinality(p_related_ids), 0);

  if p_relation = 'categories' then
    select count(*) into v_count
    from public.website_categories c
    where c.company_id = p_company_id
      and c.id = any(coalesce(p_related_ids, array[]::uuid[]));
    if v_count <> v_expected then
      raise exception 'One or more categories were not found for this company.';
    end if;

    delete from public.website_product_categories
    where company_id = p_company_id and product_id = p_product_id;

    insert into public.website_product_categories(company_id, product_id, category_id)
    select p_company_id, p_product_id, x
    from unnest(coalesce(p_related_ids, array[]::uuid[])) as x;
  else
    select count(*) into v_count
    from public.website_collections c
    where c.company_id = p_company_id
      and c.id = any(coalesce(p_related_ids, array[]::uuid[]));
    if v_count <> v_expected then
      raise exception 'One or more collections were not found for this company.';
    end if;

    delete from public.website_product_collections
    where company_id = p_company_id and product_id = p_product_id;

    insert into public.website_product_collections(company_id, product_id, collection_id)
    select p_company_id, p_product_id, x
    from unnest(coalesce(p_related_ids, array[]::uuid[])) as x;
  end if;

  return v_expected;
end;
$$;

revoke all on function public.replace_website_product_links(uuid, uuid, text, uuid[]) from public, anon;
grant execute on function public.replace_website_product_links(uuid, uuid, text, uuid[]) to authenticated;
