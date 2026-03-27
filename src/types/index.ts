export type Category = string;

export interface CategoryDef {
  id: string;
  label: string;
  colorKey: string;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
}

export interface Task {
  id: string;
  title: string;
  category: Category;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
  dueDate?: string;
  note?: string;
  subtasks?: SubTask[];
  important?: boolean;
  repeatTaskId?: string;
}

export type RepeatCycle = 'weekly' | 'biweekly' | 'monthly' | 'halfyearly' | 'yearly';

export interface RecurringTask {
  id: string;
  title: string;
  category: string;
  important: boolean;
  dueDateOffset: number;
  repeatCycle: RepeatCycle;
  startDate: string;
  endDate?: string;
  note?: string;
  active: boolean;
  lastGeneratedDate?: string;
}
