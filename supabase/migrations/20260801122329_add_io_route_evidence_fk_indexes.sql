-- Cover route-evidence foreign keys used by operator history and reconciliation.

create index io_provider_attempts_provider_time_idx
  on public.io_provider_attempts (provider_id, started_at desc);

create index io_provider_attempts_model_time_idx
  on public.io_provider_attempts (model_id, started_at desc);

create index io_provider_attempts_endpoint_time_idx
  on public.io_provider_attempts (endpoint_id, started_at desc);

create index io_route_receipts_capacity_time_idx
  on public.io_route_receipts (selected_capacity_source_id, created_at desc);

create index io_route_receipts_endpoint_time_idx
  on public.io_route_receipts (selected_endpoint_id, created_at desc);

create index io_route_receipts_model_time_idx
  on public.io_route_receipts (selected_model_id, created_at desc);

create index io_route_receipts_provider_time_idx
  on public.io_route_receipts (selected_provider_id, created_at desc);
