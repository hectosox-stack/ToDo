// [수정 1] addTask POST body에 subtasks 포함 → 새 할일 저장 시 세부 항목 즉시 표시
// [수정 2-1] Optimistic Update: API 응답 전 즉시 UI 반영, 실패 시 롤백
// [수정 2-2] useCallback + useRef로 stable callback 생성
//            → React.memo(TaskItem) 리렌더 방지 (함수 props 레퍼런스 안정화)
// [수정 2-3] loading state 추가 → 최초 로드 스켈레톤 UI 지원

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Task } from '../types';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000') + '/api/tasks';

// DB row(snake_case) → Task(camelCase)
function toTask(row: Record<string, unknown>): Task {
  return {
    id:           String(row.id),
    title:        (row.title as string) || '',
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
  const [loading, setLoading] = useState(true);

  // [수정 2-2] Ref: stable callback이 최신 state를 읽기 위한 참조
  // 함수 내부에서 tasks를 dependency로 사용하지 않고도 최신값 접근 가능
  const tasksRef   = useRef<Task[]>([]);
  const trashedRef = useRef<Task[]>([]);
  tasksRef.current   = tasks;
  trashedRef.current = trashedTasks;

  // ── 전체 조회 — stable (no dependencies)
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(API_URL);
      const data = (await res.json()) as Record<string, unknown>[];
      const all  = data.map(toTask);
      setTasks(all.filter(t => !t.isDeleted));
      setTrashedTasks(all.filter(t => t.isDeleted));
    } catch (err) {
      console.error('[fetchTasks]', err);
    } finally {
      setLoading(false);
    }
  }, []); // 의존성 없음 → 마운트 후 레퍼런스 불변

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // ── 할일 추가 — Optimistic Update
  // [수정 1] subtasks 포함, 임시 ID로 즉시 리스트 표시 → 서버 응답 후 교체
  const addTask = useCallback((task: Omit<Task, 'id' | 'completed'> & { createdAt?: string }): void => {
    const tempId = `temp-${Date.now()}`;
    const now    = task.createdAt ?? new Date().toISOString();

    // 1. 즉시 리스트 추가 (세부 항목 포함)
    const optimistic: Task = {
      id:          tempId,
      title:       task.title,
      category:    task.category,
      completed:   false,
      createdAt:   now,
      dueDate:     task.dueDate,
      note:        task.note,
      important:   task.important ?? false,
      subtasks:    task.subtasks ?? [],
      isDeleted:   false,
      repeatTaskId: task.repeatTaskId,
    };
    setTasks(prev => [optimistic, ...prev]);

    // 2. API 저장 (subtasks 포함)
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:          task.title,
        note:           task.note ?? null,
        category:       task.category,
        important:      task.important ?? false,
        due_date:       task.dueDate ?? null,
        created_at:     now,
        repeat_task_id: task.repeatTaskId ?? null,
        subtasks:       task.subtasks ?? [],   // [수정 1] 세부 항목 포함
      }),
    })
      .then(res => res.json())
      .then(row => {
        // 임시 항목 → 서버 확정 데이터로 교체
        setTasks(prev => prev.map(t => t.id === tempId ? toTask(row) : t));
      })
      .catch(err => {
        console.error('[addTask]', err);
        setTasks(prev => prev.filter(t => t.id !== tempId)); // 롤백
      });
  }, []); // stable

  // ── 할일 수정 — Optimistic Update
  // [수정 2-1] API 응답 전 즉시 UI 반영, 서버 응답 후 최종 동기화
  const updateTask = useCallback((id: string, changes: Partial<Omit<Task, 'id'>>): void => {
    // 1. 즉시 로컬 state 업데이트
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t));

    // 2. API 전송
    fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:        changes.title,
        note:         changes.note,
        completed:    changes.completed,
        important:    changes.important,
        due_date:     changes.dueDate,
        // completed_at: false로 바뀔 때 null 전송하여 DB 클리어
        completed_at: Object.hasOwn(changes, 'completedAt')
          ? (changes.completedAt ?? null)
          : undefined,
        subtasks:     changes.subtasks,
        is_deleted:   changes.isDeleted,
        deleted_at:   changes.deletedAt,
      }),
    })
      .then(res => res.json())
      .then(row => {
        const updated = toTask(row);
        if (updated.isDeleted) {
          setTasks(prev => prev.filter(t => t.id !== id));
          setTrashedTasks(prev => prev.map(t => t.id === id ? updated : t));
        } else {
          // 서버 응답으로 최종 동기화 (ID 등 서버 생성 값 반영)
          setTasks(prev => prev.map(t => t.id === id ? updated : t));
        }
      })
      .catch(err => {
        console.error('[updateTask]', err);
        fetchTasks(); // 실패 시 재조회로 롤백
      });
  }, [fetchTasks]); // fetchTasks만 의존 (stable)

  // ── 소프트 삭제 — Optimistic Update
  const deleteTask = useCallback((id: string): void => {
    const task = tasksRef.current.find(t => t.id === id);
    const now  = new Date().toISOString();

    // 즉시 리스트에서 제거 → 휴지통 이동
    setTasks(prev => prev.filter(t => t.id !== id));
    if (task) {
      setTrashedTasks(prev => [{ ...task, isDeleted: true, deletedAt: now }, ...prev]);
    }

    fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_deleted: true, deleted_at: now }),
    })
      .catch(err => {
        console.error('[deleteTask]', err);
        fetchTasks(); // 롤백
      });
  }, [fetchTasks]); // stable

  // ── 완료 토글 — Optimistic Update
  const toggleComplete = useCallback((id: string): void => {
    const task = tasksRef.current.find(t => t.id === id);
    if (!task) return;
    const completed = !task.completed;
    const completedAt = completed ? new Date().toISOString() : undefined;
    const subtasks = task.subtasks?.map(s => ({ ...s, completed }));

    // 즉시 반영
    setTasks(prev => prev.map(t => t.id === id
      ? { ...t, completed, completedAt, subtasks }
      : t
    ));

    fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completed,
        completed_at: completedAt ?? null,
        subtasks:     subtasks ?? [],
      }),
    })
      .then(res => res.json())
      .then(row => setTasks(prev => prev.map(t => t.id === id ? toTask(row) : t)))
      .catch(err => { console.error('[toggleComplete]', err); fetchTasks(); });
  }, [fetchTasks]); // stable

  // ── 서브태스크 완료 토글 — Optimistic Update
  const toggleSubtask = useCallback((taskId: string, subtaskId: string): void => {
    const task = tasksRef.current.find(t => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = (task.subtasks ?? []).map(s => {
      if (s.id !== subtaskId) return s;
      const completed = !s.completed;
      return { ...s, completed, dueDate: completed ? new Date().toISOString().slice(0, 10) : undefined };
    });
    const allDone   = updatedSubtasks.length > 0 && updatedSubtasks.every(s => s.completed);
    const completed = allDone;
    const completedAt = allDone && !task.completed ? new Date().toISOString() : undefined;

    // 즉시 반영 (진행률 카운트 즉시 업데이트)
    setTasks(prev => prev.map(t => t.id === taskId
      ? { ...t, subtasks: updatedSubtasks, completed, completedAt }
      : t
    ));

    fetch(`${API_URL}/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subtasks:     updatedSubtasks,
        completed,
        completed_at: completedAt ?? null,
      }),
    })
      .then(res => res.json())
      .then(row => setTasks(prev => prev.map(t => t.id === taskId ? toTask(row) : t)))
      .catch(err => { console.error('[toggleSubtask]', err); fetchTasks(); });
  }, [fetchTasks]); // stable

  // ── 완료 항목 일괄 소프트 삭제
  const clearCompleted = useCallback((): void => {
    tasksRef.current.filter(t => t.completed).forEach(t => deleteTask(t.id));
  }, [deleteTask]); // stable

  // ── 휴지통 복원 — Optimistic Update
  const restoreTask = useCallback((id: string): void => {
    const task = trashedRef.current.find(t => t.id === id);
    if (!task) return;

    setTrashedTasks(prev => prev.filter(t => t.id !== id));
    setTasks(prev => [{ ...task, isDeleted: false, deletedAt: undefined }, ...prev]);

    fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_deleted: false, deleted_at: null }),
    })
      .catch(err => { console.error('[restoreTask]', err); fetchTasks(); });
  }, [fetchTasks]); // stable

  // ── 영구 삭제 — Optimistic Update
  const permanentDeleteTask = useCallback((id: string): void => {
    setTrashedTasks(prev => prev.filter(t => t.id !== id));
    fetch(`${API_URL}/${id}`, { method: 'DELETE' })
      .catch(err => { console.error('[permanentDeleteTask]', err); fetchTasks(); });
  }, [fetchTasks]); // stable

  // ── 휴지통 전체 영구 삭제 — Optimistic Update
  const clearTrash = useCallback((): void => {
    const ids = trashedRef.current.map(t => t.id);
    setTrashedTasks([]);
    Promise.all(ids.map(id => fetch(`${API_URL}/${id}`, { method: 'DELETE' })))
      .catch(err => { console.error('[clearTrash]', err); fetchTasks(); });
  }, [fetchTasks]); // stable

  return {
    tasks,
    trashedTasks,
    loading,
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
