import type { Task, CategoryDef } from '../types';

export interface Progress {
  total: number;
  completed: number;
  percentage: number;
}

export function getProgress(tasks: Task[]): Progress {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, percentage };
}

export function getProgressByCategory(tasks: Task[], categories: CategoryDef[]): Record<string, Progress> {
  return Object.fromEntries(
    categories.map(cat => {
      const filtered = tasks.filter(t => t.category === cat.id);
      return [cat.id, getProgress(filtered)];
    })
  );
}
