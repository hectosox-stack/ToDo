const express = require('express');
const router = express.Router();
const pool = require('../db');

// 전체 조회
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '조회 실패' });
  }
});

// 생성
router.post('/', async (req, res) => {
  const { title, note } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO tasks (title, note) VALUES ($1, $2) RETURNING *',
      [title, note]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '생성 실패' });
  }
});

// 수정
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, note, completed } = req.body;
  try {
    const result = await pool.query(
      'UPDATE tasks SET title=$1, note=$2, completed=$3 WHERE id=$4 RETURNING *',
      [title, note, completed, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '수정 실패' });
  }
});

// 삭제
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM tasks WHERE id=$1', [id]);
    res.json({ message: '삭제 완료' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '삭제 실패' });
  }
});

module.exports = router;
