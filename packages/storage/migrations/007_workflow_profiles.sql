create table if not exists workflow_profiles (
  id text primary key,
  name text not null,
  graph jsonb not null,
  graph_hash char(64) not null,
  boundary jsonb not null,
  created_at timestamptz not null default now(),
  active boolean not null default true
);
