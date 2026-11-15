create table if not exists shot_import_batches (
  id uuid primary key,
  scene_id uuid not null references scenes(id) on delete cascade,
  source_type text not null,
  source_digest char(64) not null,
  mapping_digest char(64) not null,
  created_at timestamptz not null default now(),
  unique(scene_id, source_type, source_digest)
);

alter table shots add column if not exists source_metadata jsonb not null default '{}'::jsonb;
alter table shots add column if not exists import_batch_id uuid references shot_import_batches(id) on delete set null;
alter table shots add column if not exists source_segment_id text;
create unique index if not exists shots_import_segment_unique
  on shots(import_batch_id, source_segment_id)
  where import_batch_id is not null and source_segment_id is not null;

create table if not exists shot_reference_assets (
  shot_id uuid not null references shots(id) on delete cascade,
  asset_version_id uuid not null references asset_versions(id),
  position integer not null check (position >= 0),
  logical_name text not null,
  media_type text not null check (media_type in ('image','video','audio')),
  role text not null check (role in ('picture','audio','video')),
  primary key(shot_id, position),
  unique(shot_id, asset_version_id)
);

create index if not exists shot_reference_assets_version_idx on shot_reference_assets(asset_version_id);
