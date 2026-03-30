// 반복 업무 상태 관리 훅
// - CRUD (추가/수정/삭제/활성화 토글)
// - runAutoGenerate: 앱 마운트 시 오늘 생성 예정 반복 업무 자동 할일 생성
// - lastGeneratedDate 로 중복 생성 방지
// - 삭제/수정/비활성화는 기존 생성된 할일에 소급 미적용
// [기능 3] 'daily' | 'specific_days' 주기 추가

import { useState, useEffect, useRef } from 'react';
import type { RecurringTask, Task, RepeatCycle } from '../types';
import { RECURRING_TASKS_STORAGE_KEY } from '../constants';

function load(): RecurringTask[] {
  try {
    const raw = localStorage.getItem(RECURRING_TASKS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecurringTask[]) : [];
  } catch { return []; }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// [기능 3] 'daily'/'specific_days' 케이스 추가
function isScheduledToday(rt: RecurringTask, today: string): boolean {
  if (today < rt.startDate) return false;
  if (rt.endDate && today > rt.endDate) return false;
  const start = new Date(rt.startDate + 'T00:00:00');
  const now   = new Date(today + 'T00:00:00');
  const diffDays = Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  switch (rt.repeatCycle as RepeatCycle) {
    case 'daily':
      // 시작일 이후 매일
      return diffDays >= 0;
    case 'specific_days': {
      // 선택된 요일에만 생성
      if (!rt.repeatDays || rt.repeatDays.length === 0) return false;
      const DAY_KEYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      return rt.repeatDays.includes(DAY_KEYS[now.getDay()]);
    }
    case 'weekly':    return diffDays >= 0 && diffDays % 7  === 0;
    case 'biweekly':  return diffDays >= 0 && diffDays % 14 === 0;
    case 'monthly':   return diffDays >= 0 && now.getDate() === start.getDate();
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

export function useRecurringTasks() {
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>(load);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(RECURRING_TASKS_STORAGE_KEY, JSON.stringify(recurringTasks));
      } catch (e) {
        console.warn('[useRecurringTasks] localStorage 저장 실패:', e);
      }
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [recurringTasks]);

  function addRecurring(data: Omit<RecurringTask, 'id' | 'lastGeneratedDate'>): void {
    setRecurringTasks(prev => [...prev, { ...data, id: crypto.randomUUID() }]);
  }

  function updateRecurring(id: string, changes: Partial<Omit<RecurringTask, 'id'>>): void {
    // 수정 이후 새로 생성되는 할일에만 적용 — 기존 생성 할일은 변경 없음
    setRecurringTasks(prev => prev.map(rt => rt.id === id ? { ...rt, ...changes } : rt));
  }

  function deleteRecurring(id: string): void {
    // 삭제 = 앞으로의 신규 생성 중단만. 기존 생성된 할일 유지.
    setRecurringTasks(prev => prev.filter(rt => rt.id !== id));
  }

  function toggleActive(id: string): void {
    // 비활성화 이전 생성된 할일 유지, 이후 신규 생성만 중단
    setRecurringTasks(prev => prev.map(rt => rt.id === id ? { ...rt, active: !rt.active } : rt));
  }

  function runAutoGenerate(
    addTask: (task: Omit<Task, 'id' | 'completed'> & { createdAt?: string }) => void
  ): void {
    const today = todayStr();
    const updates: Array<{ id: string; lastGeneratedDate: string }> = [];

    for (const rt of recurringTasks) {
      if (!rt.active) continue;
      if (rt.lastGeneratedDate === today) continue; // 오늘 이미 생성됨 — 중복 방지
      if (!isScheduledToday(rt, today)) continue;

      addTask({
        title:        rt.title,
        category:     rt.category,
        important:    rt.important,
        createdAt:    today,
        dueDate:      rt.dueDateOffset > 0 ? addDaysToDate(today, rt.dueDateOffset) : undefined,
        note:         rt.note,
        repeatTaskId: rt.id,
      });
      updates.push({ id: rt.id, lastGeneratedDate: today });
    }

    if (updates.length > 0) {
      setRecurringTasks(prev =>
        prev.map(rt => {
          const u = updates.find(x => x.id === rt.id);
          return u ? { ...rt, lastGeneratedDate: u.lastGeneratedDate } : rt;
        })
      );
    }
  }

  return { recurringTasks, addRecurring, updateRecurring, deleteRecurring, toggleActive, runAutoGenerate };
}
