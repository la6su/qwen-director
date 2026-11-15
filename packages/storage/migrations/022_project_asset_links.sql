create table if not exists project_assets (
  project_id uuid not null references projects(id) on delete cascade,
  asset_version_id uuid not null references asset_versions(id),
  role text not null check (role in ('master_audio','reference','source_video','deliverable')),
  logical_name text not null,
  linked_by text not null,
  linked_at timestamptz not null default now(),
  primary key (project_id, asset_version_id)
);

create index if not exists project_assets_version_idx on project_assets(asset_version_id);
