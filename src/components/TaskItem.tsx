// [수정 1+2] ✏️ 클릭 시 제목·마감일·중요 여부를 한꺼번에 편집하는 패널 추가
import React, { memo, useState, useRef, KeyboardEvent } from 'react';
import type { Task } from '../types';
import CategoryBadge from './CategoryBadge';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onUpdate: (id: string, changes: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

function isOverdue(dueDate: string, completed: boolean): boolean {
  if (completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate) < today;
}

function getDDayDiff(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const TITLE_MAX = 100;

function TaskItem({ task, onToggle, onToggleSubtask, onUpdate, onDelete }: TaskItemProps) {
  // 인라인 제목 편집 (더블클릭)
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // [수정 1+2] ✏️ 클릭 시 확장 편집 패널 상태
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTitle, setPanelTitle] = useState(task.title);
  const [panelDueDate, setPanelDueDate] = useState(task.dueDate ?? '');
  const [panelImportant, setPanelImportant] = useState(task.important ?? false);
  const [panelCreatedAt, setPanelCreatedAt] = useState(task.createdAt.slice(0, 10));
  const [panelDateError, setPanelDateError] = useState('');

  const [hovered, setHovered] = useState(false);
  const [subtasksExpanded, setSubtasksExpanded] = useState(true);

  const hasSubtasks = (task.subtasks?.length ?? 0) > 0;
  const completedSubtasks = task.subtasks?.filter(s => s.completed).length ?? 0;
  const totalSubtasks = task.subtasks?.length ?? 0;

  // 인라인 제목 편집 (더블클릭)
  function startInlineEdit() {
    setEditValue(task.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function saveInlineEdit() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== task.title) onUpdate(task.id, { title: trimmed });
    setEditing(false);
  }

  function cancelInlineEdit() {
    setEditValue(task.title);
    setEditing(false);
  }

  function handleInlineKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') saveInlineEdit();
    else if (e.key === 'Escape') cancelInlineEdit();
  }

  // [수정 1+2] 확장 편집 패널 열기
  function openPanel() {
    setPanelTitle(task.title);
    setPanelDueDate(task.dueDate ?? '');
    setPanelImportant(task.important ?? false);
    setPanelCreatedAt(task.createdAt.slice(0, 10));
    setPanelDateError('');
    setPanelOpen(true);
  }

  function savePanel() {
    const trimmed = panelTitle.trim();
    if (!trimmed) return;
    if (panelDueDate && panelCreatedAt > panelDueDate) {
      setPanelDateError('생성일이 마감일보다 늦을 수 없습니다');
      return;
    }
    setPanelDateError('');
    const changes: Partial<Task> = {};
    if (trimmed !== task.title) changes.title = trimmed;
    const newDueDate = panelDueDate || undefined;
    if (newDueDate !== task.dueDate) changes.dueDate = newDueDate;
    if (panelImportant !== (task.important ?? false)) changes.important = panelImportant;
    const newCreatedAt = panelCreatedAt || task.createdAt.slice(0, 10);
    if (newCreatedAt !== task.createdAt.slice(0, 10)) changes.createdAt = newCreatedAt;
    if (Object.keys(changes).length > 0) onUpdate(task.id, changes);
    setPanelOpen(false);
  }

  function cancelPanel() {
    setPanelOpen(false);
  }

  const overdue = task.dueDate ? isOverdue(task.dueDate, task.completed) : false;

  function renderDDayBadge() {
    if (!task.dueDate || task.completed) return null;
    const diff = getDDayDiff(task.dueDate);
    let label: string;
  
    let style: React.CSSProperties = {};
    if (diff === 0) {
      label = 'D-Day';
      style = { backgroundColor: '#FEE2E2', color: '#DC2626' };
    } else if (diff > 0 && diff <= 3) {
      label = `D-${diff}`;
      style = { backgroundColor: '#FFF4F0', color: '#F05A28' };
    } else if (diff > 3 && diff <= 7) {
      label = `D-${diff}`;
      style = { backgroundColor: '#FFFBEB', color: '#D97706' };
    } else if (diff < 0) {
      label = `D+${Math.abs(diff)}`;
      style = { backgroundColor: '#F3F4F6', color: '#6B7280' };
    } else {
      return null;
    }
    return (
      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium leading-none" style={style}>
        {label}
      </span>
    );
  }

  const rowBg = task.completed
    ? 'bg-gray-50'
    : task.important
      ? 'bg-[#FFF4F0]'
      : 'bg-white';

  return (
    <div className={`border-b border-gray-100 ${rowBg} ${task.completed ? 'opacity-60' : ''}`}>
      {/* 메인 행 */}
      <div
        className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
          task.completed ? '' : task.important ? 'hover:bg-orange-50' : 'hover:bg-gray-50/60'
        }`}
        style={task.important && !task.completed ? { borderLeft: '3px solid #F05A28' } : { borderLeft: '3px solid transparent' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* 별표 (중요 빠른 토글) */}
        <button
          type="button"
          onClick={() => onUpdate(task.id, { important: !task.important })}
          aria-label={task.important ? '중요 해제' : '중요 표시'}
          className={`text-base leading-none flex-shrink-0 transition-colors focus:outline-none ${
            task.important ? 'hover:opacity-80' : 'text-gray-200 hover:text-[#F05A28]'
          }`}
          style={task.important ? { color: '#F05A28' } : {}}
        >
          {task.important ? '★' : '☆'}
        </button>

        {/* 체크박스 */}
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task.id)}
          aria-label={`${task.title} 완료 토글`}
          className="w-4 h-4 cursor-pointer accent-blue-500 flex-shrink-0 focus:ring-2 focus:ring-blue-400"
        />

        {/* 제목 + 메모 + 세부항목 토글 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {editing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={e => setEditValue(e.target.value.slice(0, TITLE_MAX))}
                onKeyDown={handleInlineKeyDown}
                onBlur={saveInlineEdit}
                maxLength={TITLE_MAX}
                aria-label="제목 편집"
                className="flex-1 border-b border-blue-400 text-sm py-0.5 bg-transparent focus:outline-none"
              />
            ) : (
              <span
                onDoubleClick={startInlineEdit}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && startInlineEdit()}
                className={`text-sm cursor-text select-none ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}
              >
                {task.title}
              </span>
            )}
            {task.repeatTaskId && (
              <span
                title="반복 업무"
                className="text-xs px-1 py-0.5 rounded flex-shrink-0"
                style={{ backgroundColor: '#FFF4F0', color: '#F05A28' }}
              >
                🔁
              </span>
            )}
            {hasSubtasks && (
              <button
                type="button"
                onClick={() => setSubtasksExpanded(o => !o)}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-600 transition-colors focus:outline-none flex-shrink-0"
                aria-label={subtasksExpanded ? '세부 항목 접기' : '세부 항목 펼치기'}
              >
                <span className={`transition-transform duration-150 ${subtasksExpanded ? 'rotate-90' : ''}`}>▶</span>
                <span className={completedSubtasks === totalSubtasks ? 'text-green-500' : ''}>
                  {completedSubtasks}/{totalSubtasks}
                </span>
              </button>
            )}
          </div>
          {task.note && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{task.note}</p>
          )}
        </div>

        {/* 카테고리 */}
        <div className="w-24 flex-shrink-0">
          <CategoryBadge categoryId={task.category} />
        </div>

        {/* 생성일 */}
        <div className="w-24 flex-shrink-0 text-xs text-gray-400 text-center">
          {task.createdAt.slice(0, 10)}
        </div>

        {/* 마감일 + D-Day 뱃지 */}
        <div className={`w-24 flex-shrink-0 text-xs text-center ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
          {task.dueDate ? (
            <div className="flex flex-col items-center gap-0.5">
              <span>
                {task.dueDate}
                {overdue && <span className="sr-only"> (기한 초과)</span>}
              </span>
              {renderDDayBadge()}
            </div>
          ) : (
            <span className="text-gray-200">—</span>
          )}
        </div>

        {/* 완료일 */}
        <div className="w-24 flex-shrink-0 text-xs text-center text-gray-400">
          {task.completed && task.completedAt
            ? task.completedAt.slice(0, 10)
            : <span className="text-gray-200">—</span>
          }
        </div>

        {/* 액션 */}
        <div className={`w-14 flex-shrink-0 flex justify-end gap-1 transition-opacity duration-100 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          {/* [수정 1+2] ✏️ 클릭 시 확장 편집 패널 오픈 */}
          <button
            onClick={openPanel}
            aria-label={`${task.title} 수정`}
            className="text-gray-400 hover:text-blue-500 p-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(task.id)}
            aria-label={`${task.title} 삭제`}
            className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* [수정 1+2] 확장 편집 패널 — 제목·마감일·중요 여부 동시 수정 */}
      {panelOpen && (
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/80 flex flex-col gap-2.5">
          {/* 제목 */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500 w-14 flex-shrink-0">제목</label>
            <input
              autoFocus
              type="text"
              value={panelTitle}
              onChange={e => setPanelTitle(e.target.value.slice(0, TITLE_MAX))}
              onKeyDown={e => { if (e.key === 'Enter') savePanel(); if (e.key === 'Escape') cancelPanel(); }}
              maxLength={TITLE_MAX}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          {/* [수정 2] 생성일 + 마감일 (나란히) */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500 w-14 flex-shrink-0">생성일</label>
              <input
                type="date"
                value={panelCreatedAt}
                onChange={e => { setPanelCreatedAt(e.target.value); setPanelDateError(''); }}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F05A28]"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500 w-14 flex-shrink-0">마감일</label>
              <input
                type="date"
                value={panelDueDate}
                onChange={e => { setPanelDueDate(e.target.value); setPanelDateError(''); }}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F05A28]"
              />
              {panelDueDate && (
                <button
                  type="button"
                  onClick={() => setPanelDueDate('')}
                  className="text-xs text-gray-400 hover:text-red-400 transition-colors focus:outline-none"
                >
                  지우기
                </button>
              )}
            </div>
          </div>
          {/* 날짜 오류 메시지 */}
          {panelDateError && (
            <p className="text-xs text-red-500 ml-[68px]">{panelDateError}</p>
          )}
          {/* [수정 1] 중요 체크박스 */}
          <div className="flex items-center gap-3">
            <span className="w-14 flex-shrink-0" />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={panelImportant}
                onChange={e => setPanelImportant(e.target.checked)}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
              <span className="text-sm text-gray-600">중요 항목으로 표시</span>
              {panelImportant && <span className="text-amber-500 text-sm">★</span>}
            </label>
          </div>
          {/* 저장/취소 버튼 */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelPanel}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none"
            >
              취소
            </button>
            <button
              type="button"
              onClick={savePanel}
              className="px-3 py-1.5 text-xs text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#F05A28]"
              style={{ backgroundColor: '#F05A28' }}
            >
              저장
            </button>
          </div>
        </div>
      )}

      {/* 세부 항목 목록 */}
      {hasSubtasks && subtasksExpanded && (
        <div className="px-4 pb-2 flex flex-col gap-1 bg-indigo-50/30">
          {task.subtasks!.map(sub => (
            <div
              key={sub.id}
              className={`flex items-center gap-2 pl-7 py-1 rounded-lg transition-colors ${
                sub.completed ? 'opacity-60' : 'hover:bg-indigo-50/60'
              }`}
            >
              <input
                type="checkbox"
                checked={sub.completed}
                onChange={() => onToggleSubtask(task.id, sub.id)}
                aria-label={`${sub.title} 완료 토글`}
                className="w-3.5 h-3.5 cursor-pointer accent-indigo-500 flex-shrink-0"
              />
              <span className={`text-sm flex-1 ${sub.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {sub.title}
              </span>
              {sub.dueDate && (
                <span className="text-xs flex-shrink-0 text-gray-400">
                  완료: {sub.dueDate}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(TaskItem);
