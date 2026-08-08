begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(54);

-- Reference catalogue and privacy boundaries.
select has_table('public', 'geo_countries', 'country catalogue exists');
select is(
  (select count(*) from public.geo_countries),
  249::bigint,
  'country catalogue contains all ISO alpha-2 assignments'
);
select is(
  (select display_name from public.geo_countries where country_code = 'IN'),
  'India',
  'India uses the canonical alpha-2 code'
);
select has_table('public', 'geo_regions', 'normalized region foundation exists');
select has_table('public', 'geo_places', 'normalized place foundation exists');
select has_table('private', 'member_location_preferences', 'preferences stay private');
select has_table('public', 'member_location_shares', 'deliberate shares have a public-schema projection');
select has_table('private', 'member_location_consent_events', 'consent events stay private');
select hasnt_column('private', 'member_location_consent_events', 'country_code', 'events exclude country');
select hasnt_column('private', 'member_location_consent_events', 'region_label', 'events exclude region');
select hasnt_column('private', 'member_location_consent_events', 'city_label', 'events exclude city');
select hasnt_column('private', 'member_location_consent_events', 'timezone_name', 'events exclude timezone');
select is(
  (
    select count(*)
    from information_schema.columns
    where table_schema in ('public', 'private')
      and table_name in (
        'member_location_preferences',
        'member_location_shares',
        'member_location_consent_events'
      )
      and column_name in ('lat', 'lng', 'latitude', 'longitude', 'coordinates')
  ),
  0::bigint,
  'member location storage contains no coordinates'
);
select ok(
  has_table_privilege('anon', 'public.geo_countries', 'SELECT'),
  'anonymous users can read active geography references'
);
select ok(
  has_table_privilege('authenticated', 'public.geo_countries', 'SELECT')
    and not has_table_privilege('authenticated', 'public.geo_countries', 'INSERT'),
  'members can read but not mutate geography references'
);
select ok(
  not has_table_privilege('authenticated', 'private.member_location_preferences', 'SELECT'),
  'browser roles cannot read private preferences directly'
);
select ok(
  not has_table_privilege('authenticated', 'private.member_location_consent_events', 'SELECT'),
  'browser roles cannot read private consent history directly'
);
select ok(
  has_table_privilege('authenticated', 'public.member_location_shares', 'SELECT')
    and not has_table_privilege('authenticated', 'public.member_location_shares', 'INSERT')
    and not has_table_privilege('authenticated', 'public.member_location_shares', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.member_location_shares', 'DELETE'),
  'share rows are RPC-managed and read-only to browsers'
);
select ok(
  not has_function_privilege('anon', 'public.get_my_location_preferences()', 'EXECUTE'),
  'anonymous callers cannot read private preferences through the RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.get_my_location_preferences()', 'EXECUTE')
    and has_function_privilege(
      'authenticated',
      'public.set_my_community_location(text,text,text,text,boolean,boolean,text,text,text,uuid)',
      'EXECUTE'
    )
    and has_function_privilege(
      'authenticated',
      'public.withdraw_my_location_consent(text,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'public.set_my_community_location(text,text,text,text,boolean,boolean,text,text,text,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'public.withdraw_my_location_consent(text,uuid)',
      'EXECUTE'
    ),
  'caller-bound location RPC grants exclude anonymous users'
);
select ok(
  (
    select relation.relrowsecurity
    from pg_catalog.pg_class as relation
    where relation.oid = 'public.member_location_shares'::regclass
  ),
  'location shares retain row-level security'
);

-- Fixed users make caller isolation and operation replay behavior readable.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '81000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'location-owner@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Location owner"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '81000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'location-nonmember@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Location nonmember"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '81000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'location-reader@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Location reader"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '81000000-0000-4000-8000-000000000004',
    'authenticated',
    'authenticated',
    'location-optional@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Location optional"}'::jsonb,
    now(),
    now()
  );

update public.profiles
set orbit_segment = 'youth', is_public = true
where user_id = '81000000-0000-4000-8000-000000000001';

update public.profiles
set orbit_segment = 'founder'
where user_id = '81000000-0000-4000-8000-000000000003';

insert into private.community_onboarding_state (
  user_id, status, current_step, version, started_at, completed_at
) values
  (
    '81000000-0000-4000-8000-000000000001',
    'completed', 'completed', 1, now(), now()
  ),
  (
    '81000000-0000-4000-8000-000000000003',
    'completed', 'completed', 1, now(), now()
  ),
  (
    '81000000-0000-4000-8000-000000000004',
    'in_progress', 'profile', 1, now(), null
  );

insert into public.geo_regions (
  id, country_code, region_code, display_name, source_key, source_version
) values (
  '83000000-0000-4000-8000-000000000001',
  'IN', 'IN-MH', 'Maharashtra', 'iso-3166-2:IN-MH', 'test-v1'
);

insert into public.geo_places (
  id, country_code, region_id, normalized_name, display_name, source_key, source_version,
  timezone_name
) values (
  '83000000-0000-4000-8000-000000000002',
  'IN', '83000000-0000-4000-8000-000000000001', 'pune', 'Pune',
  'test:Pune', 'test-v1', 'Asia/Kolkata'
);

insert into private.member_location_preferences (
  user_id,
  country_code,
  legacy_country_label,
  region_label,
  city_label,
  legacy_timezone_label,
  source
) values (
  '81000000-0000-4000-8000-000000000002',
  null,
  'Unmatched legacy country',
  'Legacy region',
  'Legacy city',
  'Not/A_Timezone',
  'legacy_unconfirmed'
);

select is(
  (
    select source
    from private.member_location_preferences
    where user_id = '81000000-0000-4000-8000-000000000002'
  ),
  'legacy_unconfirmed',
  'unmatched legacy location remains explicitly unconfirmed'
);
select ok(
  (
    select not use_for_scheduling
      and not use_for_recommendations
      and consent_version is null
      and consented_at is null
    from private.member_location_preferences
    where user_id = '81000000-0000-4000-8000-000000000002'
  ),
  'legacy values never infer consent or allowed uses'
);
select ok(
  not exists (
    select 1 from public.member_location_shares
    where user_id = '81000000-0000-4000-8000-000000000002'
  )
  and not exists (
    select 1 from private.member_location_consent_events
    where user_id = '81000000-0000-4000-8000-000000000002'
  ),
  'legacy import creates neither a share nor a consent event'
);
select ok(
  not exists (
    select 1 from private.member_location_preferences
    where user_id = '81000000-0000-4000-8000-000000000004'
  ),
  'location remains optional for a valid account'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '81000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select is(
  (public.set_my_community_location(
    'in', '  Maharashtra  ', '  Pune  ', 'Asia/Kolkata',
    true, true, null, null, 'location-v1',
    '82000000-0000-4000-8000-000000000001'
  ) ->> 'changed')::boolean,
  true,
  'owner can grant private scheduling and recommendation use'
);

reset role;

select ok(
  (
    select country_code = 'IN'
      and region_label = 'Maharashtra'
      and city_label = 'Pune'
      and timezone_name = 'Asia/Kolkata'
      and use_for_scheduling
      and use_for_recommendations
      and source = 'member'
    from private.member_location_preferences
    where user_id = '81000000-0000-4000-8000-000000000001'
  ),
  'confirmed preferences are normalized and purpose-bound'
);
select ok(
  not exists (
    select 1 from public.member_location_shares
    where user_id = '81000000-0000-4000-8000-000000000001'
  ),
  'private use does not imply community sharing'
);

set local role authenticated;
select is(
  public.get_my_location_preferences() ->> 'countryCode',
  'IN',
  'caller can read only their private preference projection'
);
select is(
  (public.set_my_community_location(
    'IN', 'Maharashtra', 'Pune', 'Asia/Kolkata',
    true, true, null, null, 'location-v1',
    '82000000-0000-4000-8000-000000000001'
  ) ->> 'changed')::boolean,
  false,
  'an identical client operation is idempotent'
);
reset role;

select ok(
  (
    select count(*) = 1
    from private.member_location_operations
    where user_id = '81000000-0000-4000-8000-000000000001'
      and client_operation_id = '82000000-0000-4000-8000-000000000001'
  )
  and (
    select count(*) = 1
    from private.member_location_consent_events
    where user_id = '81000000-0000-4000-8000-000000000001'
      and client_operation_id = '82000000-0000-4000-8000-000000000001'
  ),
  'operation replay writes one ledger row and one consent event'
);

set local role authenticated;
select throws_ok(
  $$select public.set_my_community_location(
    'IN', 'Maharashtra', 'Mumbai', 'Asia/Kolkata',
    true, true, null, null, 'location-v1',
    '82000000-0000-4000-8000-000000000001'
  )$$,
  '22023',
  'Client operation ID was already used for a different request',
  'a client operation ID cannot be reused with different inputs'
);
select throws_ok(
  $$select public.set_my_community_location(
    'ZZ', null, null, null, false, false, null, null, 'location-v1',
    '82000000-0000-4000-8000-000000000002'
  )$$,
  '22023', 'Unknown country code', 'unknown country codes are rejected'
);
select throws_ok(
  $$select public.set_my_community_location(
    'IN', null, null, 'Asia/Invalid', true, false, null, null, 'location-v1',
    '82000000-0000-4000-8000-000000000003'
  )$$,
  '22023',
  'A valid IANA timezone is required for scheduling',
  'scheduling requires a valid IANA timezone'
);
select throws_ok(
  $$select public.set_my_community_location(
    'IN', null, null, 'Asia/Kolkata', false, false, null, null, 'location-v1',
    '82000000-0000-4000-8000-000000000004'
  )$$,
  '22023',
  'Timezone storage requires scheduling consent',
  'timezone is not retained without scheduling consent'
);
select throws_ok(
  $$select public.set_my_community_location(
    'IN', null, null, null, false, false, 'members', null, 'location-v1',
    '82000000-0000-4000-8000-000000000005'
  )$$,
  '22023',
  'Share audience and precision must be provided together',
  'sharing audience and precision are atomic'
);
select throws_ok(
  $$select public.set_my_community_location(
    'IN', null, null, null, false, false, 'members', 'region', 'location-v1',
    '82000000-0000-4000-8000-000000000006'
  )$$,
  '22023',
  'Region precision requires a region label',
  'region precision requires a region value'
);
select is(
  (public.set_my_community_location(
    'IN', 'Maharashtra', 'Pune', 'Asia/Kolkata',
    true, true, 'members', 'city', 'location-v1',
    '82000000-0000-4000-8000-000000000007'
  ) ->> 'changed')::boolean,
  true,
  'a community-complete owner can share an explicit precision'
);
reset role;

select ok(
  (
    select country_code = 'IN'
      and region_label = 'Maharashtra'
      and city_label = 'Pune'
    from public.member_location_shares
    where user_id = '81000000-0000-4000-8000-000000000001'
  ),
  'city sharing retains only the fields required for that precision'
);

set local "request.jwt.claim.sub" = '81000000-0000-4000-8000-000000000003';
set local role authenticated;
select is(
  (
    select count(*) from public.member_location_shares
    where user_id = '81000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'another completed community member can read a members share'
);
reset role;

set local "request.jwt.claim.sub" = '81000000-0000-4000-8000-000000000002';
set local role authenticated;
select is(
  (
    select count(*) from public.member_location_shares
    where user_id = '81000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'an authenticated nonmember cannot read a members share'
);
select throws_ok(
  $$select public.set_my_community_location(
    'IN', null, null, null, false, false, 'members', 'country', 'location-v1',
    '82000000-0000-4000-8000-000000000008'
  )$$,
  '22023',
  'Community onboarding is required for member sharing',
  'an authenticated nonmember cannot create a members share'
);
reset role;

set local "request.jwt.claim.sub" = '81000000-0000-4000-8000-000000000004';
set local role authenticated;
select is(
  (public.set_my_community_location(
    'IN', null, null, null, false, false, 'members', 'country', 'location-v1',
    '82000000-0000-4000-8000-000000000012'
  ) ->> 'changed')::boolean,
  true,
  'an in-progress onboarding can stage a country share before atomic completion'
);
reset role;

set local "request.jwt.claim.sub" = '81000000-0000-4000-8000-000000000002';
set local role authenticated;
select throws_ok(
  $$select public.set_my_community_location(
    'IN', null, null, null, false, false, 'public', 'country', 'location-v1',
    '82000000-0000-4000-8000-000000000009'
  )$$,
  '22023',
  'A public profile is required for public location sharing',
  'a nonpublic profile cannot create a public share'
);
reset role;

set local role anon;
select is(
  (select count(*) from public.member_location_shares),
  0::bigint,
  'anonymous users cannot read members-only shares'
);
reset role;

set local "request.jwt.claim.sub" = '81000000-0000-4000-8000-000000000001';
set local role authenticated;
select is(
  (public.set_my_community_location(
    'IN', 'Maharashtra', 'Pune', 'Asia/Kolkata',
    true, true, 'public', 'country', 'location-v1',
    '82000000-0000-4000-8000-000000000010'
  ) ->> 'changed')::boolean,
  true,
  'a public profile can deliberately publish country precision'
);
reset role;

select ok(
  (
    select precision = 'country'
      and region_label is null
      and city_label is null
    from public.member_location_shares
    where user_id = '81000000-0000-4000-8000-000000000001'
  ),
  'country precision removes region and city from the share row'
);

set local role anon;
select is(
  (
    select count(*) from public.member_location_shares
    where user_id = '81000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'anonymous users can read a deliberate public-profile share'
);
reset role;

set local "request.jwt.claim.sub" = '81000000-0000-4000-8000-000000000001';
set local role authenticated;
select is(
  (public.withdraw_my_location_consent(
    'location-v1', '82000000-0000-4000-8000-000000000011'
  ) ->> 'changed')::boolean,
  true,
  'withdrawal immediately removes active location state'
);
reset role;

select ok(
  not exists (
    select 1 from private.member_location_preferences
    where user_id = '81000000-0000-4000-8000-000000000001'
  )
  and not exists (
    select 1 from public.member_location_shares
    where user_id = '81000000-0000-4000-8000-000000000001'
  ),
  'withdrawal deletes both private preferences and sharing projection'
);
select is(
  (
    select action
    from private.member_location_consent_events
    where user_id = '81000000-0000-4000-8000-000000000001'
      and client_operation_id = '82000000-0000-4000-8000-000000000011'
  ),
  'withdrawn',
  'withdrawal keeps only an append-only metadata event'
);

set local role authenticated;
select is(
  (public.withdraw_my_location_consent(
    'location-v1', '82000000-0000-4000-8000-000000000011'
  ) ->> 'changed')::boolean,
  false,
  'withdrawal replay is idempotent'
);
select is(
  public.get_my_location_preferences() ->> 'countryCode',
  null,
  'withdrawn location is absent from the caller projection'
);
reset role;

select is(
  (
    select count(*) from private.member_location_consent_events
    where user_id = '81000000-0000-4000-8000-000000000001'
      and client_operation_id = '82000000-0000-4000-8000-000000000011'
  ),
  1::bigint,
  'withdrawal replay does not duplicate its consent event'
);

select * from finish();

rollback;
