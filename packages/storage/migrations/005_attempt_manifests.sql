-- Immutable execution evidence. Blob promotion remains a separate storage transaction.
create table if not exists attempt_manifests (
  attempt_id uuid primary key references attempts(id),
  manifest_hash char(64) not null,
  manifest jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists attempt_manifests_hash_idx on attempt_manifests(manifest_hash);
