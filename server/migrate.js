// 스키마 마이그레이션 — 수동 실행용
// 사용법: node server/migrate.js

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const pool = require('./db');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('[DB] 마이그레이션 완료');
  } catch (err) {
    console.error('[DB] 마이그레이션 실패:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
