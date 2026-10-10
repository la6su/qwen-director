alter table workflow_profiles add column if not exists reference_bindings jsonb not null default '{}'::jsonb;
alter table workflow_profile_revisions add column if not exists reference_bindings jsonb not null default '{}'::jsonb;
