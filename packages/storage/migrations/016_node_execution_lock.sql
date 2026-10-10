create unique index if not exists one_active_attempt_per_node
  on attempts(node_id) where node_id is not null and state in ('leased','running','unknown');
