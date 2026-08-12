#!/usr/bin/env bash

# Build an ephemeral Supabase migration view from the hosted ledger, then layer
# only the reviewed forward I/O migrations on top. This avoids changing the
# historic local/hosted timestamp aliases that are documented in
# docs/SUPABASE_SCHEMA_RECONCILIATION.md.
#
# Default mode is read-only: it fetches remote migration SQL into a temporary
# directory and runs `db push --dry-run`. Passing --apply repeats the same
# checked view with a real `db push`; it never runs migration repair, seeds, or
# a reset.

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
supabase_bin="$repo_root/node_modules/.bin/supabase"
release_tmp_dir=""
apply_release=false
keep_release_view=false

forward_migrations=(
  "20260810002754_create_io_operational_core.sql"
  "20260810010415_create_io_terminal_session_foundation.sql"
  "20260812000100_add_io_terminal_timeline_and_approval_rpcs.sql"
)

usage() {
  cat <<'USAGE'
Usage: scripts/supabase/prepare-alias-safe-io-release.sh [--apply] [--keep]

Creates a temporary migration directory by fetching the exact hosted ledger,
adds only the three reviewed forward I/O migrations, and prints a dry-run plan.

  --apply  Apply the exact reviewed temporary view after a successful dry run.
  --keep   Keep the temporary view and print its path for manual inspection.

This command never runs migration repair, seeds, or database reset.
USAGE
}

cleanup() {
  if [[ -n "$release_tmp_dir" && "$keep_release_view" != true ]]; then
    rm -rf "$release_tmp_dir"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply)
      apply_release=true
      ;;
    --keep)
      keep_release_view=true
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

if [[ ! -x "$supabase_bin" ]]; then
  printf 'Supabase CLI is not installed at %s\n' "$supabase_bin" >&2
  exit 1
fi

for migration_name in "${forward_migrations[@]}"; do
  if [[ ! -f "$repo_root/supabase/migrations/$migration_name" ]]; then
    printf 'Required forward migration is missing: %s\n' "$migration_name" >&2
    exit 1
  fi
done

release_tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/indus-orbit-io-release.XXXXXX")"
trap cleanup EXIT

mkdir -p "$release_tmp_dir/supabase/.temp"
cp "$repo_root/supabase/config.toml" "$release_tmp_dir/supabase/config.toml"
cp "$repo_root/supabase/.temp/project-ref" "$release_tmp_dir/supabase/.temp/project-ref"

printf 'Fetching the exact hosted migration ledger into: %s\n' "$release_tmp_dir"
SUPABASE_TELEMETRY_DISABLED=1 "$supabase_bin" migration fetch --linked \
  --workdir "$release_tmp_dir" --agent no

for migration_name in "${forward_migrations[@]}"; do
  cp "$repo_root/supabase/migrations/$migration_name" \
    "$release_tmp_dir/supabase/migrations/$migration_name"
done

printf '\nDry-run: only these three forward I/O migrations may appear below:\n'
SUPABASE_TELEMETRY_DISABLED=1 "$supabase_bin" db push --linked --dry-run \
  --workdir "$release_tmp_dir" --agent no

if [[ "$apply_release" == true ]]; then
  printf '\nApplying the reviewed forward I/O migrations from the temporary view...\n'
  SUPABASE_TELEMETRY_DISABLED=1 "$supabase_bin" db push --linked \
    --workdir "$release_tmp_dir" --agent no --yes
fi

if [[ "$keep_release_view" == true ]]; then
  printf '\nTemporary release view retained at: %s\n' "$release_tmp_dir"
fi
