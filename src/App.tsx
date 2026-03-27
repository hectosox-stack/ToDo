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

type DateFilterType = 'createdAt' | 'completedAt';
export type FilterMode = 'all' | 'month' | 'custom' | 'date';

function getMonthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const to = new Date(year, month, 0).toISOString().slice(0, 10);
  return { from, to };
}

function AppContent() {
  const { tasks, addTask, updateTask, deleteTask, toggleComplete, toggleSubtask } = useTasks();
  const { categories } = useCategoryContext();
  const { recurringTasks, addRecurring, updateRecurring, deleteRecurring, toggleActive, runAutoGenerate } = useRecurringTasks();

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

  // ✅ 핵심 수정 (타입 + null 처리)
  const [appTitle, setAppTitle] = useState<string>(
    () => localStorage.getItem('app-title') ?? '업무현황'
  );

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
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
    addTask({ title, category, createdAt: startDate, dueDate, note, subtasks, important });
  }

  function handleFilterModeChange(mode: FilterMode) {
    setFilterMode(mode);
    if (mode !== 'date') setCalSelectedDate(null);

    if (mode === 'all') {
      setDateFrom('');
      setDateTo('');
    } else if (mode === 'month') {
      const { from, to } = getMonthRange(filterYear, filterMonth);
      setDateFrom(from);
      setDateTo(to);
    }
  }

  function handleMonthChange(year: number, month: number) {
    setFilterYear(year);
    setFilterMonth(month);
    setFilterMode('month');
    setCalSelectedDate(null);
    const { from, to } = getMonthRange(year, month);
    setDateFrom(from);
    setDateTo(to);
  }

  function handleDateFromChange(v: string) {
    setDateFrom(v);
    setFilterMode('custom');
    setCalSelectedDate(null);
  }

  function handleDateToChange(v: string) {
    setDateTo(v);
    setFilterMode('custom');
    setCalSelectedDate(null);
  }

  function handleCalendarDateSelect(date: string) {
    if (calSelectedDate === date) {
      setCalSelectedDate(null);
      handleFilterModeChange('month');
    } else {
      setCalSelectedDate(date);
      setFilterMode('date');
      setDateFrom(date);
      setDateTo(date);
    }
  }

  function handleCalendarMonthChange(year: number, month: number) {
    setFilterYear(year);
    setFilterMonth(month);
  }

  useEffect(() => {
    runAutoGenerate(addTask);
  }, []);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  // ✅ 핵심 수정
  function handleTitleEdit() {
    setTitleDraft(appTitle ?? '');
    setEditingTitle(true);
  }

  function handleTitleSave() {
    const trimmed = titleDraft.trim();
    if (trimmed) {
      setAppTitle(trimmed);
      localStorage.setItem('app-title', trimmed);
    }
    setEditingTitle(false);
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleTitleSave();
    if (e.key === 'Escape') setEditingTitle(false);
  }

  const filteredTasks = useMemo(() => {
    let result = activeCategory === 'all'
      ? tasks
      : tasks.filter(t => t.category === activeCategory);

    if (!showCompleted) result = result.filter(t => !t.completed);

    return result;
  }, [tasks, activeCategory, showCompleted]);

  const calendarTasks = useMemo(() => {
    if (activeCategory === 'all') return tasks;
    return tasks.filter(t => t.category === activeCategory);
  }, [tasks, activeCategory]);

  useMemo(() => {
    if (activeCategory !== 'all' && !categories.find(c => c.id === activeCategory)) {
      setActiveCategory('all');
    }
  }, [categories, activeCategory]);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-base)' }}>
      <header className="bg-white border-b border-gray-200 flex-shrink-0 shadow-sm">
        <div className="h-1 w-full" style={{ backgroundColor: 'var(--brand)' }} />
        <div className="px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {editingTitle ? (
              <input
                ref={titleInputRef}
                value={titleDraft ?? ''}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                className="text-lg font-bold border-b-2 outline-none bg-transparent"
              />
            ) : (
              <h1 onClick={handleTitleEdit}>
                {appTitle ?? ''}
              </h1>
            )}
            <span>{tasks.length}건</span>
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
        />

        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 min-w-0">
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
          />
        </main>
      </div>
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