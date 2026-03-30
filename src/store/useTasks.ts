// localStorage → REST API 전환
// GET    /api/tasks       — 목록 조회
// POST   /api/tasks       — 할일 추가
// PUT    /api/tasks/:id   — 할일 수정
// DELETE /api/tasks/:id   — 할일 삭제

import { useState, useEffect } from 'react';
import type { Task } from '../types';

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000') + '/api/tasks';

// DB 응답(snake_case) → Task 타입(camelCase) 변환
function toTask(row: Record<string, unknown>): Task {
  return {
    id:           String(row.id),
    title:        row.title as string,
    category:     (row.category_id ?? row.category ?? '') as string,
    completed:    (row.completed ?? false) as boolean,
    createdAt:    (row.created_at ?? new Date().toISOString()) as string,
    completedAt:  row.completed_at as string | undefined,
    dueDate:      row.due_date as string | undefined,
    note:         row.note as string | undefined,
    important:    row.important as boolean | undefined,
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

  // PUT /api/tasks/:id — 할일 수정
  function updateTask(id: string, changes: Partial<Omit<Task, 'id'>>): void {
    fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:        changes.title,
        note:         changes.note,
        completed:    changes.completed,
        important:    changes.important,
        due_date:     changes.dueDate,
        completed_at: changes.completedAt,
        subtasks:     changes.subtasks,
      }),
    })
      .then(res => res.json())
      .then(row => setTasks(prev => prev.map(t => t.id === id ? toTask(row) : t)))
      .catch(err => console.error('[updateTask]', err));
  }

  // DELETE /api/tasks/:id — 할일 삭제
  function deleteTask(id: string): void {
    fetch(`${API_URL}/${id}`, { method: 'DELETE' })
      .then(() => setTasks(prev => prev.filter(t => t.id !== id)))
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

  // 완료 항목 일괄 삭제
  function clearCompleted(): void {
    tasks.filter(t => t.completed).forEach(t => deleteTask(t.id));
  }

  // 휴지통 기능 (라우터 미구현 시 로컬 상태만 처리)
  function restoreTask(id: string): void {
    const task = trashedTasks.find(t => t.id === id);
    if (!task) return;
    updateTask(id, { isDeleted: false, deletedAt: undefined });
    setTrashedTasks(prev => prev.filter(t => t.id !== id));
    setTasks(prev => [{ ...task, isDeleted: false }, ...prev]);
  }

  function permanentDeleteTask(id: string): void {
    fetch(`${API_URL}/${id}`, { method: 'DELETE' })
      .then(() => setTrashedTasks(prev => prev.filter(t => t.id !== id)))
      .catch(err => console.error('[permanentDeleteTask]', err));
  }

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
