create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only create a profile when the signup explicitly supplies a company_id.
  -- Website Admin bootstrap creates its profile after password authentication,
  -- so a normal Supabase Auth user can be created without company metadata.
  if nullif(new.raw_user_meta_data->>'company_id', '') is not null then
    insert into public.profiles (id, company_id, display_name, role)
    values (
      new.id,
      (new.raw_user_meta_data->>'company_id')::uuid,
      coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), new.email),
      coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'staff')
    );
  end if;
  return new;
end;
$$;
