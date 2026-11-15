create table if not exists director_agent_sessions (
  id uuid primary key,
  project_id uuid references projects(id) on delete set null,
  turns jsonb not null default '[]'::jsonb,
  version integer not null default 0 check (version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(turns) = 'array')
);

create index if not exists director_agent_sessions_updated_idx on director_agent_sessions(updated_at desc);
