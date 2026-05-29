CREATE TABLE votes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  work_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, work_id)
);
