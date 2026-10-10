alter table shots add column if not exists duration_seconds numeric(10,3);
update shots set duration_seconds=5 where duration_seconds is null;
alter table shots alter column duration_seconds set default 5;
alter table shots alter column duration_seconds set not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='shots_duration_positive' and conrelid='shots'::regclass) then
    alter table shots add constraint shots_duration_positive check (duration_seconds > 0);
  end if;
end $$;
