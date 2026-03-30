// Express API 서버 진입점
// Railway 배포 기준 — DATABASE_URL 환경변수로 PostgreSQL 연결
// 프론트엔드(Vite, port 5173)와 분리 운영

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const pool       = require('./db');
const tasksRouter     = require('./routes/tasks');
const categoriesRoute = require('./routes/categories');
const recurringRoute  = require('./routes/recurring');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── 미들웨어 ──────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-app.onrender.com' // Render 배포 후 실제 도메인으로 교체
  ]
}));
app.use(express.json());

// ── 헬스체크 ─────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));

// ── DB 자동 마이그레이션 (스키마 초기화) ─────────────────
async function migrate() {
  const fs   = require('fs');
  const path = require('path');
  const sql  = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('[DB] 스키마 마이그레이션 완료');
  } catch (err) {
    console.error('[DB] 마이그레이션 실패:', err.message);
  }
}

// ── 라우터 ────────────────────────────────────────────────
app.use('/api/tasks',      tasksRouter);
app.use('/api/categories', categoriesRoute);
app.use('/api/recurring',  recurringRoute);

// ── 에러 핸들러 ───────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: '서버 오류가 발생했습니다' });
});

// ── 서버 시작 ────────────────────────────────────────────
migrate().then(() => {
  app.listen(PORT, () => {
    console.log(`[Server] http://localhost:${PORT} 에서 실행 중`);
  });
});
