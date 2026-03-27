import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { CategoryDef } from '../types';
import { useCategories } from './useCategories';

interface CategoryContextValue {
  categories: CategoryDef[];
  addCategory: (label: string) => boolean;
  updateCategory: (id: string, changes: Partial<Omit<CategoryDef, 'id'>>) => void;
  deleteCategory: (id: string) => void;
  usedColorKeys: () => Set<string>;
}

const CategoryContext = createContext<CategoryContextValue | null>(null);

export function CategoryProvider({ children }: { children: ReactNode }) {
  const value = useCategories();
  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

export function useCategoryContext(): CategoryContextValue {
  const ctx = useContext(CategoryContext);
  if (!ctx) throw new Error('useCategoryContext must be used inside CategoryProvider');
  return ctx;
}
