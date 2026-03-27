import type { CategoryDef } from '../types';

export interface ColorOption {
  label: string;
  badge: string;   // Tailwind classes for badge
  bar: string;     // Tailwind class for progress bar
  swatch: string;  // Tailwind class for color dot preview
}

export const COLOR_PALETTE: Record<string, ColorOption> = {
  blue:   { label: '파랑',  badge: 'bg-blue-100 text-blue-800 border-blue-300',     bar: 'bg-blue-400',   swatch: 'bg-blue-400'   },
  green:  { label: '초록',  badge: 'bg-green-100 text-green-800 border-green-300',   bar: 'bg-green-400',  swatch: 'bg-green-400'  },
  orange: { label: '주황',  badge: 'bg-orange-100 text-orange-800 border-orange-300', bar: 'bg-orange-400', swatch: 'bg-orange-400' },
  purple: { label: '보라',  badge: 'bg-purple-100 text-purple-800 border-purple-300', bar: 'bg-purple-400', swatch: 'bg-purple-400' },
  rose:   { label: '빨강',  badge: 'bg-rose-100 text-rose-800 border-rose-300',     bar: 'bg-rose-400',   swatch: 'bg-rose-400'   },
  teal:   { label: '청록',  badge: 'bg-teal-100 text-teal-800 border-teal-300',     bar: 'bg-teal-400',   swatch: 'bg-teal-400'   },
  amber:  { label: '노랑',  badge: 'bg-amber-100 text-amber-800 border-amber-300',  bar: 'bg-amber-400',  swatch: 'bg-amber-400'  },
  indigo: { label: '인디고', badge: 'bg-indigo-100 text-indigo-800 border-indigo-300', bar: 'bg-indigo-400', swatch: 'bg-indigo-400' },
  pink:   { label: '분홍',  badge: 'bg-pink-100 text-pink-800 border-pink-300',     bar: 'bg-pink-400',   swatch: 'bg-pink-400'   },
  cyan:   { label: '하늘',  badge: 'bg-cyan-100 text-cyan-800 border-cyan-300',     bar: 'bg-cyan-400',   swatch: 'bg-cyan-400'   },
};

export const PALETTE_KEYS = Object.keys(COLOR_PALETTE);

export const DEFAULT_CATEGORIES: CategoryDef[] = [
  { id: 'cat-sox',      label: 'SOX',  colorKey: 'blue'   },
  { id: 'cat-small',    label: '소규모', colorKey: 'green'  },
  { id: 'cat-etc',      label: '기타',  colorKey: 'orange' },
  { id: 'cat-personal', label: '개인',  colorKey: 'purple' },
];

export const STORAGE_KEY = 'tasks';
export const CATEGORIES_STORAGE_KEY = 'categories';
export const RECURRING_TASKS_STORAGE_KEY = 'recurringTasks';

export const REPEAT_CYCLE_LABELS: Record<string, string> = {
  weekly:     '매주',
  biweekly:   '격주',
  monthly:    '매월',
  halfyearly: '반기',
  yearly:     '매년',
};

export const REPEAT_CYCLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'weekly',     label: '매주 (7일마다)' },
  { value: 'biweekly',   label: '격주 (14일마다)' },
  { value: 'monthly',    label: '매월 (동일 일자)' },
  { value: 'halfyearly', label: '반기 (6개월마다)' },
  { value: 'yearly',     label: '매년' },
];
