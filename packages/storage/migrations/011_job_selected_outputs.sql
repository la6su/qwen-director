create table if not exists job_selected_outputs (
  job_id uuid primary key references jobs(id),
  asset_version_id uuid not null references asset_versions(id),
  selected_by text not null,
  selected_at timestamptz not null default now()
);
