alter table jobs add column if not exists origin text not null default 'user';
alter table jobs add constraint jobs_origin_check check (origin in ('user','lab','system'));
