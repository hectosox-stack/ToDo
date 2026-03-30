// [수정] 부분 업데이트(partial update) 적용
// 이전 코드: PUT 시 title/note/completed 고정 3개 필드만 UPDATE →
//   subtasks만 전송하면 title=NULL로 덮어씌워지는 버그 발생
// 수정 후: 요청 body에 포함된 필드만 SET 절에 포함 → 누락 필드 보존

const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// ── GET / — 전체 조회 (is_deleted 포함, 프론트에서 필터링)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[tasks GET]', err);
    res.status(500).json({ error: '조회 실패' });
  }
});

// ── POST / — 할일 생성
// [수정 1] subtasks 컬럼 추가 — 새 할일 저장 시 세부 항목 함께 저장
router.post('/', async (req, res) => {
  const {
    title, note, category, important,
    due_date, created_at, repeat_task_id, subtasks,
  } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO tasks
         (title, note, category, important, due_date, created_at, repeat_task_id, subtasks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        title,
        note           ?? null,
        category       ?? null,
        important      ?? false,
        due_date       ?? null,
        created_at     ?? null,
        repeat_task_id ?? null,
        JSON.stringify(subtasks ?? []),
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[tasks POST]', err);
    res.status(500).json({ error: '생성 실패' });
  }
});

// ── PUT /:id — 부분 수정
// body에 포함된 키만 UPDATE — undefined 키는 건드리지 않아 기존 값 보존
router.put('/:id', async (req, res) => {
  const { id } = req.params;

  // body 키 → DB 컬럼 매핑
  const colMap = {
    title:          'title',
    note:           'note',
    completed:      'completed',
    completed_at:   'completed_at',
    due_date:       'due_date',
    important:      'important',
    category:       'category',
    repeat_task_id: 'repeat_task_id',
    subtasks:       'subtasks',
    is_deleted:     'is_deleted',
    deleted_at:     'deleted_at',
  };

  const setClauses = [];
  const values     = [];
  let   paramIdx   = 1;

  for (const [bodyKey, col] of Object.entries(colMap)) {
    if (req.body[bodyKey] !== undefined) {
      setClauses.push(`${col} = $${paramIdx++}`);
      // JSONB 컬럼(subtasks)은 문자열로 직렬화
      values.push(
        bodyKey === 'subtasks'
          ? JSON.stringify(req.body[bodyKey])
          : req.body[bodyKey]
      );
    }
  }

  if (setClauses.length === 0) {
    // 업데이트할 필드 없음 → 현재 행 반환
    try {
      const result = await pool.query('SELECT * FROM tasks WHERE id=$1', [id]);
      return res.json(result.rows[0] ?? {});
    } catch (err) {
      return res.status(500).json({ error: '조회 실패' });
    }
  }

  values.push(id);
  const sql = `UPDATE tasks SET ${setClauses.join(', ')} WHERE id=$${paramIdx} RETURNING *`;

  try {
    const result = await pool.query(sql, values);
    if (result.rows.length === 0) return res.status(404).json({ error: '항목 없음' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[tasks PUT]', err);
    res.status(500).json({ error: '수정 실패' });
  }
});

// ── DELETE /:id — 영구 삭제 (휴지통에서 완전 삭제 시 사용)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM tasks WHERE id=$1', [id]);
    res.json({ message: '삭제 완료' });
  } catch (err) {
    console.error('[tasks DELETE]', err);
    res.status(500).json({ error: '삭제 실패' });
  }
});

module.exports = router;
