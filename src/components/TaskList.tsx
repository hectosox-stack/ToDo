import { useMemo } from 'react';
import type { Task } from '../types';
import type { FilterMode } from '../App';
import TaskItem from './TaskItem';

type DateFilterType = 'createdAt' | 'completedAt';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onUpdate: (id: string, changes: Partial<Task>) => void;
  onDelete: (id: string) => void;
  dateFilterType: DateFilterType;
  onDateFilterTypeChange: (t: DateFilterType) => void;
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
  filterYear: number;
  filterMonth: number;
  onMonthChange: (year: number, month: number) => void;
  showImportantOnly: boolean;
  onShowImportantOnlyChange: (v: boolean) => void;
  calSelectedDate: string | null;
  onClearCalendarDate: () => void;
}

function sortTasks(tasks: Task[]): Task[] {
  const importantIncomplete = tasks
    .filter(t => !t.completed && t.important)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const normalIncomplete = tasks
    .filter(t => !t.completed && !t.important)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const importantComplete = tasks
    .filter(t => t.completed && t.important)
    .sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt));
  const normalComplete = tasks
    .filter(t => t.completed && !t.important)
    .sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt));
  return [...importantIncomplete, ...normalIncomplete, ...importantComplete, ...normalComplete];
}

export default function TaskList({
  tasks, onToggle, onToggleSubtask, onUpdate, onDelete,
  dateFilterType, onDateFilterTypeChange,
  dateFrom, onDateFromChange,
  dateTo, onDateToChange,
  filterMode, onFilterModeChange,
  filterYear, filterMonth, onMonthChange,
  showImportantOnly, onShowImportantOnlyChange,
  calSelectedDate, onClearCalendarDate,
}: TaskListProps) {

  const isDateFilterActive = filterMode !== 'all' && (dateFrom !== '' || dateTo !== '');

  const filtered = useMemo(() => {
    let result = tasks;
    if (isDateFilterActive) {
      result = result.filter(t => {
        const dateStr = dateFilterType === 'createdAt'
          ? t.createdAt.slice(0, 10)
          : t.completedAt?.slice(0, 10);
        if (!dateStr) return false;
        if (dateFrom && dateStr < dateFrom) return false;
        if (dateTo && dateStr > dateTo) return false;
        return true;
      });
    }
    if (showImportantOnly) {
      result = result.filter(t => t.important);
    }
    return result;
  }, [tasks, isDateFilterActive, dateFilterType, dateFrom, dateTo, showImportantOnly]);

  const sorted = useMemo(() => sortTasks(filtered), [filtered]);

  function prevMonth() {
    let y = filterYear, m = filterMonth - 1;
    if (m < 1) { m = 12; y -= 1; }
    onMonthChange(y, m);
  }

  function nextMonth() {
    let y = filterYear, m = filterMonth + 1;
    if (m > 12) { m = 1; y += 1; }
    onMonthChange(y, m);
  }

  const monthLabel = `${filterYear}.${String(filterMonth).padStart(2, '0')}`;

  const emptyMessage =
    filterMode === 'all' ? '할 일을 추가해보세요' :
    filterMode === 'month' ? '해당 월에 할 일이 없습니다' :
    filterMode === 'date' ? '해당 날짜에 할 일이 없습니다' :
    '해당 기간에 할 일이 없습니다';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
      {/* 기간 조회 바 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex-wrap">
        <span className="text-xs font-medium text-gray-500 whitespace-nowrap">기간 조회</span>

        {/* 생성일 / 완료일 탭 */}
        <div className="flex gap-1">
          {([
            { value: 'createdAt' as DateFilterType, label: '생성일' },
            { value: 'completedAt' as DateFilterType, label: '완료일' },
          ]).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onDateFilterTypeChange(opt.value)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#F05A28] ${
                dateFilterType === opt.value
                  ? 'text-white'
                  : 'border border-gray-300 text-gray-500 hover:bg-white'
              }`}
              style={dateFilterType === opt.value ? { backgroundColor: '#F05A28' } : {}}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 구분선 */}
        <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

        {/* 전체 버튼 */}
        <button
          type="button"
          onClick={() => onFilterModeChange('all')}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#F05A28] ${
            filterMode === 'all'
              ? 'text-white'
              : 'border border-gray-300 text-gray-500 hover:bg-white'
          }`}
          style={filterMode === 'all' ? { backgroundColor: '#F05A28' } : {}}
        >
          전체
        </button>

        {/* 월 이동 네비게이션 */}
        <div className={`flex items-center rounded border transition-colors ${
          filterMode === 'month'
            ? 'border-[#F05A28] bg-[#FFF4F0]'
            : 'border-gray-300 bg-white'
        }`}>
          <button
            type="button"
            onClick={prevMonth}
            aria-label="이전 달"
            className={`px-2 py-1 text-xs transition-colors focus:outline-none rounded-l ${
              filterMode === 'month' ? 'text-[#F05A28] hover:bg-orange-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => onFilterModeChange('month')}
            className={`px-2 py-1 text-xs font-medium transition-colors focus:outline-none whitespace-nowrap ${
              filterMode === 'month' ? 'text-[#F05A28]' : 'text-gray-500 hover:text-[#F05A28]'
            }`}
          >
            {monthLabel}
          </button>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="다음 달"
            className={`px-2 py-1 text-xs transition-colors focus:outline-none rounded-r ${
              filterMode === 'month' ? 'text-[#F05A28] hover:bg-orange-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            ▶
          </button>
        </div>

        {/* 구분선 */}
        <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

        {/* 날짜 직접 입력 */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dateFrom}
            onChange={e => onDateFromChange(e.target.value)}
            aria-label="조회 시작일"
            className={`border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#F05A28] transition-colors ${
              filterMode === 'custom' ? 'border-[#F05A28] bg-white' : 'border-gray-300'
            }`}
          />
          <span className="text-gray-400 text-xs">~</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => onDateToChange(e.target.value)}
            aria-label="조회 종료일"
            className={`border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#F05A28] transition-colors ${
              filterMode === 'custom' ? 'border-[#F05A28] bg-white' : 'border-gray-300'
            }`}
          />
        </div>

        {/* 수동 입력 시 초기화 버튼 */}
        {filterMode === 'custom' && (
          <button
            type="button"
            onClick={() => onFilterModeChange('all')}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors focus:outline-none rounded px-1"
          >
            초기화
          </button>
        )}

        {/* 달력 날짜 선택 뱃지 */}
        {filterMode === 'date' && calSelectedDate && (
          <div className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: '#FFF4F0', color: '#F05A28' }}>
            <span>{calSelectedDate}</span>
            <button
              type="button"
              onClick={onClearCalendarDate}
              aria-label="날짜 선택 해제"
              className="ml-0.5 focus:outline-none leading-none hover:opacity-70"
              style={{ color: '#F05A28' }}
            >
              ×
            </button>
          </div>
        )}

        {/* 중요만 보기 버튼 */}
        <button
          type="button"
          onClick={() => onShowImportantOnlyChange(!showImportantOnly)}
          aria-label={showImportantOnly ? '중요 필터 해제' : '중요만 보기'}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#F05A28] ${
            showImportantOnly
              ? 'text-white'
              : 'border border-gray-300 text-gray-500 hover:bg-[#FFF4F0] hover:border-[#F05A28] hover:text-[#F05A28]'
          }`}
          style={showImportantOnly ? { backgroundColor: '#F05A28' } : {}}
        >
          ★ 중요만
        </button>

        {/* 건수 */}
        <span className={`text-xs ml-auto whitespace-nowrap ${isDateFilterActive ? 'text-blue-500' : 'text-gray-400'}`}>
          {sorted.length}건
        </span>
      </div>

      {/* 테이블 헤더 */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        <div className="w-4 flex-shrink-0" />
        <div className="w-4 flex-shrink-0" />
        <div className="flex-1 min-w-0">할 일</div>
        <div className="w-24 flex-shrink-0 text-center">카테고리</div>
        <div className="w-24 flex-shrink-0 text-center">생성일</div>
        <div className="w-24 flex-shrink-0 text-center">마감일</div>
        <div className="w-24 flex-shrink-0 text-center">완료일</div>
        <div className="w-14 flex-shrink-0" />
      </div>

      {/* 목록 */}
      <div role="list" aria-label="할 일 목록">
        {sorted.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-400 text-sm" aria-live="polite">
            {emptyMessage}
          </div>
        ) : (
          sorted.map(task => (
            <div key={task.id} role="listitem">
              <TaskItem
                task={task}
                onToggle={onToggle}
                onToggleSubtask={onToggleSubtask}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
