-- I/O Port provider registry: non-secret evidence, capability and price cards.
--
-- This migration deliberately separates browser-visible provider metadata from
-- private endpoint destinations and secret-manager references. It contains no
-- provider key, raw endpoint URL, prompt, response, contract body or invoice.
-- A provider/model/endpoint remains non-routable until a privileged operator
-- records evidence and separately activates a route policy.

create schema if not exists private;

-- Platform-admin checks must not depend on editable JWT user metadata. Keeping
-- this caller-bound helper in `private` also keeps it out of the Data API.
create or replace function private.io_is_platform_admin()
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
      from public.user_roles as user_role
      where user_role.user_id = (select auth.uid())
        and user_role.role::text = 'admin'
    );
$function$;

revoke all on function private.io_is_platform_admin() from public, anon, authenticated;
grant execute on function private.io_is_platform_admin() to authenticated;

create table public.io_providers (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique,
  display_name text not null,
  provider_kind text not null,
  integration_style text not null,
  lifecycle_state text not null default 'research',
  catalogue_visibility text not null default 'hidden',
  operator_name text,
  public_summary text,
  terms_version text,
  terms_evidence_url text,
  data_retention_class text not null default 'unknown',
  training_use_class text not null default 'unknown',
  default_region_code text,
  default_residency_country text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint io_providers_key_format_check check (
    char_length(provider_key) between 2 and 80
    and provider_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint io_providers_name_length_check check (
    char_length(btrim(display_name)) between 2 and 120
  ),
  constraint io_providers_kind_check check (
    provider_kind in (
      'direct_api',
      'managed_inference',
      'infrastructure_partner',
      'multi_provider_router',
      'local_device'
    )
  ),
  constraint io_providers_integration_style_check check (
    integration_style in (
      'openai_compatible',
      'native_adapter',
      'managed_runtime',
      'local_loopback'
    )
  ),
  constraint io_providers_lifecycle_check check (
    lifecycle_state in ('research', 'conformance', 'active', 'paused', 'retired')
  ),
  constraint io_providers_catalogue_visibility_check check (
    catalogue_visibility in ('hidden', 'listed')
  ),
  constraint io_providers_operator_name_check check (
    operator_name is null or char_length(btrim(operator_name)) between 2 and 160
  ),
  constraint io_providers_summary_check check (
    public_summary is null or char_length(public_summary) <= 2000
  ),
  constraint io_providers_terms_version_check check (
    terms_version is null or char_length(terms_version) <= 120
  ),
  constraint io_providers_terms_url_check check (
    terms_evidence_url is null or terms_evidence_url ~ '^https://'
  ),
  constraint io_providers_retention_class_check check (
    data_retention_class in (
      'unknown',
      'provider_default',
      'no_training_claimed',
      'contractual_no_training',
      'local_only'
    )
  ),
  constraint io_providers_training_use_class_check check (
    training_use_class in (
      'unknown',
      'provider_default',
      'opt_out_supported',
      'no_training_claimed',
      'contractual_no_training',
      'local_only'
    )
  ),
  constraint io_providers_region_code_check check (
    default_region_code is null or char_length(default_region_code) between 2 and 32
  ),
  constraint io_providers_residency_country_check check (
    default_residency_country is null
    or default_residency_country ~ '^[A-Z]{2}$'
  )
);

comment on table public.io_providers is
  'Non-secret provider catalogue and evidence metadata. A listed provider is not necessarily a routable provider.';

create table public.io_models (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.io_providers(id) on delete restrict,
  provider_model_id text not null,
  display_name text not null,
  model_family text,
  model_creator text,
  origin_country_code text,
  revision text,
  licence_name text,
  licence_evidence_url text,
  commercial_hosting_rights text not null default 'unknown',
  commercial_redistribution_rights text not null default 'unknown',
  modalities text[] not null default array['text']::text[],
  max_context_tokens integer,
  listing_state text not null default 'draft',
  deprecation_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint io_models_id_provider_key unique (id, provider_id),
  constraint io_models_provider_model_revision_key unique nulls not distinct (
    provider_id,
    provider_model_id,
    revision
  ),
  constraint io_models_provider_model_id_check check (
    char_length(btrim(provider_model_id)) between 1 and 200
  ),
  constraint io_models_display_name_check check (
    char_length(btrim(display_name)) between 1 and 160
  ),
  constraint io_models_family_check check (
    model_family is null or char_length(model_family) <= 120
  ),
  constraint io_models_creator_check check (
    model_creator is null or char_length(model_creator) <= 160
  ),
  constraint io_models_origin_country_check check (
    origin_country_code is null or origin_country_code ~ '^[A-Z]{2}$'
  ),
  constraint io_models_revision_check check (
    revision is null or char_length(revision) between 1 and 160
  ),
  constraint io_models_licence_check check (
    licence_name is null or char_length(licence_name) <= 160
  ),
  constraint io_models_licence_url_check check (
    licence_evidence_url is null or licence_evidence_url ~ '^https://'
  ),
  constraint io_models_hosting_rights_check check (
    commercial_hosting_rights in ('unknown', 'allowed', 'restricted', 'contract_required')
  ),
  constraint io_models_redistribution_rights_check check (
    commercial_redistribution_rights in ('unknown', 'allowed', 'restricted', 'contract_required')
  ),
  constraint io_models_modalities_check check (
    cardinality(modalities) between 1 and 12
    and array_position(modalities, null) is null
    and modalities <@ array[
      'text', 'image', 'audio', 'video', 'embeddings', 'rerank', 'moderation'
    ]::text[]
  ),
  constraint io_models_context_limit_check check (
    max_context_tokens is null or max_context_tokens > 0
  ),
  constraint io_models_listing_state_check check (
    listing_state in ('draft', 'listed', 'retired')
  )
);

comment on table public.io_models is
  'Provider-specific model revision catalogue. Model origin, serving region and provider legal entity are intentionally separate facts.';

create table public.io_model_endpoints (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null,
  model_id uuid not null,
  capacity_source_id uuid references public.io_capacity_sources(id) on delete restrict,
  endpoint_key text not null,
  capacity_mode text not null,
  routing_state text not null default 'candidate',
  member_visible boolean not null default false,
  region_code text,
  residency_country_code text,
  residency_evidence_url text,
  retention_class text not null default 'unknown',
  max_concurrency integer,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint io_model_endpoints_model_provider_fkey
    foreign key (model_id, provider_id)
    references public.io_models(id, provider_id)
    on delete restrict,
  constraint io_model_endpoints_model_provider_key unique (model_id, provider_id),
  constraint io_model_endpoints_provider_key_key unique (provider_id, endpoint_key),
  constraint io_model_endpoints_key_check check (
    char_length(endpoint_key) between 2 and 100
    and endpoint_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint io_model_endpoints_capacity_mode_check check (
    capacity_mode in (
      'direct_api',
      'member_byok',
      'i_o_rented',
      'i_o_owned',
      'community_donated',
      'local_device'
    )
  ),
  constraint io_model_endpoints_state_check check (
    routing_state in ('candidate', 'conformance', 'active', 'paused', 'retired')
  ),
  constraint io_model_endpoints_region_check check (
    region_code is null or char_length(region_code) between 2 and 32
  ),
  constraint io_model_endpoints_residency_country_check check (
    residency_country_code is null or residency_country_code ~ '^[A-Z]{2}$'
  ),
  constraint io_model_endpoints_residency_url_check check (
    residency_evidence_url is null or residency_evidence_url ~ '^https://'
  ),
  constraint io_model_endpoints_retention_class_check check (
    retention_class in (
      'unknown',
      'provider_default',
      'no_training_claimed',
      'contractual_no_training',
      'local_only'
    )
  ),
  constraint io_model_endpoints_concurrency_check check (
    max_concurrency is null or max_concurrency > 0
  ),
  constraint io_model_endpoints_capacity_source_check check (
    (capacity_mode in ('i_o_rented', 'i_o_owned', 'community_donated') and capacity_source_id is not null)
    or (capacity_mode not in ('i_o_rented', 'i_o_owned', 'community_donated'))
  )
);

comment on table public.io_model_endpoints is
  'Non-secret endpoint routing metadata. The actual URL and secret-manager reference are private and can be read only by trusted server code.';

create table private.io_endpoint_connections (
  endpoint_id uuid primary key references public.io_model_endpoints(id) on delete cascade,
  connection_mode text not null,
  endpoint_base_url text,
  secret_reference text,
  private_metadata jsonb not null default '{}'::jsonb,
  connection_state text not null default 'unconfigured',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint io_endpoint_connections_mode_check check (
    connection_mode in ('server_secret', 'member_byok', 'local_loopback')
  ),
  constraint io_endpoint_connections_base_url_check check (
    endpoint_base_url is null or endpoint_base_url ~ '^https?://'
  ),
  constraint io_endpoint_connections_secret_ref_check check (
    (connection_mode = 'server_secret' and secret_reference is not null)
    or (connection_mode in ('member_byok', 'local_loopback') and secret_reference is null)
  ),
  constraint io_endpoint_connections_metadata_object_check check (
    jsonb_typeof(private_metadata) = 'object'
  ),
  constraint io_endpoint_connections_state_check check (
    connection_state in ('unconfigured', 'testing', 'ready', 'paused', 'retired')
  )
);

comment on table private.io_endpoint_connections is
  'Server-only endpoint URL and secret-manager reference. This table is not a browser API surface and never stores a raw provider credential.';

create table public.io_endpoint_capability_versions (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references public.io_model_endpoints(id) on delete cascade,
  version integer not null,
  verification_state text not null default 'draft',
  supports_model_listing boolean not null default false,
  supports_chat boolean not null default false,
  supports_streaming boolean not null default false,
  supports_tools boolean not null default false,
  supports_structured_output boolean not null default false,
  supports_vision boolean not null default false,
  supports_audio boolean not null default false,
  supports_embeddings boolean not null default false,
  supports_batch boolean not null default false,
  supports_usage_receipt boolean not null default false,
  supports_cancellation boolean not null default false,
  evidence_url text,
  tested_at timestamptz,
  verified_by uuid default auth.uid() references auth.users(id) on delete set null,
  recorded_at timestamptz not null default now(),
  constraint io_endpoint_capability_versions_endpoint_version_key unique (endpoint_id, version),
  constraint io_endpoint_capability_versions_number_check check (version > 0),
  constraint io_endpoint_capability_versions_state_check check (
    verification_state in ('draft', 'verified')
  ),
  constraint io_endpoint_capability_versions_evidence_url_check check (
    evidence_url is null or evidence_url ~ '^https://'
  ),
  constraint io_endpoint_capability_versions_verification_check check (
    (verification_state = 'draft' and tested_at is null)
    or (verification_state = 'verified' and tested_at is not null and verified_by is not null)
  )
);

comment on table public.io_endpoint_capability_versions is
  'Immutable-on-verification capability matrix. Unverified capabilities are false; OpenAI compatibility is never inferred wholesale.';

create table public.io_endpoint_pricing_versions (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references public.io_model_endpoints(id) on delete cascade,
  version integer not null,
  publication_state text not null default 'draft',
  member_visible boolean not null default false,
  currency_code text not null,
  billing_meter text not null,
  unit_quantity bigint not null,
  unit_price_nanos bigint,
  input_price_nanos bigint,
  cached_input_price_nanos bigint,
  output_price_nanos bigint,
  evidence_url text,
  evidence_note text,
  effective_from timestamptz not null,
  effective_until timestamptz,
  recorded_by uuid default auth.uid() references auth.users(id) on delete set null,
  recorded_at timestamptz not null default now(),
  constraint io_endpoint_pricing_versions_endpoint_version_key unique (endpoint_id, version),
  constraint io_endpoint_pricing_versions_number_check check (version > 0),
  constraint io_endpoint_pricing_versions_state_check check (
    publication_state in ('draft', 'published')
  ),
  constraint io_endpoint_pricing_versions_currency_check check (
    currency_code ~ '^[A-Z]{3}$'
  ),
  constraint io_endpoint_pricing_versions_meter_check check (
    billing_meter in ('tokens', 'compute_seconds', 'requests', 'images', 'audio_seconds', 'video_seconds')
  ),
  constraint io_endpoint_pricing_versions_quantity_check check (unit_quantity > 0),
  constraint io_endpoint_pricing_versions_nanos_check check (
    (unit_price_nanos is null or unit_price_nanos >= 0)
    and (input_price_nanos is null or input_price_nanos >= 0)
    and (cached_input_price_nanos is null or cached_input_price_nanos >= 0)
    and (output_price_nanos is null or output_price_nanos >= 0)
  ),
  constraint io_endpoint_pricing_versions_meter_price_check check (
    (billing_meter = 'tokens' and input_price_nanos is not null and output_price_nanos is not null)
    or (billing_meter <> 'tokens' and unit_price_nanos is not null)
  ),
  constraint io_endpoint_pricing_versions_evidence_url_check check (
    evidence_url is null or evidence_url ~ '^https://'
  ),
  constraint io_endpoint_pricing_versions_note_check check (
    evidence_note is null or char_length(evidence_note) <= 2000
  ),
  constraint io_endpoint_pricing_versions_dates_check check (
    effective_until is null or effective_until > effective_from
  ),
  constraint io_endpoint_pricing_versions_publication_check check (
    publication_state = 'draft' or recorded_by is not null
  )
);

comment on table public.io_endpoint_pricing_versions is
  'Versioned upstream/managed-capacity price cards. Nanos represent one billionth of the listed currency unit, avoiding fractional-cent rounding before the P2 INR ledger.';

create table private.io_provider_conformance_runs (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references public.io_model_endpoints(id) on delete cascade,
  capability_version_id uuid references public.io_endpoint_capability_versions(id) on delete set null,
  run_state text not null,
  result_summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  run_by uuid references auth.users(id) on delete set null,
  constraint io_provider_conformance_runs_state_check check (
    run_state in ('running', 'passed', 'failed', 'cancelled')
  ),
  constraint io_provider_conformance_runs_summary_object_check check (
    jsonb_typeof(result_summary) = 'object'
  ),
  constraint io_provider_conformance_runs_finish_check check (
    (run_state = 'running' and finished_at is null)
    or (run_state <> 'running' and finished_at is not null)
  )
);

comment on table private.io_provider_conformance_runs is
  'Server-only conformance-run metadata. Summaries may contain test identifiers, timings and error classes but never prompts, generated text, headers or credentials.';

-- Foreign-key and catalogue lookup indexes. Do not add speculative indexes for
-- unbuilt admin filters; each index below backs an expected route or join.
create index io_providers_catalogue_state_idx
  on public.io_providers (catalogue_visibility, lifecycle_state, display_name);
create index io_models_provider_listing_idx
  on public.io_models (provider_id, listing_state, display_name);
create index io_model_endpoints_model_routing_idx
  on public.io_model_endpoints (model_id, routing_state, member_visible);
create index io_model_endpoints_capacity_source_idx
  on public.io_model_endpoints (capacity_source_id)
  where capacity_source_id is not null;
create index io_endpoint_capability_versions_endpoint_state_idx
  on public.io_endpoint_capability_versions (endpoint_id, verification_state, version desc);
create index io_endpoint_pricing_versions_endpoint_state_idx
  on public.io_endpoint_pricing_versions (endpoint_id, publication_state, effective_from desc);
create index io_provider_conformance_runs_endpoint_time_idx
  on private.io_provider_conformance_runs (endpoint_id, started_at desc);

create trigger io_providers_set_updated_at
before update on public.io_providers
for each row execute function public.update_updated_at_column();

create trigger io_models_set_updated_at
before update on public.io_models
for each row execute function public.update_updated_at_column();

create trigger io_model_endpoints_set_updated_at
before update on public.io_model_endpoints
for each row execute function public.update_updated_at_column();

create trigger io_endpoint_connections_set_updated_at
before update on private.io_endpoint_connections
for each row execute function public.update_updated_at_column();

-- Public registry objects use RLS and explicit Data API privileges. Private
-- connection/conformance tables have both RLS and no browser grants as defense
-- in depth, even though the private schema is not exposed through PostgREST.
alter table public.io_providers enable row level security;
alter table public.io_models enable row level security;
alter table public.io_model_endpoints enable row level security;
alter table public.io_endpoint_capability_versions enable row level security;
alter table public.io_endpoint_pricing_versions enable row level security;
alter table private.io_endpoint_connections enable row level security;
alter table private.io_provider_conformance_runs enable row level security;

create policy "I/O members read listed providers"
on public.io_providers for select
to authenticated
using (
  catalogue_visibility = 'listed'
  or (select private.io_is_platform_admin())
);

create policy "I/O platform admins create providers"
on public.io_providers for insert
to authenticated
with check ((select private.io_is_platform_admin()));

create policy "I/O platform admins update providers"
on public.io_providers for update
to authenticated
using ((select private.io_is_platform_admin()))
with check ((select private.io_is_platform_admin()));

create policy "I/O members read listed models"
on public.io_models for select
to authenticated
using (
  (select private.io_is_platform_admin())
  or (
    listing_state = 'listed'
    and exists (
      select 1
      from public.io_providers as provider
      where provider.id = provider_id
        and provider.catalogue_visibility = 'listed'
    )
  )
);

create policy "I/O platform admins create models"
on public.io_models for insert
to authenticated
with check ((select private.io_is_platform_admin()));

create policy "I/O platform admins update models"
on public.io_models for update
to authenticated
using ((select private.io_is_platform_admin()))
with check ((select private.io_is_platform_admin()));

create policy "I/O members read visible endpoints"
on public.io_model_endpoints for select
to authenticated
using (
  (select private.io_is_platform_admin())
  or (
    member_visible
    and exists (
      select 1
      from public.io_models as model
      where model.id = model_id
        and model.listing_state = 'listed'
    )
  )
);

create policy "I/O platform admins create endpoints"
on public.io_model_endpoints for insert
to authenticated
with check ((select private.io_is_platform_admin()));

create policy "I/O platform admins update endpoints"
on public.io_model_endpoints for update
to authenticated
using ((select private.io_is_platform_admin()))
with check ((select private.io_is_platform_admin()));

create policy "I/O members read verified visible capabilities"
on public.io_endpoint_capability_versions for select
to authenticated
using (
  (select private.io_is_platform_admin())
  or (
    verification_state = 'verified'
    and exists (
      select 1
      from public.io_model_endpoints as endpoint
      where endpoint.id = endpoint_id
        and endpoint.member_visible
    )
  )
);

create policy "I/O platform admins manage draft capabilities"
on public.io_endpoint_capability_versions for insert
to authenticated
with check ((select private.io_is_platform_admin()));

create policy "I/O platform admins seal draft capabilities"
on public.io_endpoint_capability_versions for update
to authenticated
using (
  verification_state = 'draft'
  and (select private.io_is_platform_admin())
)
with check ((select private.io_is_platform_admin()));

create policy "I/O members read published visible price cards"
on public.io_endpoint_pricing_versions for select
to authenticated
using (
  (select private.io_is_platform_admin())
  or (
    publication_state = 'published'
    and member_visible
    and exists (
      select 1
      from public.io_model_endpoints as endpoint
      where endpoint.id = endpoint_id
        and endpoint.member_visible
    )
  )
);

create policy "I/O platform admins manage draft price cards"
on public.io_endpoint_pricing_versions for insert
to authenticated
with check ((select private.io_is_platform_admin()));

create policy "I/O platform admins seal draft price cards"
on public.io_endpoint_pricing_versions for update
to authenticated
using (
  publication_state = 'draft'
  and (select private.io_is_platform_admin())
)
with check ((select private.io_is_platform_admin()));

revoke all on table
  public.io_providers,
  public.io_models,
  public.io_model_endpoints,
  public.io_endpoint_capability_versions,
  public.io_endpoint_pricing_versions
from anon, authenticated;

revoke all on table
  private.io_endpoint_connections,
  private.io_provider_conformance_runs
from public, anon, authenticated;

grant select on table
  public.io_providers,
  public.io_models,
  public.io_model_endpoints,
  public.io_endpoint_capability_versions,
  public.io_endpoint_pricing_versions
to authenticated;

grant insert (
  provider_key,
  display_name,
  provider_kind,
  integration_style,
  lifecycle_state,
  catalogue_visibility,
  operator_name,
  public_summary,
  terms_version,
  terms_evidence_url,
  data_retention_class,
  training_use_class,
  default_region_code,
  default_residency_country,
  created_by
) on public.io_providers to authenticated;

grant update (
  provider_key,
  display_name,
  provider_kind,
  integration_style,
  lifecycle_state,
  catalogue_visibility,
  operator_name,
  public_summary,
  terms_version,
  terms_evidence_url,
  data_retention_class,
  training_use_class,
  default_region_code,
  default_residency_country
) on public.io_providers to authenticated;

grant insert (
  provider_id,
  provider_model_id,
  display_name,
  model_family,
  model_creator,
  origin_country_code,
  revision,
  licence_name,
  licence_evidence_url,
  commercial_hosting_rights,
  commercial_redistribution_rights,
  modalities,
  max_context_tokens,
  listing_state,
  deprecation_at,
  created_by
) on public.io_models to authenticated;

grant update (
  provider_id,
  provider_model_id,
  display_name,
  model_family,
  model_creator,
  origin_country_code,
  revision,
  licence_name,
  licence_evidence_url,
  commercial_hosting_rights,
  commercial_redistribution_rights,
  modalities,
  max_context_tokens,
  listing_state,
  deprecation_at
) on public.io_models to authenticated;

grant insert (
  provider_id,
  model_id,
  capacity_source_id,
  endpoint_key,
  capacity_mode,
  routing_state,
  member_visible,
  region_code,
  residency_country_code,
  residency_evidence_url,
  retention_class,
  max_concurrency,
  created_by
) on public.io_model_endpoints to authenticated;

grant update (
  provider_id,
  model_id,
  capacity_source_id,
  endpoint_key,
  capacity_mode,
  routing_state,
  member_visible,
  region_code,
  residency_country_code,
  residency_evidence_url,
  retention_class,
  max_concurrency
) on public.io_model_endpoints to authenticated;

grant insert (
  endpoint_id,
  version,
  verification_state,
  supports_model_listing,
  supports_chat,
  supports_streaming,
  supports_tools,
  supports_structured_output,
  supports_vision,
  supports_audio,
  supports_embeddings,
  supports_batch,
  supports_usage_receipt,
  supports_cancellation,
  evidence_url,
  tested_at,
  verified_by
) on public.io_endpoint_capability_versions to authenticated;

grant update (
  verification_state,
  supports_model_listing,
  supports_chat,
  supports_streaming,
  supports_tools,
  supports_structured_output,
  supports_vision,
  supports_audio,
  supports_embeddings,
  supports_batch,
  supports_usage_receipt,
  supports_cancellation,
  evidence_url,
  tested_at,
  verified_by
) on public.io_endpoint_capability_versions to authenticated;

grant insert (
  endpoint_id,
  version,
  publication_state,
  member_visible,
  currency_code,
  billing_meter,
  unit_quantity,
  unit_price_nanos,
  input_price_nanos,
  cached_input_price_nanos,
  output_price_nanos,
  evidence_url,
  evidence_note,
  effective_from,
  effective_until,
  recorded_by
) on public.io_endpoint_pricing_versions to authenticated;

grant update (
  publication_state,
  member_visible,
  currency_code,
  billing_meter,
  unit_quantity,
  unit_price_nanos,
  input_price_nanos,
  cached_input_price_nanos,
  output_price_nanos,
  evidence_url,
  evidence_note,
  effective_from,
  effective_until,
  recorded_by
) on public.io_endpoint_pricing_versions to authenticated;
