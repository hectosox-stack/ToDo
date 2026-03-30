-- tasks 테이블 초기 생성
CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  note        TEXT,
  completed   BOOLEAN DEFAULT false,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- [마이그레이션] 누락 컬럼 추가 — 이미 존재하면 무시 (PostgreSQL 9.6+)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at   TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date       DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS important      BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category       VARCHAR(100) DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS repeat_task_id VARCHAR(100);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subtasks       JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_deleted     BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at     TIMESTAMP;
