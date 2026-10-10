-- Historical ComfyUI SaveVideo outputs were briefly stored with an image MIME.
-- The immutable logical filename is the authoritative media-kind signal here;
-- only output names with an unambiguous video extension are repaired.
update asset_versions av
set mime_type = case
  when lower(aa.logical_name) ~ '\\.(mp4|webm|mov|mkv)$' then
    case lower(split_part(aa.logical_name, '.', array_length(string_to_array(aa.logical_name, '.'), 1)))
      when 'webm' then 'video/webm'
      when 'mov' then 'video/quicktime'
      when 'mkv' then 'video/x-matroska'
      else 'video/mp4'
    end
  else av.mime_type
end
from attempt_assets aa
where aa.asset_version_id = av.id
  and lower(aa.logical_name) ~ '\\.(mp4|webm|mov|mkv)$'
  and av.mime_type not like 'video/%';
