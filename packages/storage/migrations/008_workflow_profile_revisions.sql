create table if not exists workflow_profile_revisions (
  profile_id text not null references workflow_profiles(id),
  revision integer not null,
  graph jsonb not null,
  graph_hash char(64) not null,
  boundary jsonb not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, revision)
);
insert into workflow_profile_revisions(profile_id,revision,graph,graph_hash,boundary)
select id,1,graph,graph_hash,boundary from workflow_profiles p
where not exists (select 1 from workflow_profile_revisions r where r.profile_id=p.id);
