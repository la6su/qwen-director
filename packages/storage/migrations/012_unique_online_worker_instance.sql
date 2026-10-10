create unique index if not exists one_online_worker_instance
  on nodes(instance_id) where status='online';
