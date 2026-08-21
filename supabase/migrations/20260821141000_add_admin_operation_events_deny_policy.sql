-- Make the private audit boundary explicit to both Postgres and automated
-- security advisors. The service role bypasses RLS and retains its narrow ACL;
-- browser roles remain denied even if table privileges are granted by mistake.

create policy "Browser roles cannot access admin operation events"
on private.admin_operation_events
for all
to anon, authenticated
using (false)
with check (false);

comment on policy "Browser roles cannot access admin operation events"
on private.admin_operation_events is
  'Defence-in-depth deny policy for private append-only admin evidence.';
