// [기능 2] 휴지통 뷰 — 삭제된 항목 복원 / 영구 삭제 / 전체 비우기
// - 삭제일 기준 30일 후 자동 영구 삭제 안내 표시
// - 선택 삭제/복원 및 전체 비우기 시 확인 다이얼로그 제공

import { useState, useMemo } from 'react';
import type { Task } from '../types';

interface TrashViewProps {
  trashedTasks: Task[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onClearTrash: () => void;
}

function getDaysUntilPurge(deletedAt: string): number {
  const deleted = new Date(deletedAt);
  const purgeDate = new Date(deleted);
  purgeDate.setDate(purgeDate.getDate() + 30);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((purgeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function TrashView({ trashedTasks, onRestore, onPermanentDelete, onClearTrash }: TrashViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmType, setConfirmType] = useState<'selected' | 'all' | null>(null);

  const allSelected = trashedTasks.length > 0 && selectedIds.size === trashedTasks.length;

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(trashedTasks.map(t => t.id)));
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleRestoreSelected() {
    selectedIds.forEach(id => onRestore(id));
    setSelectedIds(new Set());
  }

  function handleDeleteSelected() {
    selectedIds.forEach(id => onPermanentDelete(id));
    setSelectedIds(new Set());
    setConfirmType(null);
  }

  function handleClearAll() {
    onClearTrash();
    setSelectedIds(new Set());
    setConfirmType(null);
  }

  // 삭제된 날짜 최신순 정렬
  const sortedTasks = useMemo(() =>
    [...trashedTasks].sort((a, b) =>
      (b.deletedAt ?? '').localeCompare(a.deletedAt ?? '')
    ), [trashedTasks]
  );

  if (trashedTasks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
        <div className="text-4xl mb-3">🗑️</div>
        <p className="text-gray-500 text-sm">휴지통이 비어 있습니다</p>
        <p className="text-gray-400 text-xs mt-1">삭제된 항목은 30일 후 자동으로 영구 삭제됩니다</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 헤더 툴바 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            aria-label="전체 선택"
            className="w-4 h-4 cursor-pointer accent-[#F05A28]"
          />
          <span className="text-sm text-gray-600 font-medium">
            {selectedIds.size > 0 ? `${selectedIds.size}개 선택됨` : `총 ${trashedTasks.length}개`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={handleRestoreSelected}
                className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
              >
                ↩ 선택 복원
              </button>
              <button
                onClick={() => setConfirmType('selected')}
                className="text-xs px-3 py-1.5 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors focus:outline-none"
              >
                🗑 선택 완전 삭제
              </button>
            </>
          )}
          <button
            onClick={() => setConfirmType('all')}
            className="text-xs px-3 py-1.5 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors focus:outline-none"
          >
            휴지통 비우기
          </button>
        </div>
      </div>

      {/* 확인 다이얼로그 */}
      {confirmType && (
        <div
          className="px-5 py-3 border-b border-gray-100 flex items-center justify-between"
          style={{ backgroundColor: '#FFF4F0' }}
        >
          <span className="text-sm text-gray-700">
            {confirmType === 'all'
              ? `휴지통의 모든 항목(${trashedTasks.length}개)을 영구 삭제하시겠습니까?`
              : `선택한 ${selectedIds.size}개 항목을 영구 삭제하시겠습니까?`}
            <span className="ml-1 text-xs text-gray-500">이 작업은 되돌릴 수 없습니다.</span>
          </span>
          <div className="flex gap-2 ml-4 flex-shrink-0">
            <button
              onClick={() => setConfirmType(null)}
              className="text-xs px-3 py-1 border border-gray-300 rounded-lg text-gray-500 hover:bg-white transition-colors focus:outline-none"
            >
              취소
            </button>
            <button
              onClick={confirmType === 'all' ? handleClearAll : handleDeleteSelected}
              className="text-xs px-3 py-1 text-white rounded-lg transition-colors focus:outline-none"
              style={{ backgroundColor: '#DC2626' }}
            >
              영구 삭제
            </button>
          </div>
        </div>
      )}

      {/* 항목 목록 */}
      <div className="flex flex-col divide-y divide-gray-50">
        {sortedTasks.map(task => {
          const daysLeft = task.deletedAt ? getDaysUntilPurge(task.deletedAt) : 30;
          const isUrgent = daysLeft <= 7;
          return (
            <div
              key={task.id}
              className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors ${
                selectedIds.has(task.id) ? 'bg-orange-50/50' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(task.id)}
                onChange={() => toggleSelect(task.id)}
                aria-label={`${task.title} 선택`}
                className="w-4 h-4 cursor-pointer accent-[#F05A28] flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-500 line-through truncate block">
                  {task.title}
                </span>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-gray-400">
                    삭제일: {task.deletedAt ? task.deletedAt.slice(0, 10) : '—'}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={isUrgent
                      ? { backgroundColor: '#FEE2E2', color: '#DC2626' }
                      : { backgroundColor: '#F3F4F6', color: '#6B7280' }
                    }
                  >
                    {daysLeft > 0 ? `${daysLeft}일 후 자동 삭제` : '곧 삭제'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => onRestore(task.id)}
                  aria-label={`${task.title} 복원`}
                  className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
                >
                  ↩ 복원
                </button>
                <button
                  onClick={() => onPermanentDelete(task.id)}
                  aria-label={`${task.title} 영구 삭제`}
                  className="text-xs px-2.5 py-1 border border-red-200 rounded-lg text-red-400 hover:bg-red-50 transition-colors focus:outline-none"
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
