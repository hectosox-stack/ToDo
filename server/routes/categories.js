// 카테고리 CRUD API
// GET    /api/categories       — 전체 목록
// POST   /api/categories       — 생성
// PATCH  /api/categories/:id   — 수정
// DELETE /api/categories/:id   — 삭제 (사용 중 카테고리 삭제 방지)

const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, label, color_key AS "colorKey" FROM categories ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categories
router.post('/', async (req, res) => {
  const { id, label, colorKey } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO categories (id, label, color_key) VALUES ($1, $2, $3) RETURNING id, label, color_key AS "colorKey"',
      [id || `cat-${Date.now()}`, label, colorKey]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/categories/:id
router.patch('/:id', async (req, res) => {
  const { label, colorKey } = req.body;
  try {
    const result = await pool.query(
      'UPDATE categories SET label = COALESCE($1, label), color_key = COALESCE($2, color_key) WHERE id = $3 RETURNING id, label, color_key AS "colorKey"',
      [label ?? null, colorKey ?? null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    // 사용 중인 카테고리는 삭제 방지
    const inUse = await pool.query('SELECT 1 FROM tasks WHERE category_id = $1 AND is_deleted = false LIMIT 1', [req.params.id]);
    if (inUse.rows.length > 0) {
      return res.status(409).json({ error: '사용 중인 카테고리는 삭제할 수 없습니다' });
    }
    await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
