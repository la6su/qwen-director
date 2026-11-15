alter table shot_reference_assets
  drop constraint if exists shot_reference_assets_role_check;

alter table shot_reference_assets
  add constraint shot_reference_assets_role_check
  check (
    role in ('picture','actor','set','prop','layout','first-frame','last-frame','audio','video')
    and (role not in ('first-frame','last-frame') or media_type = 'image')
  );
