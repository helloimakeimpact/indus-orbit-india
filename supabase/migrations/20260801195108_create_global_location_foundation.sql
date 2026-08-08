-- Consent-aware global location foundation.
--
-- Community location is optional and is not an authentication, onboarding,
-- I/O Port, or workspace entitlement requirement. Existing profile location
-- values are copied only into a private, unconfirmed record. This migration
-- deliberately leaves the legacy profile columns untouched so application
-- migration and member confirmation can happen separately.

create schema if not exists private;

create table public.geo_countries (
  country_code text primary key,
  display_name text not null,
  source_version text not null default 'ISO-3166-1-alpha-2:2026-08',
  active boolean not null default true,
  constraint geo_countries_code_check check (country_code ~ '^[A-Z]{2}$'),
  constraint geo_countries_name_check check (
    char_length(btrim(display_name)) between 2 and 120
  ),
  constraint geo_countries_source_check check (
    char_length(btrim(source_version)) between 3 and 120
  )
);

comment on table public.geo_countries is
  'Read-only ISO 3166-1 alpha-2 reference catalogue. It is geography metadata, not member location or proof of residency.';

insert into public.geo_countries (country_code, display_name)
values
  ('AD', 'Andorra'),
  ('AE', 'United Arab Emirates'),
  ('AF', 'Afghanistan'),
  ('AG', 'Antigua and Barbuda'),
  ('AI', 'Anguilla'),
  ('AL', 'Albania'),
  ('AM', 'Armenia'),
  ('AO', 'Angola'),
  ('AQ', 'Antarctica'),
  ('AR', 'Argentina'),
  ('AS', 'American Samoa'),
  ('AT', 'Austria'),
  ('AU', 'Australia'),
  ('AW', 'Aruba'),
  ('AX', 'Aland Islands'),
  ('AZ', 'Azerbaijan'),
  ('BA', 'Bosnia and Herzegovina'),
  ('BB', 'Barbados'),
  ('BD', 'Bangladesh'),
  ('BE', 'Belgium'),
  ('BF', 'Burkina Faso'),
  ('BG', 'Bulgaria'),
  ('BH', 'Bahrain'),
  ('BI', 'Burundi'),
  ('BJ', 'Benin'),
  ('BL', 'Saint Barthelemy'),
  ('BM', 'Bermuda'),
  ('BN', 'Brunei Darussalam'),
  ('BO', 'Bolivia'),
  ('BQ', 'Bonaire, Sint Eustatius and Saba'),
  ('BR', 'Brazil'),
  ('BS', 'Bahamas'),
  ('BT', 'Bhutan'),
  ('BV', 'Bouvet Island'),
  ('BW', 'Botswana'),
  ('BY', 'Belarus'),
  ('BZ', 'Belize'),
  ('CA', 'Canada'),
  ('CC', 'Cocos (Keeling) Islands'),
  ('CD', 'Congo, Democratic Republic of the'),
  ('CF', 'Central African Republic'),
  ('CG', 'Congo'),
  ('CH', 'Switzerland'),
  ('CI', 'Cote d''Ivoire'),
  ('CK', 'Cook Islands'),
  ('CL', 'Chile'),
  ('CM', 'Cameroon'),
  ('CN', 'China'),
  ('CO', 'Colombia'),
  ('CR', 'Costa Rica'),
  ('CU', 'Cuba'),
  ('CV', 'Cabo Verde'),
  ('CW', 'Curacao'),
  ('CX', 'Christmas Island'),
  ('CY', 'Cyprus'),
  ('CZ', 'Czechia'),
  ('DE', 'Germany'),
  ('DJ', 'Djibouti'),
  ('DK', 'Denmark'),
  ('DM', 'Dominica'),
  ('DO', 'Dominican Republic'),
  ('DZ', 'Algeria'),
  ('EC', 'Ecuador'),
  ('EE', 'Estonia'),
  ('EG', 'Egypt'),
  ('EH', 'Western Sahara'),
  ('ER', 'Eritrea'),
  ('ES', 'Spain'),
  ('ET', 'Ethiopia'),
  ('FI', 'Finland'),
  ('FJ', 'Fiji'),
  ('FK', 'Falkland Islands'),
  ('FM', 'Micronesia'),
  ('FO', 'Faroe Islands'),
  ('FR', 'France'),
  ('GA', 'Gabon'),
  ('GB', 'United Kingdom'),
  ('GD', 'Grenada'),
  ('GE', 'Georgia'),
  ('GF', 'French Guiana'),
  ('GG', 'Guernsey'),
  ('GH', 'Ghana'),
  ('GI', 'Gibraltar'),
  ('GL', 'Greenland'),
  ('GM', 'Gambia'),
  ('GN', 'Guinea'),
  ('GP', 'Guadeloupe'),
  ('GQ', 'Equatorial Guinea'),
  ('GR', 'Greece'),
  ('GS', 'South Georgia and the South Sandwich Islands'),
  ('GT', 'Guatemala'),
  ('GU', 'Guam'),
  ('GW', 'Guinea-Bissau'),
  ('GY', 'Guyana'),
  ('HK', 'Hong Kong'),
  ('HM', 'Heard Island and McDonald Islands'),
  ('HN', 'Honduras'),
  ('HR', 'Croatia'),
  ('HT', 'Haiti'),
  ('HU', 'Hungary'),
  ('ID', 'Indonesia'),
  ('IE', 'Ireland'),
  ('IL', 'Israel'),
  ('IM', 'Isle of Man'),
  ('IN', 'India'),
  ('IO', 'British Indian Ocean Territory'),
  ('IQ', 'Iraq'),
  ('IR', 'Iran'),
  ('IS', 'Iceland'),
  ('IT', 'Italy'),
  ('JE', 'Jersey'),
  ('JM', 'Jamaica'),
  ('JO', 'Jordan'),
  ('JP', 'Japan'),
  ('KE', 'Kenya'),
  ('KG', 'Kyrgyzstan'),
  ('KH', 'Cambodia'),
  ('KI', 'Kiribati'),
  ('KM', 'Comoros'),
  ('KN', 'Saint Kitts and Nevis'),
  ('KP', 'Korea, Democratic People''s Republic of'),
  ('KR', 'Korea, Republic of'),
  ('KW', 'Kuwait'),
  ('KY', 'Cayman Islands'),
  ('KZ', 'Kazakhstan'),
  ('LA', 'Lao People''s Democratic Republic'),
  ('LB', 'Lebanon'),
  ('LC', 'Saint Lucia'),
  ('LI', 'Liechtenstein'),
  ('LK', 'Sri Lanka'),
  ('LR', 'Liberia'),
  ('LS', 'Lesotho'),
  ('LT', 'Lithuania'),
  ('LU', 'Luxembourg'),
  ('LV', 'Latvia'),
  ('LY', 'Libya'),
  ('MA', 'Morocco'),
  ('MC', 'Monaco'),
  ('MD', 'Moldova'),
  ('ME', 'Montenegro'),
  ('MF', 'Saint Martin (French part)'),
  ('MG', 'Madagascar'),
  ('MH', 'Marshall Islands'),
  ('MK', 'North Macedonia'),
  ('ML', 'Mali'),
  ('MM', 'Myanmar'),
  ('MN', 'Mongolia'),
  ('MO', 'Macao'),
  ('MP', 'Northern Mariana Islands'),
  ('MQ', 'Martinique'),
  ('MR', 'Mauritania'),
  ('MS', 'Montserrat'),
  ('MT', 'Malta'),
  ('MU', 'Mauritius'),
  ('MV', 'Maldives'),
  ('MW', 'Malawi'),
  ('MX', 'Mexico'),
  ('MY', 'Malaysia'),
  ('MZ', 'Mozambique'),
  ('NA', 'Namibia'),
  ('NC', 'New Caledonia'),
  ('NE', 'Niger'),
  ('NF', 'Norfolk Island'),
  ('NG', 'Nigeria'),
  ('NI', 'Nicaragua'),
  ('NL', 'Netherlands'),
  ('NO', 'Norway'),
  ('NP', 'Nepal'),
  ('NR', 'Nauru'),
  ('NU', 'Niue'),
  ('NZ', 'New Zealand'),
  ('OM', 'Oman'),
  ('PA', 'Panama'),
  ('PE', 'Peru'),
  ('PF', 'French Polynesia'),
  ('PG', 'Papua New Guinea'),
  ('PH', 'Philippines'),
  ('PK', 'Pakistan'),
  ('PL', 'Poland'),
  ('PM', 'Saint Pierre and Miquelon'),
  ('PN', 'Pitcairn'),
  ('PR', 'Puerto Rico'),
  ('PS', 'Palestine, State of'),
  ('PT', 'Portugal'),
  ('PW', 'Palau'),
  ('PY', 'Paraguay'),
  ('QA', 'Qatar'),
  ('RE', 'Reunion'),
  ('RO', 'Romania'),
  ('RS', 'Serbia'),
  ('RU', 'Russian Federation'),
  ('RW', 'Rwanda'),
  ('SA', 'Saudi Arabia'),
  ('SB', 'Solomon Islands'),
  ('SC', 'Seychelles'),
  ('SD', 'Sudan'),
  ('SE', 'Sweden'),
  ('SG', 'Singapore'),
  ('SH', 'Saint Helena, Ascension and Tristan da Cunha'),
  ('SI', 'Slovenia'),
  ('SJ', 'Svalbard and Jan Mayen'),
  ('SK', 'Slovakia'),
  ('SL', 'Sierra Leone'),
  ('SM', 'San Marino'),
  ('SN', 'Senegal'),
  ('SO', 'Somalia'),
  ('SR', 'Suriname'),
  ('SS', 'South Sudan'),
  ('ST', 'Sao Tome and Principe'),
  ('SV', 'El Salvador'),
  ('SX', 'Sint Maarten (Dutch part)'),
  ('SY', 'Syrian Arab Republic'),
  ('SZ', 'Eswatini'),
  ('TC', 'Turks and Caicos Islands'),
  ('TD', 'Chad'),
  ('TF', 'French Southern Territories'),
  ('TG', 'Togo'),
  ('TH', 'Thailand'),
  ('TJ', 'Tajikistan'),
  ('TK', 'Tokelau'),
  ('TL', 'Timor-Leste'),
  ('TM', 'Turkmenistan'),
  ('TN', 'Tunisia'),
  ('TO', 'Tonga'),
  ('TR', 'Turkiye'),
  ('TT', 'Trinidad and Tobago'),
  ('TV', 'Tuvalu'),
  ('TW', 'Taiwan'),
  ('TZ', 'Tanzania'),
  ('UA', 'Ukraine'),
  ('UG', 'Uganda'),
  ('UM', 'United States Minor Outlying Islands'),
  ('US', 'United States'),
  ('UY', 'Uruguay'),
  ('UZ', 'Uzbekistan'),
  ('VA', 'Holy See'),
  ('VC', 'Saint Vincent and the Grenadines'),
  ('VE', 'Venezuela'),
  ('VG', 'Virgin Islands, British'),
  ('VI', 'Virgin Islands, U.S.'),
  ('VN', 'Viet Nam'),
  ('VU', 'Vanuatu'),
  ('WF', 'Wallis and Futuna'),
  ('WS', 'Samoa'),
  ('YE', 'Yemen'),
  ('YT', 'Mayotte'),
  ('ZA', 'South Africa'),
  ('ZM', 'Zambia'),
  ('ZW', 'Zimbabwe');

create table public.geo_regions (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.geo_countries(country_code) on delete restrict,
  region_code text not null,
  display_name text not null,
  source_key text,
  source_version text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint geo_regions_country_code_key unique (country_code, region_code),
  constraint geo_regions_id_country_key unique (id, country_code),
  constraint geo_regions_code_check check (
    char_length(btrim(region_code)) between 1 and 32
  ),
  constraint geo_regions_name_check check (
    char_length(btrim(display_name)) between 1 and 120
  )
);

create table public.geo_places (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.geo_countries(country_code) on delete restrict,
  region_id uuid references public.geo_regions(id) on delete restrict,
  display_name text not null,
  normalized_name text not null,
  timezone_name text,
  source_key text,
  source_version text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint geo_places_name_check check (
    char_length(btrim(display_name)) between 1 and 160
    and char_length(btrim(normalized_name)) between 1 and 160
  ),
  constraint geo_places_id_country_key unique (id, country_code),
  constraint geo_places_region_country_fkey foreign key (region_id, country_code)
    references public.geo_regions(id, country_code) on delete restrict
);

comment on table public.geo_regions is
  'Read-only normalized subdivision foundation. No global subdivision import is included in this migration.';
comment on table public.geo_places is
  'Read-only normalized place foundation. A reviewed, versioned gazetteer import is required before place IDs are used for discovery.';

create table private.member_location_preferences (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  country_code text references public.geo_countries(country_code) on delete restrict,
  legacy_country_label text,
  region_label text,
  city_label text,
  timezone_name text,
  legacy_timezone_label text,
  use_for_scheduling boolean not null default false,
  use_for_recommendations boolean not null default false,
  source text not null default 'member',
  consent_version text,
  consented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_location_preferences_source_check check (
    source in ('member', 'legacy_unconfirmed')
  ),
  constraint member_location_preferences_country_dependency_check check (
    source = 'legacy_unconfirmed'
    or country_code is not null
    or (
      region_label is null
      and city_label is null
      and use_for_recommendations = false
    )
  ),
  constraint member_location_preferences_region_check check (
    region_label is null
    or char_length(btrim(region_label)) between 1 and 120
  ),
  constraint member_location_preferences_city_check check (
    city_label is null
    or char_length(btrim(city_label)) between 1 and 120
  ),
  constraint member_location_preferences_legacy_country_check check (
    legacy_country_label is null
    or char_length(btrim(legacy_country_label)) between 1 and 120
  ),
  constraint member_location_preferences_timezone_check check (
    (use_for_scheduling and timezone_name is not null)
    or (
      not use_for_scheduling
      and (timezone_name is null or source = 'legacy_unconfirmed')
    )
  ),
  constraint member_location_preferences_legacy_timezone_check check (
    legacy_timezone_label is null
    or char_length(btrim(legacy_timezone_label)) between 1 and 120
  ),
  constraint member_location_preferences_consent_check check (
    (
      source = 'legacy_unconfirmed'
      and consent_version is null
      and consented_at is null
      and use_for_scheduling = false
      and use_for_recommendations = false
    )
    or (
      source = 'member'
      and consent_version is not null
      and consented_at is not null
    )
  )
);

create table public.member_location_shares (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  audience text not null,
  precision text not null,
  country_code text not null references public.geo_countries(country_code) on delete restrict,
  region_id uuid,
  place_id uuid,
  region_label text,
  city_label text,
  consent_version text not null,
  shared_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_location_shares_audience_check check (
    audience in ('members', 'public')
  ),
  constraint member_location_shares_precision_check check (
    precision in ('country', 'region', 'city')
  ),
  constraint member_location_shares_precision_fields_check check (
    (
      precision = 'country'
      and region_id is null
      and place_id is null
      and region_label is null
      and city_label is null
    )
    or (
      precision = 'region'
      and region_id is not null
      and place_id is null
      and region_label is not null
      and city_label is null
    )
    or (
      precision = 'city'
      and place_id is not null
      and city_label is not null
      and (
        (region_id is null and region_label is null)
        or (region_id is not null and region_label is not null)
      )
    )
  ),
  constraint member_location_shares_region_country_fkey
    foreign key (region_id, country_code)
    references public.geo_regions(id, country_code) on delete restrict,
  constraint member_location_shares_place_country_fkey
    foreign key (place_id, country_code)
    references public.geo_places(id, country_code) on delete restrict,
  constraint member_location_shares_region_check check (
    region_label is null
    or char_length(btrim(region_label)) between 1 and 120
  ),
  constraint member_location_shares_city_check check (
    city_label is null
    or char_length(btrim(city_label)) between 1 and 120
  ),
  constraint member_location_shares_consent_version_check check (
    char_length(btrim(consent_version)) between 3 and 80
  )
);

create table private.member_location_consent_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  action text not null,
  scheduling_enabled boolean not null,
  recommendations_enabled boolean not null,
  share_audience text,
  share_precision text,
  consent_version text not null,
  client_operation_id uuid not null,
  occurred_at timestamptz not null default now(),
  constraint member_location_consent_events_user_operation_key unique (
    user_id,
    client_operation_id
  ),
  constraint member_location_consent_events_action_check check (
    action in ('granted', 'changed', 'withdrawn')
  ),
  constraint member_location_consent_events_share_check check (
    (share_audience is null and share_precision is null)
    or (
      share_audience in ('members', 'public')
      and share_precision in ('country', 'region', 'city')
    )
  ),
  constraint member_location_consent_events_version_check check (
    char_length(btrim(consent_version)) between 3 and 80
  )
);

comment on table private.member_location_consent_events is
  'Append-only consent metadata. It deliberately excludes country, region, city, timezone and coordinate values.';

comment on table public.member_location_shares is
  'Deliberate minimum-precision projection. Region/city labels are canonical display values backed by active normalized reference IDs; private member-entered labels never flow through directly.';

create table private.member_location_operations (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  client_operation_id uuid not null,
  operation text not null,
  request_fingerprint text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, client_operation_id),
  constraint member_location_operations_operation_check check (
    operation in ('set', 'withdraw')
  ),
  constraint member_location_operations_fingerprint_check check (
    request_fingerprint ~ '^[0-9a-f]{32}$'
  )
);

create index geo_regions_country_active_idx
  on public.geo_regions (country_code, active, display_name);
create index geo_places_country_region_active_idx
  on public.geo_places (country_code, region_id, active, normalized_name);
create unique index geo_places_source_version_key
  on public.geo_places (source_key, source_version)
  where source_key is not null and source_version is not null;
create index member_location_shares_audience_country_idx
  on public.member_location_shares (audience, country_code, precision);
create index member_location_consent_events_user_time_idx
  on private.member_location_consent_events (user_id, occurred_at desc, id desc);

create or replace function private.canonicalize_member_location_share()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  canonical_region public.geo_regions%rowtype;
  canonical_place public.geo_places%rowtype;
begin
  if not exists (
    select 1
    from public.geo_countries as country
    where country.country_code = new.country_code
      and country.active
  ) then
    raise exception 'Shared country must reference an active normalized country'
      using errcode = '22023';
  end if;

  if new.precision = 'country' then
    new.region_id := null;
    new.place_id := null;
    new.region_label := null;
    new.city_label := null;
  elsif new.precision = 'region' then
    select region.*
    into canonical_region
    from public.geo_regions as region
    where region.id = new.region_id
      and region.country_code = new.country_code
      and region.active;

    if not found then
      raise exception 'Shared region must reference an active normalized region'
        using errcode = '22023';
    end if;

    new.place_id := null;
    new.region_label := canonical_region.display_name;
    new.city_label := null;
  elsif new.precision = 'city' then
    select place.*
    into canonical_place
    from public.geo_places as place
    where place.id = new.place_id
      and place.country_code = new.country_code
      and place.active;

    if not found then
      raise exception 'Shared city must reference an active normalized place'
        using errcode = '22023';
    end if;

    if canonical_place.region_id is not null then
      select region.*
      into canonical_region
      from public.geo_regions as region
      where region.id = canonical_place.region_id
        and region.country_code = new.country_code
        and region.active;

      if not found then
        raise exception 'Shared city region must reference an active normalized region'
          using errcode = '22023';
      end if;
    end if;

    new.region_id := canonical_place.region_id;
    new.region_label := case
      when canonical_place.region_id is null then null
      else canonical_region.display_name
    end;
    new.city_label := canonical_place.display_name;
  end if;

  return new;
end;
$function$;

revoke all on function private.canonicalize_member_location_share()
from public, anon, authenticated;

create trigger member_location_preferences_set_updated_at
before update on private.member_location_preferences
for each row execute function public.update_updated_at_column();

create trigger member_location_shares_canonicalize
before insert or update on public.member_location_shares
for each row execute function private.canonicalize_member_location_share();

create trigger member_location_shares_set_updated_at
before update on public.member_location_shares
for each row execute function public.update_updated_at_column();

alter table public.geo_countries enable row level security;
alter table public.geo_regions enable row level security;
alter table public.geo_places enable row level security;
alter table private.member_location_preferences enable row level security;
alter table public.member_location_shares enable row level security;
alter table private.member_location_consent_events enable row level security;
alter table private.member_location_operations enable row level security;

create or replace function private.can_read_member_location_share(
  _owner_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from private.community_onboarding_state as reader_state
      where reader_state.user_id = (select auth.uid())
        and reader_state.status = 'completed'
    )
    and exists (
      select 1
      from private.community_onboarding_state as owner_state
      where owner_state.user_id = _owner_id
        and owner_state.status = 'completed'
    );
$function$;

revoke all on function private.can_read_member_location_share(uuid)
from public, anon, authenticated;
grant execute on function private.can_read_member_location_share(uuid)
to authenticated, service_role;

create or replace function private.can_read_public_location_share(
  _owner_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles as profile
    join private.community_onboarding_state as onboarding
      on onboarding.user_id = profile.user_id
    where profile.user_id = _owner_id
      and profile.is_public = true
      and onboarding.status = 'completed'
  );
$function$;

revoke all on function private.can_read_public_location_share(uuid)
from public, anon, authenticated;
grant execute on function private.can_read_public_location_share(uuid)
to anon, authenticated, service_role;

create policy "Active countries are readable"
on public.geo_countries for select
to anon, authenticated
using (active);

create policy "Active regions are readable"
on public.geo_regions for select
to anon, authenticated
using (active);

create policy "Active places are readable"
on public.geo_places for select
to anon, authenticated
using (active);

create policy "Owners read their location share"
on public.member_location_shares for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Community members read member location shares"
on public.member_location_shares for select
to authenticated
using (
  audience = 'members'
  and private.can_read_member_location_share(user_id)
);

create policy "Public profile location shares are readable"
on public.member_location_shares for select
to anon, authenticated
using (
  audience = 'public'
  and private.can_read_public_location_share(user_id)
);

revoke all on table
  public.geo_countries,
  public.geo_regions,
  public.geo_places,
  public.member_location_shares
from public, anon, authenticated;

revoke all on table
  private.member_location_preferences,
  private.member_location_consent_events,
  private.member_location_operations
from public, anon, authenticated;

grant select on table
  public.geo_countries,
  public.geo_regions,
  public.geo_places,
  public.member_location_shares
to anon, authenticated;

grant all on table
  public.geo_countries,
  public.geo_regions,
  public.geo_places,
  public.member_location_shares,
  private.member_location_preferences,
  private.member_location_consent_events,
  private.member_location_operations
to service_role;

grant usage, select on sequence private.member_location_consent_events_id_seq
to service_role;

grant usage on schema private to authenticated, service_role;

-- Legacy profile values are private and unconfirmed. Matching a legacy
-- country label to the ISO catalogue is normalization only; it is not consent.
insert into private.member_location_preferences (
  user_id,
  country_code,
  legacy_country_label,
  region_label,
  city_label,
  timezone_name,
  legacy_timezone_label,
  use_for_scheduling,
  use_for_recommendations,
  source,
  consent_version,
  consented_at
)
select
  profile.user_id,
  country.country_code,
  case when country.country_code is null then legacy.country_label end,
  legacy.region_label,
  legacy.city_label,
  case when timezone.name is not null then legacy.timezone_label end,
  case when timezone.name is null then legacy.timezone_label end,
  false,
  false,
  'legacy_unconfirmed',
  null,
  null
from public.profiles as profile
cross join lateral (
  select
    nullif(regexp_replace(btrim(coalesce(profile.country, '')), '\s+', ' ', 'g'), '') as country_label,
    nullif(regexp_replace(btrim(coalesce(profile.region, '')), '\s+', ' ', 'g'), '') as region_label,
    nullif(regexp_replace(btrim(coalesce(profile.city, '')), '\s+', ' ', 'g'), '') as city_label,
    nullif(btrim(coalesce(profile.timezone, '')), '') as timezone_label
) as legacy
left join public.geo_countries as country
  on country.country_code = upper(legacy.country_label)
  or lower(country.display_name) = lower(legacy.country_label)
left join pg_catalog.pg_timezone_names as timezone
  on timezone.name = legacy.timezone_label
where legacy.country_label is not null
  or legacy.region_label is not null
  or legacy.city_label is not null
  or legacy.timezone_label is not null
on conflict (user_id) do nothing;

create or replace function public.get_my_location_preferences()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  response jsonb;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'countryCode', preference.country_code,
    'legacyCountryLabel', preference.legacy_country_label,
    'regionLabel', preference.region_label,
    'cityLabel', preference.city_label,
    'timezoneName', preference.timezone_name,
    'legacyTimezoneLabel', preference.legacy_timezone_label,
    'useForScheduling', coalesce(preference.use_for_scheduling, false),
    'useForRecommendations', coalesce(preference.use_for_recommendations, false),
    'source', preference.source,
    'consentVersion', preference.consent_version,
    'consentedAt', preference.consented_at,
    'shareAudience', location_share.audience,
    'sharePrecision', location_share.precision
  )
  into response
  from (values (caller_id)) as requested(user_id)
  left join private.member_location_preferences as preference
    on preference.user_id = requested.user_id
  left join public.member_location_shares as location_share
    on location_share.user_id = requested.user_id;

  return response;
end;
$function$;

create or replace function public.set_my_community_location(
  _country_code text,
  _region_label text,
  _city_label text,
  _timezone_name text,
  _use_for_scheduling boolean,
  _use_for_recommendations boolean,
  _share_audience text,
  _share_precision text,
  _consent_version text,
  _client_operation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  normalized_country text := nullif(upper(btrim(coalesce(_country_code, ''))), '');
  normalized_region text := nullif(
    regexp_replace(btrim(coalesce(_region_label, '')), '\s+', ' ', 'g'),
    ''
  );
  normalized_city text := nullif(
    regexp_replace(btrim(coalesce(_city_label, '')), '\s+', ' ', 'g'),
    ''
  );
  normalized_timezone text := nullif(btrim(coalesce(_timezone_name, '')), '');
  scheduling_enabled boolean := coalesce(_use_for_scheduling, false);
  recommendations_enabled boolean := coalesce(_use_for_recommendations, false);
  normalized_audience text := nullif(lower(btrim(coalesce(_share_audience, ''))), '');
  normalized_precision text := nullif(lower(btrim(coalesce(_share_precision, ''))), '');
  normalized_consent_version text := btrim(coalesce(_consent_version, ''));
  operation_fingerprint text;
  inserted_count integer := 0;
  prior_operation private.member_location_operations%rowtype;
  had_member_consent boolean;
  shared_region_id uuid;
  shared_place_id uuid;
  shared_match_count integer := 0;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if _client_operation_id is null then
    raise exception 'Client operation ID is required' using errcode = '22023';
  end if;
  if normalized_consent_version !~ '^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$' then
    raise exception 'A valid consent version is required' using errcode = '22023';
  end if;
  if normalized_country is not null and not exists (
    select 1
    from public.geo_countries as country
    where country.country_code = normalized_country
      and country.active
  ) then
    raise exception 'Unknown country code' using errcode = '22023';
  end if;
  if normalized_region is not null
    and char_length(normalized_region) > 120 then
    raise exception 'Region label is too long' using errcode = '22023';
  end if;
  if normalized_city is not null
    and char_length(normalized_city) > 120 then
    raise exception 'City label is too long' using errcode = '22023';
  end if;
  if normalized_country is null and (
    normalized_region is not null
    or normalized_city is not null
    or recommendations_enabled
    or normalized_audience is not null
    or normalized_precision is not null
  ) then
    raise exception 'Country is required for community location use or sharing'
      using errcode = '22023';
  end if;
  if scheduling_enabled then
    if normalized_timezone is null or not exists (
      select 1
      from pg_catalog.pg_timezone_names as timezone
      where timezone.name = normalized_timezone
    ) then
      raise exception 'A valid IANA timezone is required for scheduling'
        using errcode = '22023';
    end if;
  elsif normalized_timezone is not null then
    raise exception 'Timezone storage requires scheduling consent'
      using errcode = '22023';
  end if;
  if (normalized_audience is null) <> (normalized_precision is null) then
    raise exception 'Share audience and precision must be provided together'
      using errcode = '22023';
  end if;
  if normalized_audience is not null
    and normalized_audience not in ('members', 'public') then
    raise exception 'Unsupported location share audience' using errcode = '22023';
  end if;
  if normalized_precision is not null
    and normalized_precision not in ('country', 'region', 'city') then
    raise exception 'Unsupported location share precision' using errcode = '22023';
  end if;
  if normalized_precision = 'region' and normalized_region is null then
    raise exception 'Region precision requires a region label' using errcode = '22023';
  end if;
  if normalized_precision = 'city' and normalized_city is null then
    raise exception 'City precision requires a city label' using errcode = '22023';
  end if;
  if normalized_precision = 'region' then
    select
      (array_agg(region.id order by region.id))[1],
      count(*)::integer
    into shared_region_id, shared_match_count
    from public.geo_regions as region
    where region.country_code = normalized_country
      and region.active
      and lower(region.display_name) = lower(normalized_region);

    if shared_match_count <> 1 then
      raise exception 'Shared region must reference one active normalized region'
        using errcode = '22023';
    end if;
  elsif normalized_precision = 'city' then
    select
      (array_agg(place.id order by place.id))[1],
      (array_agg(place.region_id order by place.id))[1],
      count(*)::integer
    into shared_place_id, shared_region_id, shared_match_count
    from public.geo_places as place
    left join public.geo_regions as region
      on region.id = place.region_id
      and region.country_code = place.country_code
      and region.active
    where place.country_code = normalized_country
      and place.active
      and (
        lower(place.display_name) = lower(normalized_city)
        or place.normalized_name = lower(normalized_city)
      )
      and (
        normalized_region is null
        or lower(region.display_name) = lower(normalized_region)
      );

    if shared_match_count <> 1 then
      raise exception 'Shared city must reference one active normalized place'
        using errcode = '22023';
    end if;
  end if;
  if normalized_audience = 'members' and not exists (
    select 1
    from private.community_onboarding_state as onboarding
    where onboarding.user_id = caller_id
      and onboarding.status in ('in_progress', 'completed')
  ) then
    raise exception 'Community onboarding is required for member sharing'
      using errcode = '22023';
  end if;
  if normalized_audience = 'public' and not exists (
    select 1
    from public.profiles as profile
    where profile.user_id = caller_id
      and profile.is_public = true
  ) then
    raise exception 'A public profile is required for public location sharing'
      using errcode = '22023';
  end if;

  operation_fingerprint := md5(concat_ws(
    '|',
    coalesce(normalized_country, '<null>'),
    coalesce(normalized_region, '<null>'),
    coalesce(normalized_city, '<null>'),
    coalesce(normalized_timezone, '<null>'),
    scheduling_enabled::text,
    recommendations_enabled::text,
    coalesce(normalized_audience, '<null>'),
    coalesce(normalized_precision, '<null>'),
    normalized_consent_version
  ));

  insert into private.member_location_operations (
    user_id,
    client_operation_id,
    operation,
    request_fingerprint
  ) values (
    caller_id,
    _client_operation_id,
    'set',
    operation_fingerprint
  )
  on conflict (user_id, client_operation_id) do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    select operation.*
    into strict prior_operation
    from private.member_location_operations as operation
    where operation.user_id = caller_id
      and operation.client_operation_id = _client_operation_id;

    if prior_operation.operation <> 'set'
      or prior_operation.request_fingerprint <> operation_fingerprint then
      raise exception 'Client operation ID was already used for a different request'
        using errcode = '22023';
    end if;

    return jsonb_build_object('ok', true, 'changed', false);
  end if;

  select exists (
    select 1
    from private.member_location_preferences as preference
    where preference.user_id = caller_id
      and preference.source = 'member'
  ) into had_member_consent;

  insert into private.member_location_preferences (
    user_id,
    country_code,
    legacy_country_label,
    region_label,
    city_label,
    timezone_name,
    legacy_timezone_label,
    use_for_scheduling,
    use_for_recommendations,
    source,
    consent_version,
    consented_at
  ) values (
    caller_id,
    normalized_country,
    null,
    normalized_region,
    normalized_city,
    case when scheduling_enabled then normalized_timezone else null end,
    null,
    scheduling_enabled,
    recommendations_enabled,
    'member',
    normalized_consent_version,
    now()
  )
  on conflict (user_id) do update set
    country_code = excluded.country_code,
    legacy_country_label = null,
    region_label = excluded.region_label,
    city_label = excluded.city_label,
    timezone_name = excluded.timezone_name,
    legacy_timezone_label = null,
    use_for_scheduling = excluded.use_for_scheduling,
    use_for_recommendations = excluded.use_for_recommendations,
    source = excluded.source,
    consent_version = excluded.consent_version,
    consented_at = excluded.consented_at,
    updated_at = now();

  if normalized_audience is null then
    delete from public.member_location_shares as location_share
    where location_share.user_id = caller_id;
  else
    insert into public.member_location_shares (
      user_id,
      audience,
      precision,
      country_code,
      region_id,
      place_id,
      region_label,
      city_label,
      consent_version,
      shared_at
    ) values (
      caller_id,
      normalized_audience,
      normalized_precision,
      normalized_country,
      shared_region_id,
      shared_place_id,
      case
        when normalized_precision in ('region', 'city') then normalized_region
        else null
      end,
      case when normalized_precision = 'city' then normalized_city else null end,
      normalized_consent_version,
      now()
    )
    on conflict (user_id) do update set
      audience = excluded.audience,
      precision = excluded.precision,
      country_code = excluded.country_code,
      region_id = excluded.region_id,
      place_id = excluded.place_id,
      region_label = excluded.region_label,
      city_label = excluded.city_label,
      consent_version = excluded.consent_version,
      shared_at = excluded.shared_at,
      updated_at = now();
  end if;

  insert into private.member_location_consent_events (
    user_id,
    action,
    scheduling_enabled,
    recommendations_enabled,
    share_audience,
    share_precision,
    consent_version,
    client_operation_id
  ) values (
    caller_id,
    case when had_member_consent then 'changed' else 'granted' end,
    scheduling_enabled,
    recommendations_enabled,
    normalized_audience,
    normalized_precision,
    normalized_consent_version,
    _client_operation_id
  );

  return jsonb_build_object('ok', true, 'changed', true);
end;
$function$;

create or replace function public.withdraw_my_location_consent(
  _consent_version text,
  _client_operation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  normalized_consent_version text := btrim(coalesce(_consent_version, ''));
  operation_fingerprint text;
  inserted_count integer := 0;
  changed_count integer := 0;
  share_delete_count integer := 0;
  prior_operation private.member_location_operations%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if _client_operation_id is null then
    raise exception 'Client operation ID is required' using errcode = '22023';
  end if;
  if normalized_consent_version !~ '^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$' then
    raise exception 'A valid consent version is required' using errcode = '22023';
  end if;

  operation_fingerprint := md5(normalized_consent_version);

  insert into private.member_location_operations (
    user_id,
    client_operation_id,
    operation,
    request_fingerprint
  ) values (
    caller_id,
    _client_operation_id,
    'withdraw',
    operation_fingerprint
  )
  on conflict (user_id, client_operation_id) do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    select operation.*
    into strict prior_operation
    from private.member_location_operations as operation
    where operation.user_id = caller_id
      and operation.client_operation_id = _client_operation_id;

    if prior_operation.operation <> 'withdraw'
      or prior_operation.request_fingerprint <> operation_fingerprint then
      raise exception 'Client operation ID was already used for a different request'
        using errcode = '22023';
    end if;

    return jsonb_build_object('ok', true, 'changed', false);
  end if;

  delete from public.member_location_shares as location_share
  where location_share.user_id = caller_id;
  get diagnostics share_delete_count = row_count;

  delete from private.member_location_preferences as preference
  where preference.user_id = caller_id;
  get diagnostics changed_count = row_count;

  insert into private.member_location_consent_events (
    user_id,
    action,
    scheduling_enabled,
    recommendations_enabled,
    share_audience,
    share_precision,
    consent_version,
    client_operation_id
  ) values (
    caller_id,
    'withdrawn',
    false,
    false,
    null,
    null,
    normalized_consent_version,
    _client_operation_id
  );

  return jsonb_build_object(
    'ok', true,
    'changed', changed_count > 0 or share_delete_count > 0
  );
end;
$function$;

revoke all on function public.get_my_location_preferences()
  from public, anon, authenticated;
revoke all on function public.set_my_community_location(
  text, text, text, text, boolean, boolean, text, text, text, uuid
) from public, anon, authenticated;
revoke all on function public.withdraw_my_location_consent(text, uuid)
  from public, anon, authenticated;

grant execute on function public.get_my_location_preferences()
  to authenticated, service_role;
grant execute on function public.set_my_community_location(
  text, text, text, text, boolean, boolean, text, text, text, uuid
) to authenticated, service_role;
grant execute on function public.withdraw_my_location_consent(text, uuid)
  to authenticated, service_role;

comment on function public.get_my_location_preferences() is
  'Caller-bound private location and consent projection. It never accepts a target user ID.';
comment on function public.set_my_community_location(
  text, text, text, text, boolean, boolean, text, text, text, uuid
) is
  'Caller-bound atomic optional location/consent update with independent scheduling, recommendation and sharing choices.';
comment on function public.withdraw_my_location_consent(text, uuid) is
  'Caller-bound immediate deletion of private location preferences and any public/member share.';
