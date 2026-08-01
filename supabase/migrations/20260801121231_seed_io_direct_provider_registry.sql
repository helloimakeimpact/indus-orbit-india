-- Stage the first five direct I/O Port providers without enabling paid traffic.
--
-- Credentials remain Edge Function secrets. This migration stores only secret
-- reference names, official evidence URLs and reviewed catalogue metadata.
-- Connections remain `testing`, endpoint capabilities remain `draft`, and
-- endpoints remain in `conformance` until an operator records a passing test.

do $migration$
declare
  operator_id uuid;
  partner_capacity_id uuid;
  selected_provider_id uuid;
  selected_model_id uuid;
  selected_endpoint_id uuid;
begin
  select workspace.created_by
  into operator_id
  from public.io_workspaces as workspace
  where workspace.slug = 'indus-demo'
  limit 1;

  if operator_id is null then
    raise notice 'Skipping demo provider staging: the indus-demo workspace is not present';
    return;
  end if;

  select source.id
  into partner_capacity_id
  from public.io_capacity_sources as source
  where source.source_key = 'partner-gateway';

  if partner_capacity_id is null then
    raise notice 'Skipping demo provider staging: the partner-gateway capacity source is not present';
    return;
  end if;

  update public.io_capacity_sources
  set status = 'active'
  where id = partner_capacity_id;

  update public.io_workspace_capacity_grants
  set status = 'active'
  where capacity_source_id = partner_capacity_id
    and workspace_id in (
      select workspace.id
      from public.io_workspaces as workspace
      where workspace.slug = 'indus-demo'
    );

  -- OpenAI: cost-sensitive member of the current GPT-5.6 family.
  insert into public.io_providers (
    provider_key, display_name, provider_kind, integration_style,
    lifecycle_state, catalogue_visibility, operator_name, public_summary,
    data_retention_class, training_use_class, created_by
  ) values (
    'openai', 'OpenAI', 'direct_api', 'openai_compatible',
    'conformance', 'listed', 'OpenAI',
    'Direct OpenAI API capacity; staged for I/O conformance before member traffic.',
    'unknown', 'unknown', operator_id
  )
  on conflict (provider_key) do update set
    display_name = excluded.display_name,
    provider_kind = excluded.provider_kind,
    integration_style = excluded.integration_style,
    lifecycle_state = excluded.lifecycle_state,
    catalogue_visibility = excluded.catalogue_visibility,
    operator_name = excluded.operator_name,
    public_summary = excluded.public_summary,
    updated_at = now()
  returning id into selected_provider_id;

  insert into public.io_models (
    provider_id, provider_model_id, display_name, model_family, model_creator,
    origin_country_code, revision, commercial_hosting_rights,
    commercial_redistribution_rights, modalities, max_context_tokens,
    listing_state, released_at, auto_route_tier, created_by
  ) values (
    selected_provider_id, 'gpt-5.6-luna', 'GPT-5.6 Luna', 'GPT-5.6', 'OpenAI',
    'US', 'ga-2026-07-09', 'restricted', 'restricted', array['text']::text[],
    1050000, 'listed', date '2026-07-09', 'balanced', operator_id
  )
  on conflict (provider_id, provider_model_id, revision) do update set
    display_name = excluded.display_name,
    max_context_tokens = excluded.max_context_tokens,
    listing_state = excluded.listing_state,
    released_at = excluded.released_at,
    auto_route_tier = excluded.auto_route_tier,
    updated_at = now()
  returning id into selected_model_id;

  insert into public.io_model_endpoints (
    provider_id, model_id, capacity_source_id, endpoint_key, capacity_mode,
    routing_state, member_visible, retention_class, created_by
  ) values (
    selected_provider_id, selected_model_id, partner_capacity_id, 'openai-gpt-5-6-luna', 'direct_api',
    'conformance', true, 'unknown', operator_id
  )
  on conflict (provider_id, endpoint_key) do update set
    model_id = excluded.model_id,
    capacity_source_id = excluded.capacity_source_id,
    routing_state = excluded.routing_state,
    member_visible = excluded.member_visible,
    updated_at = now()
  returning id into selected_endpoint_id;

  insert into private.io_endpoint_connections (
    endpoint_id, connection_mode, endpoint_base_url, secret_reference, connection_state
  ) values (
    selected_endpoint_id, 'server_secret', 'https://api.openai.com/v1',
    'IO_PROVIDER_OPENAI_API_KEY', 'testing'
  )
  on conflict (endpoint_id) do update set
    endpoint_base_url = excluded.endpoint_base_url,
    secret_reference = excluded.secret_reference,
    connection_state = excluded.connection_state,
    updated_at = now();

  insert into public.io_endpoint_capability_versions (
    endpoint_id, version, verification_state, evidence_url, verified_by
  ) values (
    selected_endpoint_id, 1, 'draft',
    'https://developers.openai.com/api/docs/models/gpt-5.6-luna', operator_id
  ) on conflict (endpoint_id, version) do nothing;

  insert into public.io_endpoint_pricing_versions (
    endpoint_id, version, publication_state, member_visible, currency_code,
    billing_meter, unit_quantity, input_price_nanos, output_price_nanos,
    evidence_url, evidence_note, effective_from, recorded_by
  ) values (
    selected_endpoint_id, 1, 'published', true, 'USD', 'tokens', 1000000,
    1000000000, 6000000000,
    'https://developers.openai.com/api/docs/models/gpt-5.6-luna',
    'Standard API token price; cache discounts and special service tiers are excluded.',
    timestamptz '2026-07-09 00:00:00+00', operator_id
  ) on conflict (endpoint_id, version) do nothing;

  -- SpaceXAI / xAI.
  insert into public.io_providers (
    provider_key, display_name, provider_kind, integration_style,
    lifecycle_state, catalogue_visibility, operator_name, public_summary,
    data_retention_class, training_use_class, created_by
  ) values (
    'xai', 'SpaceXAI', 'direct_api', 'openai_compatible',
    'conformance', 'listed', 'SpaceXAI',
    'Direct SpaceXAI API capacity; staged for I/O conformance before member traffic.',
    'unknown', 'unknown', operator_id
  )
  on conflict (provider_key) do update set
    display_name = excluded.display_name,
    provider_kind = excluded.provider_kind,
    integration_style = excluded.integration_style,
    lifecycle_state = excluded.lifecycle_state,
    catalogue_visibility = excluded.catalogue_visibility,
    operator_name = excluded.operator_name,
    public_summary = excluded.public_summary,
    updated_at = now()
  returning id into selected_provider_id;

  insert into public.io_models (
    provider_id, provider_model_id, display_name, model_family, model_creator,
    origin_country_code, revision, commercial_hosting_rights,
    commercial_redistribution_rights, modalities, max_context_tokens,
    listing_state, released_at, auto_route_tier, created_by
  ) values (
    selected_provider_id, 'grok-4.5', 'Grok 4.5', 'Grok 4', 'SpaceXAI',
    'US', 'ga-2026-07-16', 'restricted', 'restricted', array['text']::text[],
    500000, 'listed', date '2026-07-16', 'balanced', operator_id
  )
  on conflict (provider_id, provider_model_id, revision) do update set
    display_name = excluded.display_name,
    max_context_tokens = excluded.max_context_tokens,
    listing_state = excluded.listing_state,
    released_at = excluded.released_at,
    auto_route_tier = excluded.auto_route_tier,
    updated_at = now()
  returning id into selected_model_id;

  insert into public.io_model_endpoints (
    provider_id, model_id, capacity_source_id, endpoint_key, capacity_mode,
    routing_state, member_visible, retention_class, created_by
  ) values (
    selected_provider_id, selected_model_id, partner_capacity_id, 'xai-grok-4-5', 'direct_api',
    'conformance', true, 'unknown', operator_id
  )
  on conflict (provider_id, endpoint_key) do update set
    model_id = excluded.model_id,
    capacity_source_id = excluded.capacity_source_id,
    routing_state = excluded.routing_state,
    member_visible = excluded.member_visible,
    updated_at = now()
  returning id into selected_endpoint_id;

  insert into private.io_endpoint_connections (
    endpoint_id, connection_mode, endpoint_base_url, secret_reference, connection_state
  ) values (
    selected_endpoint_id, 'server_secret', 'https://api.x.ai/v1',
    'IO_PROVIDER_XAI_API_KEY', 'testing'
  )
  on conflict (endpoint_id) do update set
    endpoint_base_url = excluded.endpoint_base_url,
    secret_reference = excluded.secret_reference,
    connection_state = excluded.connection_state,
    updated_at = now();

  insert into public.io_endpoint_capability_versions (
    endpoint_id, version, verification_state, evidence_url, verified_by
  ) values (
    selected_endpoint_id, 1, 'draft', 'https://docs.x.ai/developers/grok-4-5', operator_id
  ) on conflict (endpoint_id, version) do nothing;

  insert into public.io_endpoint_pricing_versions (
    endpoint_id, version, publication_state, member_visible, currency_code,
    billing_meter, unit_quantity, input_price_nanos, output_price_nanos,
    evidence_url, evidence_note, effective_from, recorded_by
  ) values (
    selected_endpoint_id, 1, 'published', true, 'USD', 'tokens', 1000000,
    2000000000, 6000000000,
    'https://docs.x.ai/developers/pricing',
    'Short-context standard token price; long-context pricing is not represented by this endpoint.',
    timestamptz '2026-07-16 00:00:00+00', operator_id
  ) on conflict (endpoint_id, version) do nothing;

  -- Google Gemini native API.
  insert into public.io_providers (
    provider_key, display_name, provider_kind, integration_style,
    lifecycle_state, catalogue_visibility, operator_name, public_summary,
    data_retention_class, training_use_class, created_by
  ) values (
    'gemini', 'Google Gemini', 'direct_api', 'native_adapter',
    'conformance', 'listed', 'Google',
    'Direct Gemini Developer API capacity; staged for I/O conformance before member traffic.',
    'unknown', 'unknown', operator_id
  )
  on conflict (provider_key) do update set
    display_name = excluded.display_name,
    provider_kind = excluded.provider_kind,
    integration_style = excluded.integration_style,
    lifecycle_state = excluded.lifecycle_state,
    catalogue_visibility = excluded.catalogue_visibility,
    operator_name = excluded.operator_name,
    public_summary = excluded.public_summary,
    updated_at = now()
  returning id into selected_provider_id;

  insert into public.io_models (
    provider_id, provider_model_id, display_name, model_family, model_creator,
    origin_country_code, revision, commercial_hosting_rights,
    commercial_redistribution_rights, modalities, max_context_tokens,
    listing_state, released_at, auto_route_tier, created_by
  ) values (
    selected_provider_id, 'gemini-3.5-flash-lite', 'Gemini 3.5 Flash-Lite', 'Gemini 3', 'Google',
    'US', 'stable-2026-07-22', 'restricted', 'restricted', array['text']::text[],
    1048576, 'listed', date '2026-07-22', 'balanced', operator_id
  )
  on conflict (provider_id, provider_model_id, revision) do update set
    display_name = excluded.display_name,
    max_context_tokens = excluded.max_context_tokens,
    listing_state = excluded.listing_state,
    released_at = excluded.released_at,
    auto_route_tier = excluded.auto_route_tier,
    updated_at = now()
  returning id into selected_model_id;

  insert into public.io_model_endpoints (
    provider_id, model_id, capacity_source_id, endpoint_key, capacity_mode,
    routing_state, member_visible, retention_class, created_by
  ) values (
    selected_provider_id, selected_model_id, partner_capacity_id, 'gemini-3-5-flash-lite', 'direct_api',
    'conformance', true, 'unknown', operator_id
  )
  on conflict (provider_id, endpoint_key) do update set
    model_id = excluded.model_id,
    capacity_source_id = excluded.capacity_source_id,
    routing_state = excluded.routing_state,
    member_visible = excluded.member_visible,
    updated_at = now()
  returning id into selected_endpoint_id;

  insert into private.io_endpoint_connections (
    endpoint_id, connection_mode, endpoint_base_url, secret_reference, connection_state
  ) values (
    selected_endpoint_id, 'server_secret', 'https://generativelanguage.googleapis.com/v1beta',
    'IO_PROVIDER_GEMINI_API_KEY', 'testing'
  )
  on conflict (endpoint_id) do update set
    endpoint_base_url = excluded.endpoint_base_url,
    secret_reference = excluded.secret_reference,
    connection_state = excluded.connection_state,
    updated_at = now();

  insert into public.io_endpoint_capability_versions (
    endpoint_id, version, verification_state, evidence_url, verified_by
  ) values (
    selected_endpoint_id, 1, 'draft', 'https://ai.google.dev/gemini-api/docs/models', operator_id
  ) on conflict (endpoint_id, version) do nothing;

  insert into public.io_endpoint_pricing_versions (
    endpoint_id, version, publication_state, member_visible, currency_code,
    billing_meter, unit_quantity, input_price_nanos, output_price_nanos,
    evidence_url, evidence_note, effective_from, recorded_by
  ) values (
    selected_endpoint_id, 1, 'published', true, 'USD', 'tokens', 1000000,
    300000000, 2500000000,
    'https://ai.google.dev/gemini-api/docs/pricing',
    'Paid-tier standard text token price; free, batch, flex and priority tiers are excluded.',
    timestamptz '2026-07-22 00:00:00+00', operator_id
  ) on conflict (endpoint_id, version) do nothing;

  -- DeepSeek direct API.
  insert into public.io_providers (
    provider_key, display_name, provider_kind, integration_style,
    lifecycle_state, catalogue_visibility, operator_name, public_summary,
    data_retention_class, training_use_class, created_by
  ) values (
    'deepseek', 'DeepSeek', 'direct_api', 'openai_compatible',
    'conformance', 'listed', 'DeepSeek',
    'Direct DeepSeek API capacity; staged for I/O conformance before member traffic.',
    'unknown', 'unknown', operator_id
  )
  on conflict (provider_key) do update set
    display_name = excluded.display_name,
    provider_kind = excluded.provider_kind,
    integration_style = excluded.integration_style,
    lifecycle_state = excluded.lifecycle_state,
    catalogue_visibility = excluded.catalogue_visibility,
    operator_name = excluded.operator_name,
    public_summary = excluded.public_summary,
    updated_at = now()
  returning id into selected_provider_id;

  insert into public.io_models (
    provider_id, provider_model_id, display_name, model_family, model_creator,
    origin_country_code, revision, commercial_hosting_rights,
    commercial_redistribution_rights, modalities, max_context_tokens,
    listing_state, released_at, auto_route_tier, created_by
  ) values (
    selected_provider_id, 'deepseek-v4-flash', 'DeepSeek V4 Flash', 'DeepSeek V4', 'DeepSeek',
    'CN', 'DeepSeek-V4-Flash-0731', 'restricted', 'restricted', array['text']::text[],
    1000000, 'listed', date '2026-07-31', 'balanced', operator_id
  )
  on conflict (provider_id, provider_model_id, revision) do update set
    display_name = excluded.display_name,
    max_context_tokens = excluded.max_context_tokens,
    listing_state = excluded.listing_state,
    released_at = excluded.released_at,
    auto_route_tier = excluded.auto_route_tier,
    updated_at = now()
  returning id into selected_model_id;

  insert into public.io_model_endpoints (
    provider_id, model_id, capacity_source_id, endpoint_key, capacity_mode,
    routing_state, member_visible, retention_class, created_by
  ) values (
    selected_provider_id, selected_model_id, partner_capacity_id, 'deepseek-v4-flash', 'direct_api',
    'conformance', true, 'unknown', operator_id
  )
  on conflict (provider_id, endpoint_key) do update set
    model_id = excluded.model_id,
    capacity_source_id = excluded.capacity_source_id,
    routing_state = excluded.routing_state,
    member_visible = excluded.member_visible,
    updated_at = now()
  returning id into selected_endpoint_id;

  insert into private.io_endpoint_connections (
    endpoint_id, connection_mode, endpoint_base_url, secret_reference, connection_state
  ) values (
    selected_endpoint_id, 'server_secret', 'https://api.deepseek.com',
    'IO_PROVIDER_DEEPSEEK_API_KEY', 'testing'
  )
  on conflict (endpoint_id) do update set
    endpoint_base_url = excluded.endpoint_base_url,
    secret_reference = excluded.secret_reference,
    connection_state = excluded.connection_state,
    updated_at = now();

  insert into public.io_endpoint_capability_versions (
    endpoint_id, version, verification_state, evidence_url, verified_by
  ) values (
    selected_endpoint_id, 1, 'draft',
    'https://api-docs.deepseek.com/quick_start/pricing/', operator_id
  ) on conflict (endpoint_id, version) do nothing;

  insert into public.io_endpoint_pricing_versions (
    endpoint_id, version, publication_state, member_visible, currency_code,
    billing_meter, unit_quantity, input_price_nanos, cached_input_price_nanos,
    output_price_nanos, evidence_url, evidence_note, effective_from, recorded_by
  ) values (
    selected_endpoint_id, 1, 'published', true, 'USD', 'tokens', 1000000,
    140000000, 2800000, 280000000,
    'https://api-docs.deepseek.com/quick_start/pricing/',
    'Cache-miss input price is used for route estimates; announced future peak pricing is not yet effective.',
    timestamptz '2026-07-31 00:00:00+00', operator_id
  ) on conflict (endpoint_id, version) do nothing;

  -- GroqCloud route to an open-weight model.
  insert into public.io_providers (
    provider_key, display_name, provider_kind, integration_style,
    lifecycle_state, catalogue_visibility, operator_name, public_summary,
    data_retention_class, training_use_class, created_by
  ) values (
    'groq', 'GroqCloud', 'managed_inference', 'openai_compatible',
    'conformance', 'listed', 'Groq',
    'GroqCloud inference for an open-weight model; staged for I/O conformance before member traffic.',
    'unknown', 'unknown', operator_id
  )
  on conflict (provider_key) do update set
    display_name = excluded.display_name,
    provider_kind = excluded.provider_kind,
    integration_style = excluded.integration_style,
    lifecycle_state = excluded.lifecycle_state,
    catalogue_visibility = excluded.catalogue_visibility,
    operator_name = excluded.operator_name,
    public_summary = excluded.public_summary,
    updated_at = now()
  returning id into selected_provider_id;

  insert into public.io_models (
    provider_id, provider_model_id, display_name, model_family, model_creator,
    origin_country_code, revision, licence_name, licence_evidence_url,
    commercial_hosting_rights, commercial_redistribution_rights, modalities,
    max_context_tokens, listing_state, released_at, auto_route_tier, created_by
  ) values (
    selected_provider_id, 'openai/gpt-oss-20b', 'GPT-OSS 20B on Groq', 'GPT-OSS', 'OpenAI',
    'US', 'groqcloud-2026-08-01', 'Apache-2.0',
    'https://openai.com/index/introducing-gpt-oss/', 'allowed', 'allowed',
    array['text']::text[], 131072, 'listed', date '2025-08-05', 'balanced', operator_id
  )
  on conflict (provider_id, provider_model_id, revision) do update set
    display_name = excluded.display_name,
    max_context_tokens = excluded.max_context_tokens,
    listing_state = excluded.listing_state,
    released_at = excluded.released_at,
    auto_route_tier = excluded.auto_route_tier,
    updated_at = now()
  returning id into selected_model_id;

  insert into public.io_model_endpoints (
    provider_id, model_id, capacity_source_id, endpoint_key, capacity_mode,
    routing_state, member_visible, retention_class, created_by
  ) values (
    selected_provider_id, selected_model_id, partner_capacity_id, 'groq-gpt-oss-20b', 'direct_api',
    'conformance', true, 'unknown', operator_id
  )
  on conflict (provider_id, endpoint_key) do update set
    model_id = excluded.model_id,
    capacity_source_id = excluded.capacity_source_id,
    routing_state = excluded.routing_state,
    member_visible = excluded.member_visible,
    updated_at = now()
  returning id into selected_endpoint_id;

  insert into private.io_endpoint_connections (
    endpoint_id, connection_mode, endpoint_base_url, secret_reference, connection_state
  ) values (
    selected_endpoint_id, 'server_secret', 'https://api.groq.com/openai/v1',
    'IO_PROVIDER_GROQ_API_KEY', 'testing'
  )
  on conflict (endpoint_id) do update set
    endpoint_base_url = excluded.endpoint_base_url,
    secret_reference = excluded.secret_reference,
    connection_state = excluded.connection_state,
    updated_at = now();

  insert into public.io_endpoint_capability_versions (
    endpoint_id, version, verification_state, evidence_url, verified_by
  ) values (
    selected_endpoint_id, 1, 'draft', 'https://console.groq.com/docs/models', operator_id
  ) on conflict (endpoint_id, version) do nothing;

  insert into public.io_endpoint_pricing_versions (
    endpoint_id, version, publication_state, member_visible, currency_code,
    billing_meter, unit_quantity, input_price_nanos, cached_input_price_nanos,
    output_price_nanos, evidence_url, evidence_note, effective_from, recorded_by
  ) values (
    selected_endpoint_id, 1, 'published', true, 'USD', 'tokens', 1000000,
    75000000, 37500000, 300000000,
    'https://groq.com/pricing',
    'On-demand GroqCloud token price for openai/gpt-oss-20b; batch pricing is excluded.',
    timestamptz '2026-08-01 00:00:00+00', operator_id
  ) on conflict (endpoint_id, version) do nothing;
end;
$migration$;
