import { useCategoryContext } from '../store/CategoryContext';
import { COLOR_PALETTE } from '../constants';

interface CategoryBadgeProps {
  categoryId: string;
}

export default function CategoryBadge({ categoryId }: CategoryBadgeProps) {
  const { categories } = useCategoryContext();
  const def = categories.find(c => c.id === categoryId);
  const badge = def
    ? (COLOR_PALETTE[def.colorKey]?.badge ?? 'bg-gray-100 text-gray-600 border-gray-300')
    : 'bg-gray-100 text-gray-600 border-gray-300';
  const label = def?.label ?? categoryId;

  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${badge}`}
      aria-label={`카테고리: ${label}`}
    >
      {label}
    </span>
  );
}
