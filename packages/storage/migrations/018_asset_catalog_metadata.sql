alter table asset_versions add column if not exists asset_kind text not null default 'reference';
alter table asset_versions add column if not exists tags jsonb not null default '[]'::jsonb;
alter table asset_versions add constraint asset_versions_kind_check check (asset_kind in ('actor','scene','prop','audio','layout','reference','video','other'));
