-- Паттерн claim: будущий repository должен выполнять в одной короткой транзакции.
-- Не запускать вручную поверх рабочей БД до появления migration runner.
-- 1) выбрать queued job и заблокировать строку;
-- 2) проверить approval/plan hash и capabilities;
-- 3) создать attempt с новым fencing token;
-- 4) перевести job в leased и зафиксировать lease.
-- Пример SQL-скелета:
-- begin;
-- select id from jobs where state = 'queued' order by created_at for update skip locked limit 1;
-- select id from nodes where id = $node and status = 'online' for update;
-- insert into attempts (...) values (..., next_fencing_token, ...);
-- update jobs set state = 'leased' where id = $job and state = 'queued';
-- commit;

create index if not exists approvals_job_hash_idx on approvals(job_id, plan_hash);
