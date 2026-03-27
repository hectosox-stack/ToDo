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

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(loadFromStorage);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // localStorage 동기화 — debounce 300ms + 용량 초과 에러 핸들링
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
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
  }, [tasks]);

  function addTask(task: Omit<Task, 'id' | 'completed'> & { createdAt?: string }): void {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      completed: false,
      createdAt: task.createdAt ?? new Date().toISOString(),
    };
    setTasks(prev => [newTask, ...prev]);
  }

  function updateTask(id: string, changes: Partial<Omit<Task, 'id'>>): void {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, ...changes } : t))
    );
  }

  function deleteTask(id: string): void {
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  function toggleComplete(id: string): void {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== id) return t;
        const completed = !t.completed;
        const updatedSubtasks = t.subtasks?.map(s => ({ ...s, completed }));
        return { ...t, completed, completedAt: completed ? new Date().toISOString() : undefined, subtasks: updatedSubtasks };
      })
    );
  }

  function toggleSubtask(taskId: string, subtaskId: string): void {
    setTasks(prev =>
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
    setTasks(prev => prev.filter(t => !t.completed));
  }

  return { tasks, addTask, updateTask, deleteTask, toggleComplete, toggleSubtask, clearCompleted };
}
