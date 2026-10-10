alter table jobs add column if not exists required_capabilities jsonb not null default '{}'::jsonb;
create index if not exists jobs_required_capabilities_idx on jobs using gin(required_capabilities);
