import { useEffect, useState } from 'react';
import type { Task } from '../types';
import { COLOR_PALETTE } from '../constants';
import { useCategoryContext } from '../store/CategoryContext';
import { getProgress, getProgressByCategory } from '../utils/stats';

interface ProgressDashboardProps {
  tasks: Task[];
}

function barColor(percentage: number): string {
  if (percentage <= 33) return 'bg-red-400';
  if (percentage <= 66) return 'bg-orange-400';
  return 'bg-green-500';
}

interface ProgressBarProps {
  percentage: number;
  colorClass: string;
  height?: string;
}

function ProgressBar({ percentage, colorClass, height = 'h-2' }: ProgressBarProps) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(percentage));
    return () => cancelAnimationFrame(id);
  }, [percentage]);

  return (
    <div className={`w-full ${height} bg-gray-100 rounded-full overflow-hidden`}>
      <div
        className={`h-full rounded-full ${colorClass}`}
        style={{ width: `${width}%`, transition: 'width 0.4s ease' }}
      />
    </div>
  );
}

export default function ProgressDashboard({ tasks }: ProgressDashboardProps) {
  const { categories } = useCategoryContext();
  const overall = getProgress(tasks);
  const byCategory = getProgressByCategory(tasks, categories);

  return (
    <div className="flex flex-col gap-3">
      {/* 전체 진행률 */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-800">{overall.completed}</span>
            <span className="text-base text-gray-400">/ {overall.total}</span>
          </div>
          <span className="text-lg font-semibold text-gray-500">{overall.percentage}%</span>
        </div>
        <ProgressBar percentage={overall.percentage} colorClass="bg-[#F05A28]" height="h-2" />
      </div>

      {/* 카테고리별 */}
      {categories.some(c => byCategory[c.id]?.total > 0) && (
        <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
          {categories.filter(c => byCategory[c.id]?.total > 0).map(cat => {
            const { total, completed, percentage } = byCategory[cat.id];
            const palette = COLOR_PALETTE[cat.colorKey];
            return (
              <div key={cat.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className={`inline-block px-1.5 py-0.5 text-xs font-medium rounded-full ${palette?.badge ?? 'bg-gray-100 text-gray-600'}`}>
                    {cat.label}
                  </span>
                  <span className="text-xs text-gray-400">{completed}/{total}</span>
                </div>
                <ProgressBar percentage={percentage} colorClass={palette?.bar ?? 'bg-gray-400'} height="h-1.5" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
