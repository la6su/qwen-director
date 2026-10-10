alter table shots add column if not exists director_prompt jsonb not null default '{}'::jsonb;
alter table shots add column if not exists prompt_revision integer not null default 1;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='shots_prompt_revision_positive' and conrelid='shots'::regclass) then
    alter table shots add constraint shots_prompt_revision_positive check (prompt_revision > 0);
  end if;
end $$;
