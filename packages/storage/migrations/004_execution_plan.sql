alter table jobs add column if not exists adapter_id text;
alter table jobs add column if not exists plan_json jsonb not null default '{}'::jsonb;
create index if not exists jobs_adapter_idx on jobs(adapter_id) where adapter_id is not null;
