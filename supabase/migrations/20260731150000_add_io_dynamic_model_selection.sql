-- Dynamic I/O default model selection metadata.
--
-- A model ID must never become a permanent environment-variable default. The
-- router selects only reviewed, active catalogue records, using their release
-- date, verified chat capability and current immutable price cards. These
-- fields are deliberately operator-reviewed metadata, not an attempt to infer
-- quality or commercial terms from a provider model name.

alter table public.io_models
  add column released_at date,
  add column auto_route_tier text not null default 'manual_only';

alter table public.io_models
  add constraint io_models_auto_route_tier_check check (
    auto_route_tier in ('manual_only', 'economy', 'balanced', 'premium')
  );

comment on column public.io_models.released_at is
  'Provider-published release date for this exact model revision. Required for an automatic latest-affordable route.';

comment on column public.io_models.auto_route_tier is
  'Operator-reviewed eligibility tier for automatic model selection. manual_only models can be pinned but are never selected automatically.';

create index io_models_auto_route_selection_idx
  on public.io_models (provider_id, auto_route_tier, released_at desc)
  where listing_state = 'listed';
