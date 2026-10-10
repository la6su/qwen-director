alter table attempts add column if not exists error_detail text;
alter table attempts add column if not exists error_at timestamptz;
