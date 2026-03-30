// 반복 업무 CRUD API
// GET    /api/recurring              — 전체 목록
// POST   /api/recurring              — 생성
// PATCH  /api/recurring/:id          — 수정
// DELETE /api/recurring/:id          — 삭제
// PATCH  /api/recurring/:id/toggle   — 활성/비활성 토글
// POST   /api/recurring/auto-generate — 오늘 예정 반복 업무 자동 할일 생성

const express = require('express');
const router  = express.Router();
const pool    = require('../db');

function todayStr() { return new Date().toISOString().slice(0, 10); }

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isScheduledToday(rt, today) {
  if (today < rt.start_date) return false;
  if (rt.end_date && today > rt.end_date) return false;
  const start   = new Date(rt.start_date + 'T00:00:00');
  const now     = new Date(today + 'T00:00:00');
  const diffDays = Math.round((now - start) / 86400000);

  switch (rt.repeat_cycle) {
    case 'daily':         return diffDays >= 0;
    case 'specific_days': {
      if (!rt.repeat_days?.length) return false;
      const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
      return rt.repeat_days.includes(DAYS[now.getDay()]);
    }
    case 'weekly':        return diffDays >= 0 && diffDays % 7  === 0;
    case 'biweekly':      return diffDays >= 0 && diffDays % 14 === 0;
    case 'monthly':       return diffDays >= 0 && now.getDate() === start.getDate();
    case 'halfyearly': {
      if (now.getDate() !== start.getDate()) return false;
      const mDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      return mDiff >= 0 && mDiff % 6 === 0;
    }
    case 'yearly':
      return now.getDate() === start.getDate()
          && now.getMonth() === start.getMonth()
          && now.getFullYear() >= start.getFullYear();
    default: return false;
  }
}

const ROW_TO_JSON = r => ({
  id: r.id, title: r.title, category: r.category_id,
  important: r.important, dueDateOffset: r.due_date_offset,
  repeatCycle: r.repeat_cycle, repeatDays: r.repeat_days,
  startDate: r.start_date?.toISOString?.().slice(0,10) ?? r.start_date,
  endDate:   r.end_date?.toISOString?.().slice(0,10)   ?? r.end_date ?? undefined,
  note: r.note ?? undefined, active: r.active,
  lastGeneratedDate: r.last_generated_date?.toISOString?.().slice(0,10) ?? r.last_generated_date ?? undefined,
});

// GET /api/recurring
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM recurring_tasks ORDER BY created_at ASC');
    res.json(result.rows.map(ROW_TO_JSON));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recurring
router.post('/', async (req, res) => {
  const { title, category, important, dueDateOffset, repeatCycle, repeatDays, startDate, endDate, note } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO recurring_tasks
         (title, category_id, important, due_date_offset, repeat_cycle, repeat_days, start_date, end_date, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title, category, important ?? false, dueDateOffset ?? 0, repeatCycle, repeatDays ?? null, startDate, endDate || null, note || null]
    );
    res.status(201).json(ROW_TO_JSON(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/recurring/:id
router.patch('/:id', async (req, res) => {
  const { title, category, important, dueDateOffset, repeatCycle, repeatDays, startDate, endDate, note } = req.body;
  try {
    const result = await pool.query(
      `UPDATE recurring_tasks SET
         title = COALESCE($1, title), category_id = COALESCE($2, category_id),
         important = COALESCE($3, important), due_date_offset = COALESCE($4, due_date_offset),
         repeat_cycle = COALESCE($5, repeat_cycle), repeat_days = $6,
         start_date = COALESCE($7, start_date), end_date = $8, note = $9
       WHERE id = $10 RETURNING *`,
      [title, category, important, dueDateOffset, repeatCycle, repeatDays ?? null, startDate, endDate || null, note || null, req.params.id]
    );
    res.json(ROW_TO_JSON(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/recurring/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM recurring_tasks WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/recurring/:id/toggle
router.patch('/:id/toggle', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE recurring_tasks SET active = NOT active WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    res.json(ROW_TO_JSON(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recurring/auto-generate — 앱 마운트 시 호출
router.post('/auto-generate', async (req, res) => {
  const today = todayStr();
  const client = await pool.connect();
  const created = [];
  try {
    await client.query('BEGIN');
    const { rows: rtList } = await client.query(
      'SELECT * FROM recurring_tasks WHERE active = true AND (last_generated_date IS NULL OR last_generated_date <> $1)',
      [today]
    );

    for (const rt of rtList) {
      if (!isScheduledToday(rt, today)) continue;
      const dueDate = rt.due_date_offset > 0 ? addDays(today, rt.due_date_offset) : null;
      const { rows } = await client.query(
        `INSERT INTO tasks (title, category_id, important, created_at, due_date, note, repeat_task_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [rt.title, rt.category_id, rt.important, today, dueDate, rt.note, rt.id]
      );
      await client.query(
        'UPDATE recurring_tasks SET last_generated_date = $1 WHERE id = $2',
        [today, rt.id]
      );
      created.push(rows[0].id);
    }

    await client.query('COMMIT');
    res.json({ created: created.length, taskIds: created });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /recurring/auto-generate]', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
