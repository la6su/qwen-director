create table if not exists attempt_assets (
  attempt_id uuid not null references attempts(id),
  asset_version_id uuid not null references asset_versions(id),
  logical_name text not null,
  created_at timestamptz not null default now(),
  primary key (attempt_id, logical_name),
  unique (attempt_id, asset_version_id)
);
