-- QwenDirector schema v1. PostgreSQL 15+; применяет будущий migration runner.
create table if not exists projects (
  id uuid primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists scenes (
  id uuid primary key,
  project_id uuid not null references projects(id),
  title text not null,
  position integer not null,
  unique(project_id, position)
);

create table if not exists shots (
  id uuid primary key,
  scene_id uuid not null references scenes(id),
  title text not null,
  position integer not null,
  plan_revision integer not null default 1,
  unique(scene_id, position)
);

create table if not exists approvals (
  id uuid primary key,
  job_id uuid not null,
  plan_hash text not null,
  approved_by text not null,
  approved_at timestamptz not null default now(),
  retry_budget integer not null check (retry_budget >= 0)
);

create table if not exists jobs (
  id uuid primary key,
  shot_id uuid not null references shots(id),
  state text not null check (state in ('draft','awaiting_approval','queued','leased','running','cancel_requested','reconciling','succeeded','failed','cancelled','needs_attention')),
  plan_hash text not null,
  idempotency_key text not null,
  request_hash text not null,
  required_capabilities jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  cancel_requested_at timestamptz,
  unique(shot_id, idempotency_key)
);

create table if not exists nodes (
  id uuid primary key,
  instance_id text not null,
  capabilities jsonb not null,
  status text not null check (status in ('online','stale','quarantined')),
  heartbeat_at timestamptz not null,
  unique(id, instance_id)
);

create table if not exists attempts (
  id uuid primary key,
  job_id uuid not null references jobs(id),
  node_id uuid references nodes(id),
  fencing_token bigint not null,
  attempt_key text not null unique,
  external_run_id text,
  state text not null check (state in ('leased','running','succeeded','failed','cancelled','unknown')),
  lease_expires_at timestamptz,
  heartbeat_seq bigint not null default 0,
  created_at timestamptz not null default now(),
  unique(job_id, fencing_token)
);

create unique index if not exists one_active_attempt_per_job
  on attempts(job_id) where state in ('leased','running','unknown');

create table if not exists asset_versions (
  id uuid primary key,
  sha256 char(64) not null unique,
  byte_size bigint not null check (byte_size >= 0),
  mime_type text not null,
  storage_key text not null unique,
  provenance jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists jobs_queue_idx on jobs(state, created_at);
create index if not exists attempts_lease_idx on attempts(lease_expires_at) where state in ('leased','running');
