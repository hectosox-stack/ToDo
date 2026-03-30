// [수정] updateTask PUT body에 is_deleted/deleted_at 추가
// [수정] deleteTask: hard DELETE → soft DELETE (PUT is_deleted:true)로 변경
//        → 휴지통(trashedTasks) 이동이 DB에 실제로 반영되도록 수정
// GET    /api/tasks       — 목록 조회
// POST   /api/tasks       — 할일 추가
// PUT    /api/tasks/:id   — 할일 수정 (부분 업데이트)
// DELETE /api/tasks/:id   — 영구 삭제 (휴지통에서만 사용)

import { useState, useEffect } from 'react';
import type { Task } from '../types';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000') + '/api/tasks';

// DB 응답(snake_case) → Task 타입(camelCase) 변환
function toTask(row: Record<string, unknown>): Task {
  return {
    id:           String(row.id),
    title:        (row.title as string) || '',   // null 방어
    category:     (row.category_id ?? row.category ?? '') as string,
    completed:    (row.completed ?? false) as boolean,
    createdAt:    (row.created_at ?? new Date().toISOString()) as string,
    completedAt:  row.completed_at as string | undefined,
    dueDate:      row.due_date as string | undefined,
    note:         row.note as string | undefined,
    important:    (row.important ?? false) as boolean,
    repeatTaskId: row.repeat_task_id as string | undefined,
    subtasks:     (row.subtasks ?? []) as Task['subtasks'],
    isDeleted:    (row.is_deleted ?? false) as boolean,
    deletedAt:    row.deleted_at as string | undefined,
  };
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [trashedTasks, setTrashedTasks] = useState<Task[]>([]);

  // 마운트 시 자동 조회
  useEffect(() => {
    fetchTasks();
  }, []);

  // GET /api/tasks — 전체 조회
  async function fetchTasks() {
    try {
      const res = await fetch(API_URL);
      const data: Record<string, unknown>[] = await res.json();
      const all = data.map(toTask);
      setTasks(all.filter(t => !t.isDeleted));
      setTrashedTasks(all.filter(t => t.isDeleted));
    } catch (err) {
      console.error('[fetchTasks]', err);
    }
  }

  // POST /api/tasks — 할일 추가
  function addTask(task: Omit<Task, 'id' | 'completed'> & { createdAt?: string }): void {
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:          task.title,
        note:           task.note ?? null,
        category:       task.category,
        important:      task.important ?? false,
        due_date:       task.dueDate ?? null,
        created_at:     task.createdAt ?? new Date().toISOString(),
        repeat_task_id: task.repeatTaskId ?? null,
      }),
    })
      .then(res => res.json())
      .then(row => setTasks(prev => [toTask(row), ...prev]))
      .catch(err => console.error('[addTask]', err));
  }

  // PUT /api/tasks/:id — 부분 수정
  // body에 undefined 값은 JSON.stringify 시 누락되어 백엔드에서 무시됨
  // → title 등 기존 값이 NULL로 덮어씌워지지 않음
  function updateTask(id: string, changes: Partial<Omit<Task, 'id'>>): void {
    fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:          changes.title,
        note:           changes.note,
        completed:      changes.completed,
        important:      changes.important,
        due_date:       changes.dueDate,
        completed_at:   changes.completedAt,
        subtasks:       changes.subtasks,
        is_deleted:     changes.isDeleted,
        deleted_at:     changes.deletedAt,
      }),
    })
      .then(res => res.json())
      .then(row => {
        const updated = toTask(row);
        if (updated.isDeleted) {
          setTasks(prev => prev.filter(t => t.id !== id));
          setTrashedTasks(prev => prev.map(t => t.id === id ? updated : t));
        } else {
          setTasks(prev => prev.map(t => t.id === id ? updated : t));
        }
      })
      .catch(err => console.error('[updateTask]', err));
  }

  // 소프트 삭제 — PUT is_deleted:true → 휴지통 이동
  // [수정] 이전: DELETE(영구삭제) → 현재: PUT(is_deleted=true)로 변경
  function deleteTask(id: string): void {
    const task = tasks.find(t => t.id === id);
    const now = new Date().toISOString();
    fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_deleted: true, deleted_at: now }),
    })
      .then(() => {
        setTasks(prev => prev.filter(t => t.id !== id));
        if (task) {
          setTrashedTasks(prev => [
            { ...task, isDeleted: true, deletedAt: now },
            ...prev,
          ]);
        }
      })
      .catch(err => console.error('[deleteTask]', err));
  }

  // 완료 토글 → PUT
  function toggleComplete(id: string): void {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const completed = !task.completed;
    updateTask(id, {
      completed,
      completedAt: completed ? new Date().toISOString() : undefined,
      subtasks: task.subtasks?.map(s => ({ ...s, completed })),
    });
  }

  // 서브태스크 완료 토글 → PUT
  function toggleSubtask(taskId: string, subtaskId: string): void {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const updatedSubtasks = (task.subtasks ?? []).map(s => {
      if (s.id !== subtaskId) return s;
      const completed = !s.completed;
      return { ...s, completed, dueDate: completed ? new Date().toISOString().slice(0, 10) : undefined };
    });
    const allDone = updatedSubtasks.length > 0 && updatedSubtasks.every(s => s.completed);
    updateTask(taskId, {
      subtasks: updatedSubtasks,
      completed: allDone,
      completedAt: allDone && !task.completed ? new Date().toISOString() : undefined,
    });
  }

  // 완료 항목 일괄 삭제 (소프트 삭제)
  function clearCompleted(): void {
    tasks.filter(t => t.completed).forEach(t => deleteTask(t.id));
  }

  // 휴지통 복원 → PUT is_deleted:false
  function restoreTask(id: string): void {
    const task = trashedTasks.find(t => t.id === id);
    if (!task) return;
    fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_deleted: false, deleted_at: null }),
    })
      .then(() => {
        setTrashedTasks(prev => prev.filter(t => t.id !== id));
        setTasks(prev => [{ ...task, isDeleted: false, deletedAt: undefined }, ...prev]);
      })
      .catch(err => console.error('[restoreTask]', err));
  }

  // 영구 삭제 → DELETE
  function permanentDeleteTask(id: string): void {
    fetch(`${API_URL}/${id}`, { method: 'DELETE' })
      .then(() => setTrashedTasks(prev => prev.filter(t => t.id !== id)))
      .catch(err => console.error('[permanentDeleteTask]', err));
  }

  // 휴지통 전체 영구 삭제
  function clearTrash(): void {
    Promise.all(trashedTasks.map(t =>
      fetch(`${API_URL}/${t.id}`, { method: 'DELETE' })
    )).then(() => setTrashedTasks([]));
  }

  return {
    tasks,
    trashedTasks,
    addTask,
    updateTask,
    deleteTask,
    restoreTask,
    permanentDeleteTask,
    clearTrash,
    toggleComplete,
    toggleSubtask,
    clearCompleted,
  };
}
