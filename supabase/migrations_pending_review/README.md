# Pending migration review

These SQL files existed in `supabase/migrations/` but do not have matching version/name records in the live PinkBox `supabase_migrations.schema_migrations` history.

They are preserved verbatim here, outside the active Supabase migration directory, so the Supabase CLI will not automatically apply them as part of a migration push.

Do not move these files back into `supabase/migrations/` or execute them until each one has been reviewed against:
- the current live database schema and function definitions;
- the 90 canonical applied migrations in `supabase/migrations/`;
- application code and required rollout order.

Some files define older versions of privileged functions, triggers, checkout logic, or staff-role permissions. Applying them after later security hardening could replace current definitions with older behaviour.

This folder is an archive for review, not an executable migration directory.
