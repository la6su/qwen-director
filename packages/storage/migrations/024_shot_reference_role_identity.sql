alter table shot_reference_assets
  drop constraint if exists shot_reference_assets_shot_id_asset_version_id_key;

create unique index if not exists shot_reference_assets_shot_asset_role_unique
  on shot_reference_assets(shot_id, asset_version_id, role);
