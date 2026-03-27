import type { Task } from '../types';
import { useCategoryContext } from '../store/CategoryContext';
import { COLOR_PALETTE } from '../constants';
import ProgressDashboard from './ProgressDashboard';

interface SidebarProps {
  tasks: Task[];
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  showCompleted: boolean;
  onShowCompletedChange: (v: boolean) => void;
}

export default function Sidebar({
  tasks,
  activeCategory,
  onCategoryChange,
  showCompleted,
  onShowCompletedChange,
}: SidebarProps) {
  const { categories } = useCategoryContext();

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
      {/* 진행률 */}
      <div className="px-5 py-5 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">진행률</p>
        <ProgressDashboard tasks={tasks} />
      </div>

      {/* 카테고리 필터 */}
      <div className="px-3 py-4 flex-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 mb-2">카테고리</p>
        <nav role="tablist" aria-label="카테고리 필터" className="flex flex-col gap-0.5">
          {/* 전체 */}
          <button
            role="tab"
            aria-selected={activeCategory === 'all'}
            onClick={() => onCategoryChange('all')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left w-full focus:outline-none focus:ring-2 focus:ring-[#F05A28] ${
              activeCategory === 'all'
                ? 'bg-[#FFF4F0] text-[#F05A28] font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300 flex-shrink-0" />
            전체
            <span className="ml-auto text-xs text-gray-400">{tasks.length}</span>
          </button>

          {categories.map(cat => {
            const palette = COLOR_PALETTE[cat.colorKey];
            const count = tasks.filter(t => t.category === cat.id).length;
            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={activeCategory === cat.id}
                onClick={() => onCategoryChange(cat.id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left w-full focus:outline-none focus:ring-2 focus:ring-[#F05A28] ${
                  activeCategory === cat.id
                    ? 'bg-[#FFF4F0] text-[#F05A28] font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${palette?.swatch ?? 'bg-gray-400'}`} />
                {cat.label}
                <span className="ml-auto text-xs text-gray-400">{count}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 완료 표시 토글 */}
      <div className="px-5 py-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => onShowCompletedChange(!showCompleted)}
          aria-pressed={showCompleted}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors w-full focus:outline-none focus:ring-2 focus:ring-[#F05A28] rounded"
        >
          <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
            showCompleted ? 'border-[#F05A28]' : 'border-gray-400'
          }`} style={showCompleted ? { backgroundColor: '#F05A28' } : {}}>
            {showCompleted && <span className="text-white text-[10px] leading-none">✓</span>}
          </span>
          완료 항목 표시
        </button>
      </div>
    </aside>
  );
}
