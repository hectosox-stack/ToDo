import { useState, useEffect, useRef } from 'react';
import type { CategoryDef } from '../types';
import {
  DEFAULT_CATEGORIES,
  CATEGORIES_STORAGE_KEY,
  STORAGE_KEY,
  PALETTE_KEYS,
} from '../constants';

function loadCategories(): CategoryDef[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CategoryDef[];
  } catch { /* ignore */ }
  return DEFAULT_CATEGORIES;
}

/** 기존 label 기반 task.category를 id 기반으로 1회 마이그레이션 */
function migrateTasksIfNeeded(categories: CategoryDef[]): void {
  if (localStorage.getItem('categories_migrated')) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const tasks = JSON.parse(raw) as { category: string }[];
    const labelToId = Object.fromEntries(categories.map(c => [c.label, c.id]));
    const migrated = tasks.map(t =>
      labelToId[t.category] ? { ...t, category: labelToId[t.category] } : t
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    localStorage.setItem('categories_migrated', '1');
  } catch { /* ignore */ }
}

export function useCategories() {
  const [categories, setCategories] = useState<CategoryDef[]>(() => {
    const cats = loadCategories();
    migrateTasksIfNeeded(cats);
    return cats;
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
      } catch {
        console.warn('[useCategories] localStorage 저장 실패');
      }
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [categories]);

  function getNextColorKey(current: CategoryDef[]): string | null {
    const used = new Set(current.map(c => c.colorKey));
    return PALETTE_KEYS.find(k => !used.has(k)) ?? null;
  }

  function addCategory(label: string): boolean {
    const trimmed = label.trim();
    if (!trimmed) return false;
    const colorKey = getNextColorKey(categories);
    if (!colorKey) return false; // 팔레트 소진
    const newCat: CategoryDef = { id: crypto.randomUUID(), label: trimmed, colorKey };
    setCategories(prev => [...prev, newCat]);
    return true;
  }

  function updateCategory(id: string, changes: Partial<Omit<CategoryDef, 'id'>>): void {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c));
  }

  function deleteCategory(id: string): void {
    setCategories(prev => prev.filter(c => c.id !== id));
  }

  function usedColorKeys(): Set<string> {
    return new Set(categories.map(c => c.colorKey));
  }

  return { categories, addCategory, updateCategory, deleteCategory, usedColorKeys };
}
