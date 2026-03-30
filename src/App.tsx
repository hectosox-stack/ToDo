// [기능 2] trashedTasks, restoreTask, permanentDeleteTask, clearTrash 추가
// [기능 2] activeCategory === 'trash' 시 TrashView 렌더링
// [기능 2] Sidebar에 trashedCount prop 전달

import { useState, useMemo, useEffect, useRef } from 'react';
import { CategoryProvider } from './store/CategoryContext';
import { useTasks } from './store/useTasks';
import { useCategoryContext } from './store/CategoryContext';
import { useRecurringTasks } from './store/useRecurringTasks';
import Sidebar from './components/Sidebar';
import TaskInput from './components/TaskInput';
import TaskList from './components/TaskList';
import CategoryManager from './components/CategoryManager';
import MiniCalendar from './components/MiniCalendar';
import RecurringTaskManager from './components/RecurringTaskManager';
import TrashView from './components/TrashView';

type DateFilterType = 'createdAt' | 'completedAt';
export type FilterMode = 'all' | 'month' | 'custom' | 'date';

function getMonthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const to = new Date(year, month, 0).toISOString().slice(0, 10);
  return { from, to };
}

function AppContent() {
  const {
    tasks,
    trashedTasks,
    addTask,
    updateTask,
    deleteTask,
    restoreTask,
    permanentDeleteTask,
    clearTrash,
    toggleComplete,
    toggleSubtask,
  } = useTasks();
  const { categories } = useCategoryContext();
  const {
    recurringTasks,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    toggleActive,
    runAutoGenerate,
  } = useRecurringTasks();

  const now = new Date();
  const initRange = getMonthRange(now.getFullYear(), now.getMonth() + 1);

  const [activeCategory, setActiveCategory] = useState('all');
  const [showCompleted, setShowCompleted] = useState(true);
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('createdAt');
  const [filterMode, setFilterMode] = useState<FilterMode>('month');
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [dateFrom, setDateFrom] = useState(initRange.from);
  const [dateTo, setDateTo] = useState(initRange.to);
  const [managerOpen, setManagerOpen] = useState(false);
  const [recurringManagerOpen, setRecurringManagerOpen] = useState(false);
  const [showImportantOnly, setShowImportantOnly] = useState(false);
  const [calSelectedDate, setCalSelectedDate] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [appTitle, setAppTitle] = useState<string>(
    () => localStorage.getItem('app-title') ?? '업무현황'
  );
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState<string>('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  function handleAdd(
    title: string,
    category: string,
    startDate?: string,
    dueDate?: string,
    note?: string,
    subtasks?: import('./types').SubTask[],
    important?: boolean
  ) {
    addTask({ title, category, createdAt: startDate ?? '', dueDate, note, subtasks, important });
  }

  function handleFilterModeChange(mode: FilterMode) {
    setFilterMode(mode);
    if (mode !== 'date') setCalSelectedDate(null);
    if (mode === 'all') {
      setDateFrom(''); setDateTo('');
    } else if (mode === 'month') {
      const { from, to } = getMonthRange(filterYear, filterMonth);
      setDateFrom(from); setDateTo(to);
    }
  }

  function handleMonthChange(year: number, month: number) {
    setFilterYear(year); setFilterMonth(month);
    setFilterMode('month'); setCalSelectedDate(null);
    const { from, to } = getMonthRange(year, month);
    setDateFrom(from); setDateTo(to);
  }

  function handleDateFromChange(v: string) {
    setDateFrom(v); setFilterMode('custom'); setCalSelectedDate(null);
  }
  function handleDateToChange(v: string) {
    setDateTo(v); setFilterMode('custom'); setCalSelectedDate(null);
  }

  function handleCalendarDateSelect(date: string) {
    if (calSelectedDate === date) {
      setCalSelectedDate(null);
      handleFilterModeChange('month');
    } else {
      setCalSelectedDate(date);
      setFilterMode('date');
      setDateFrom(date); setDateTo(date);
    }
  }

  function handleCalendarMonthChange(year: number, month: number) {
    setFilterYear(year); setFilterMonth(month);
  }

  useEffect(() => {
    runAutoGenerate(addTask);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  function handleTitleEdit() {
    setTitleDraft(appTitle); setEditingTitle(true);
  }
  function handleTitleSave() {
    const trimmed = titleDraft.trim();
    if (trimmed) { setAppTitle(trimmed); localStorage.setItem('app-title', trimmed); }
    setEditingTitle(false);
  }
  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleTitleSave();
    if (e.key === 'Escape') setEditingTitle(false);
  }

  const filteredTasks = useMemo(() => {
    let result =
      activeCategory === 'all' || activeCategory === 'trash'
        ? tasks
        : tasks.filter((t) => t.category === activeCategory);
    if (!showCompleted) result = result.filter((t) => !t.completed);
    return result;
  }, [tasks, activeCategory, showCompleted]);

  // 달력은 휴지통 뷰와 무관하게 비삭제 항목 기준
  const calendarTasks = useMemo(() => {
    if (activeCategory === 'all' || activeCategory === 'trash') return tasks;
    return tasks.filter((t) => t.category === activeCategory);
  }, [tasks, activeCategory]);

  // 카테고리 삭제 시 activeCategory 초기화 (trash는 유지)
  useMemo(() => {
    if (
      activeCategory !== 'all' &&
      activeCategory !== 'trash' &&
      !categories.find((c) => c.id === activeCategory)
    ) {
      setActiveCategory('all');
    }
  }, [categories, activeCategory]);

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <header className="bg-white border-b border-gray-200 flex-shrink-0 shadow-sm">
        <div className="h-1 w-full" style={{ backgroundColor: 'var(--brand)' }} />
        <div className="px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {editingTitle ? (
              <input
                ref={titleInputRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                className="text-lg font-bold tracking-tight border-b-2 border-[#F05A28] outline-none bg-transparent"
                style={{ color: 'var(--text-primary)', minWidth: '6rem' }}
              />
            ) : (
              <h1
                className="text-lg font-bold tracking-tight cursor-pointer hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-primary)' }}
                onClick={handleTitleEdit}
                title="클릭하여 제목 수정"
              >
                {appTitle}
              </h1>
            )}
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand)' }}
            >
              {tasks.length}건
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCalendarOpen((o) => !o)}
              aria-label="달력 토글"
              className={`text-sm border rounded-lg px-3 py-1.5 transition-colors focus:outline-none focus:ring-2 ${
                calendarOpen
                  ? 'border-[#F05A28] text-[#F05A28] bg-[#FFF4F0] hover:bg-orange-100 focus:ring-[#F05A28]'
                  : 'text-gray-500 hover:text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-[#F05A28]'
              }`}
            >
              📅 달력
            </button>
            <button
              onClick={() => setManagerOpen(true)}
              aria-label="카테고리 관리"
              className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#F05A28] hover:bg-gray-50"
            >
              카테고리 관리
            </button>
            <button
              onClick={() => setRecurringManagerOpen(true)}
              aria-label="반복 업무 관리"
              className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#F05A28] hover:bg-gray-50"
            >
              🔁 반복 업무
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <Sidebar
          tasks={tasks}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          showCompleted={showCompleted}
          onShowCompletedChange={setShowCompleted}
          trashedCount={trashedTasks.length}
        />

        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 min-w-0">
          {/* [기능 2] 휴지통 뷰 */}
          {activeCategory === 'trash' ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-lg">🗑️</span>
                <h2 className="text-base font-semibold text-gray-700">휴지통</h2>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: '#FFF4F0', color: '#F05A28' }}
                >
                  {trashedTasks.length}개
                </span>
                <span className="text-xs text-gray-400 ml-1">삭제된 항목은 30일 후 자동으로 영구 삭제됩니다</span>
              </div>
              <TrashView
                trashedTasks={trashedTasks}
                onRestore={restoreTask}
                onPermanentDelete={permanentDeleteTask}
                onClearTrash={clearTrash}
              />
            </>
          ) : (
            <>
              <TaskInput onAdd={handleAdd} />
              <TaskList
                tasks={filteredTasks}
                onToggle={toggleComplete}
                onToggleSubtask={toggleSubtask}
                onUpdate={updateTask}
                onDelete={deleteTask}
                dateFilterType={dateFilterType}
                onDateFilterTypeChange={setDateFilterType}
                dateFrom={dateFrom}
                onDateFromChange={handleDateFromChange}
                dateTo={dateTo}
                onDateToChange={handleDateToChange}
                filterMode={filterMode}
                onFilterModeChange={handleFilterModeChange}
                filterYear={filterYear}
                filterMonth={filterMonth}
                onMonthChange={handleMonthChange}
                showImportantOnly={showImportantOnly}
                onShowImportantOnlyChange={setShowImportantOnly}
                calSelectedDate={calSelectedDate}
                onClearCalendarDate={() => {
                  setCalSelectedDate(null);
                  handleFilterModeChange('month');
                }}
              />
            </>
          )}
        </main>

        {calendarOpen && (
          <aside className="w-64 flex-shrink-0 bg-white border-l border-gray-200 overflow-y-auto">
            <MiniCalendar
              tasks={calendarTasks}
              year={filterYear}
              month={filterMonth}
              onMonthChange={handleCalendarMonthChange}
              selectedDate={calSelectedDate}
              onDateSelect={(date) => {
                if (date === null) {
                  setCalSelectedDate(null);
                  handleFilterModeChange('month');
                } else {
                  handleCalendarDateSelect(date);
                }
              }}
            />
          </aside>
        )}
      </div>

      {managerOpen && (
        <CategoryManager tasks={tasks} onClose={() => setManagerOpen(false)} />
      )}

      {recurringManagerOpen && (
        <RecurringTaskManager
          recurringTasks={recurringTasks}
          onAdd={addRecurring}
          onUpdate={updateRecurring}
          onDelete={deleteRecurring}
          onToggleActive={toggleActive}
          onClose={() => setRecurringManagerOpen(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <CategoryProvider>
      <AppContent />
    </CategoryProvider>
  );
}
