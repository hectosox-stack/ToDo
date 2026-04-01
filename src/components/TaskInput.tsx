import { useState, useRef, KeyboardEvent } from 'react';
import { useCategoryContext } from '../store/CategoryContext';
import type { SubTask } from '../types';

const TITLE_MAX = 100;
const NOTE_MAX = 200;

interface SubTaskDraft {
  id: string;
  title: string;
  dueDate?: string;
}

interface TaskInputProps {
  // [수정 1] important 파라미터 추가
  onAdd: (title: string, category: string, startDate?: string, dueDate?: string, note?: string, subtasks?: SubTask[], important?: boolean) => void;
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TaskInput({ onAdd }: TaskInputProps) {
  const { categories } = useCategoryContext();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(() => categories[0]?.id ?? '');
  const [startDate, setStartDate] = useState(todayString());
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [subtaskDrafts, setSubtaskDrafts] = useState<SubTaskDraft[]>([]);
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const [important, setImportant] = useState(false); // [수정 1] 중요 항목 상태
  const titleRef = useRef<HTMLInputElement>(null);

  function addSubtaskRow() {
    setSubtaskDrafts(prev => [...prev, { id: crypto.randomUUID(), title: '' }]);
  }

  function updateSubtaskDraft(id: string, value: string) {
    setSubtaskDrafts(prev => prev.map(s => s.id === id ? { ...s, title: value } : s));
  }

  function updateSubtaskDraftDate(id: string, dueDate: string) {
    setSubtaskDrafts(prev => prev.map(s => s.id === id ? { ...s, dueDate: dueDate || undefined } : s));
  }

  function removeSubtaskDraft(id: string) {
    setSubtaskDrafts(prev => prev.filter(s => s.id !== id));
  }

  function handleSubtaskKeyDown(e: KeyboardEvent<HTMLInputElement>, id: string) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubtaskRow();
    } else if (e.key === 'Backspace') {
      const draft = subtaskDrafts.find(s => s.id === id);
      if (draft && draft.title === '' && subtaskDrafts.length > 1) {
        e.preventDefault();
        removeSubtaskDraft(id);
      }
    }
  }

  function submit() {
    if (!title.trim()) { titleRef.current?.focus(); return; }
    const validSubtasks: SubTask[] = subtaskDrafts
      .filter(s => s.title.trim())
      .map(s => ({
        id: s.id,
        title: s.title.trim(),
        completed: false,
        dueDate: s.dueDate || undefined,
      }));
    // [수정 1] important 전달
    onAdd(title.trim(), category, startDate || undefined, dueDate || undefined, note.trim() || undefined, validSubtasks.length > 0 ? validSubtasks : undefined, important || undefined);
    setTitle('');
    setCategory(categories[0]?.id ?? '');
    setStartDate(todayString());
    setDueDate('');
    setNote('');
    setNoteOpen(false);
    setSubtaskDrafts([]);
    setSubtasksOpen(false);
    setImportant(false);
    titleRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') submit();
  }

  function toggleSubtasks() {
    if (!subtasksOpen) {
      setSubtasksOpen(true);
      if (subtaskDrafts.length === 0) addSubtaskRow();
    } else {
      setSubtasksOpen(false);
    }
  }

  const titleOver = title.length >= TITLE_MAX;
  const noteOver = note.length >= NOTE_MAX;
  const filledSubtasks = subtaskDrafts.filter(s => s.title.trim()).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
      {/* 메인 입력 행 */}
      <div className="flex items-center gap-2">
        {/* 제목 */}
        <div className="relative flex-1 min-w-0">
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value.slice(0, TITLE_MAX))}
            onKeyDown={handleKeyDown}
            placeholder="새 할 일을 입력하세요..."
            maxLength={TITLE_MAX}
            aria-label="할 일 제목"
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              titleOver ? 'border-orange-400' : 'border-gray-300'
            }`}
          />
          {title.length > 80 && (
            <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none ${titleOver ? 'text-orange-500' : 'text-gray-400'}`}>
              {title.length}/{TITLE_MAX}
            </span>
          )}
        </div>

        {/* 카테고리 */}
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          aria-label="카테고리"
          className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        >
          {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>

        {/* 생성일 */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-400 whitespace-nowrap">생성일</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            aria-label="생성일"
            className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* 마감일 */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-400 whitespace-nowrap">마감일</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            aria-label="마감일"
            className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* [수정 1] 중요 항목 토글 버튼 */}
        <button
          type="button"
          onClick={() => setImportant(v => !v)}
          aria-pressed={important}
          className={`px-3 py-2 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-[#F05A28] whitespace-nowrap ${
            important
              ? 'border-[#F05A28] text-[#F05A28] bg-[#FFF4F0]'
              : 'border-gray-300 text-gray-500 hover:bg-gray-50'
          }`}
        >
          {important ? '★ 중요' : '☆ 중요'}
        </button>

        {/* 세부 항목 토글 */}
        <button
          type="button"
          onClick={toggleSubtasks}
          aria-expanded={subtasksOpen}
          className={`px-3 py-2 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 whitespace-nowrap ${
            subtasksOpen || filledSubtasks > 0
              ? 'border-indigo-400 text-indigo-600 bg-indigo-50'
              : 'border-gray-300 text-gray-500 hover:bg-gray-50'
          }`}
        >
          세부 항목{filledSubtasks > 0 ? ` (${filledSubtasks})` : ''}
        </button>

        {/* 메모 토글 */}
        <button
          type="button"
          onClick={() => setNoteOpen(o => !o)}
          aria-expanded={noteOpen}
          className={`px-3 py-2 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 whitespace-nowrap ${
            noteOpen ? 'border-blue-400 text-blue-600 bg-blue-50' : 'border-gray-300 text-gray-500 hover:bg-gray-50'
          }`}
        >
          메모
        </button>

        {/* 추가 */}
        <button
          onClick={submit}
          aria-label="추가"
          className="text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#F05A28] focus:ring-offset-1 whitespace-nowrap"
          style={{ backgroundColor: '#F05A28' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#D94E20')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#F05A28')}
        >
          + 추가
        </button>
      </div>

      {/* 세부 항목 */}
      {subtasksOpen && (
        <div className="flex flex-col gap-1.5 pl-4 border-l-2 border-indigo-100">
          <p className="text-xs text-gray-400 font-medium">세부 항목 — Enter로 줄 추가, 내용 없이 Backspace로 줄 삭제</p>
          {subtaskDrafts.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2">
              <span className="text-gray-300 text-xs w-4 text-right flex-shrink-0">{idx + 1}.</span>
              <input
                type="text"
                value={s.title}
                onChange={e => updateSubtaskDraft(s.id, e.target.value)}
                onKeyDown={e => handleSubtaskKeyDown(e, s.id)}
                placeholder="세부 항목 입력..."
                autoFocus={idx === subtaskDrafts.length - 1}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <input
                type="date"
                value={s.dueDate ?? ''}
                onChange={e => updateSubtaskDraftDate(s.id, e.target.value)}
                aria-label="세부 항목 마감일"
                title="마감일"
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                type="button"
                onClick={() => removeSubtaskDraft(s.id)}
                aria-label="세부 항목 삭제"
                className="text-gray-300 hover:text-red-400 transition-colors text-sm px-1 focus:outline-none"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addSubtaskRow}
            className="self-start text-xs text-indigo-400 hover:text-indigo-600 transition-colors focus:outline-none mt-0.5"
          >
            + 줄 추가
          </button>
        </div>
      )}

      {/* 메모 */}
      {noteOpen && (
        <div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value.slice(0, NOTE_MAX))}
            placeholder="메모를 입력하세요 (선택, 최대 200자)"
            rows={2}
            maxLength={NOTE_MAX}
            aria-label="메모"
            className={`w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              noteOver ? 'border-orange-400' : 'border-gray-300'
            }`}
          />
          <p className={`text-right text-xs mt-1 ${noteOver ? 'text-orange-500' : 'text-gray-400'}`}>
            {note.length}/{NOTE_MAX}
          </p>
        </div>
      )}
    </div>
  );
}
