// [기능 2] 소프트 삭제 구조로 변경
// - allTasks: 삭제 포함 전체 배열 (localStorage 저장)
// - tasks: isDeleted 제외 배열 (기존 코드와 호환)
// - trashedTasks: isDeleted 항목 배열 (TrashView 용)
// - 앱 마운트 시 deletedAt 기준 30일 경과 항목 자동 영구 삭제

import { useState, useEffect, useRef } from 'react';
import type { Task } from '../types';
import { STORAGE_KEY } from '../constants';

function loadFromStorage(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
}

// 30일 경과 휴지통 항목 자동 영구 삭제
function autoPurge(all: Task[]): Task[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return all.filter(t => {
    if (!t.isDeleted || !t.deletedAt) return true;
    return new Date(t.deletedAt) > cutoff;
  });
}

export function useTasks() {
  const [allTasks, setAllTasks] = useState<Task[]>(() => autoPurge(loadFromStorage()));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 외부에서 사용할 분리된 뷰
  const tasks = allTasks.filter(t => !t.isDeleted);
  const trashedTasks = allTasks.filter(t => t.isDeleted);

  // localStorage 동기화 — debounce 300ms + 용량 초과 에러 핸들링
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allTasks));
      } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          console.warn('[useTasks] localStorage 용량 초과 — 저장 실패');
        } else {
          console.warn('[useTasks] localStorage 저장 실패:', e);
        }
      }
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [allTasks]);

  function addTask(task: Omit<Task, 'id' | 'completed'> & { createdAt?: string }): void {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      completed: false,
      createdAt: task.createdAt ?? new Date().toISOString(),
    };
    setAllTasks(prev => [newTask, ...prev]);
  }

  function updateTask(id: string, changes: Partial<Omit<Task, 'id'>>): void {
    setAllTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, ...changes } : t))
    );
  }

  // [기능 2] 소프트 삭제 — 휴지통으로 이동
  function deleteTask(id: string): void {
    setAllTasks(prev =>
      prev.map(t =>
        t.id === id ? { ...t, isDeleted: true, deletedAt: new Date().toISOString() } : t
      )
    );
  }

  // [기능 2] 복원 — 원래 카테고리로 되돌리기
  function restoreTask(id: string): void {
    setAllTasks(prev =>
      prev.map(t =>
        t.id === id ? { ...t, isDeleted: false, deletedAt: undefined } : t
      )
    );
  }

  // [기능 2] 영구 삭제
  function permanentDeleteTask(id: string): void {
    setAllTasks(prev => prev.filter(t => t.id !== id));
  }

  // [기능 2] 휴지통 전체 비우기
  function clearTrash(): void {
    setAllTasks(prev => prev.filter(t => !t.isDeleted));
  }

  function toggleComplete(id: string): void {
    setAllTasks(prev =>
      prev.map(t => {
        if (t.id !== id) return t;
        const completed = !t.completed;
        const updatedSubtasks = t.subtasks?.map(s => ({ ...s, completed }));
        return { ...t, completed, completedAt: completed ? new Date().toISOString() : undefined, subtasks: updatedSubtasks };
      })
    );
  }

  function toggleSubtask(taskId: string, subtaskId: string): void {
    setAllTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        const updatedSubtasks = (t.subtasks ?? []).map(s => {
          if (s.id !== subtaskId) return s;
          const completed = !s.completed;
          return { ...s, completed, dueDate: completed ? new Date().toISOString().slice(0, 10) : undefined };
        });
        const allDone = updatedSubtasks.length > 0 && updatedSubtasks.every(s => s.completed);
        return {
          ...t,
          subtasks: updatedSubtasks,
          completed: allDone,
          completedAt: allDone && !t.completed
            ? new Date().toISOString()
            : !allDone
            ? undefined
            : t.completedAt,
        };
      })
    );
  }

  function clearCompleted(): void {
    // 완료 항목 제거 시 휴지통 항목은 유지
    setAllTasks(prev => prev.filter(t => t.isDeleted || !t.completed));
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
