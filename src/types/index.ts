// [기능 1] SubTask에 order 추가
// [기능 2] Task에 isDeleted, deletedAt 추가 (소프트 삭제)
// [기능 3] RepeatCycle에 'daily' | 'specific_days' 추가, RecurringTask에 repeatDays 추가

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
  order?: number;
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
  // [기능 2] 휴지통
  isDeleted?: boolean;
  deletedAt?: string;
}

export type RepeatCycle =
  | 'daily'
  | 'specific_days'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'halfyearly'
  | 'yearly';

export interface RecurringTask {
  id: string;
  title: string;
  category: string;
  important: boolean;
  dueDateOffset: number;
  repeatCycle: RepeatCycle;
  repeatDays?: string[]; // [기능 3] 특정 요일: ['MON','TUE','WED','THU','FRI','SAT','SUN']
  startDate: string;
  endDate?: string;
  note?: string;
  active: boolean;
  lastGeneratedDate?: string;
}
