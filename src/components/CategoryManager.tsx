import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import type { Task } from '../types';
import { useCategoryContext } from '../store/CategoryContext';
import { COLOR_PALETTE, PALETTE_KEYS } from '../constants';

interface CategoryManagerProps {
  tasks: Task[];
  onClose: () => void;
}

export default function CategoryManager({ tasks, onClose }: CategoryManagerProps) {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategoryContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColorKey, setEditColorKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newColorKey, setNewColorKey] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  const usedColorKeys = new Set(categories.map(c => c.colorKey));

  // 추가용 초기 색상: 미사용 첫 번째 키
  useEffect(() => {
    const next = PALETTE_KEYS.find(k => !usedColorKeys.has(k));
    setNewColorKey(next ?? '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length]);

  // Escape 키로 닫기
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function startEdit(id: string, label: string, colorKey: string) {
    setEditingId(id);
    setEditLabel(label);
    setEditColorKey(colorKey);
    setConfirmDeleteId(null);
  }

  function saveEdit() {
    if (!editingId || !editLabel.trim()) return;
    updateCategory(editingId, { label: editLabel.trim(), colorKey: editColorKey });
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function handleEditKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') saveEdit();
    else if (e.key === 'Escape') cancelEdit();
  }

  function handleAdd() {
    if (!newLabel.trim() || !newColorKey) return;
    const ok = addCategory(newLabel.trim());
    if (ok) {
      setNewLabel('');
      newInputRef.current?.focus();
    }
  }

  function handleAddKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleAdd();
  }

  function taskCount(catId: string) {
    return tasks.filter(t => t.category === catId).length;
  }

  const canAdd = newLabel.trim().length > 0 && newColorKey !== '' && usedColorKeys.size < PALETTE_KEYS.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">카테고리 관리</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 rounded p-1"
          >
            ✕
          </button>
        </div>

        {/* 목록 */}
        <div className="overflow-y-auto flex-1 px-5 py-3 flex flex-col gap-2">
          {categories.map(cat => {
            const palette = COLOR_PALETTE[cat.colorKey];
            const count = taskCount(cat.id);
            const isEditing = editingId === cat.id;
            const isConfirmDelete = confirmDeleteId === cat.id;

            return (
              <div key={cat.id} className="border border-gray-100 rounded-xl px-3 py-2.5 flex flex-col gap-2">
                {isEditing ? (
                  // 수정 모드
                  <div className="flex flex-col gap-2">
                    <input
                      autoFocus
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value.slice(0, 20))}
                      onKeyDown={handleEditKey}
                      placeholder="카테고리 이름"
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F05A28]"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {PALETTE_KEYS.map(key => {
                        const p = COLOR_PALETTE[key];
                        const inUseByOther = usedColorKeys.has(key) && key !== cat.colorKey;
                        return (
                          <button
                            key={key}
                            type="button"
                            title={inUseByOther ? `${p.label} (이미 사용 중)` : p.label}
                            disabled={inUseByOther}
                            onClick={() => setEditColorKey(key)}
                            className={`w-6 h-6 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 ${p.swatch} ${
                              editColorKey === key ? 'ring-2 ring-offset-1 ring-gray-600 scale-110' : ''
                            } ${inUseByOther ? 'opacity-25 cursor-not-allowed' : 'hover:scale-110'}`}
                            aria-label={p.label}
                            aria-pressed={editColorKey === key}
                          />
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        disabled={!editLabel.trim()}
                        className="px-3 py-1 text-xs rounded-lg text-white disabled:opacity-40 transition-colors focus:outline-none focus:ring-2 focus:ring-[#F05A28]"
                      style={{ backgroundColor: '#F05A28' }}
                      >
                        저장
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  // 일반 모드
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${palette?.badge ?? 'bg-gray-100 text-gray-600'}`}>
                      {cat.label}
                    </span>
                    <span className="text-xs text-gray-400 flex-1">{count > 0 ? `${count}개 사용 중` : ''}</span>
                    <button
                      onClick={() => startEdit(cat.id, cat.label, cat.colorKey)}
                      aria-label={`${cat.label} 수정`}
                      className="text-xs text-gray-400 hover:text-[#F05A28] transition-colors focus:outline-none focus:ring-2 focus:ring-[#F05A28] rounded px-1.5 py-0.5"
                    >
                      수정
                    </button>
                    {isConfirmDelete ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">삭제?</span>
                        <button
                          onClick={() => { deleteCategory(cat.id); setConfirmDeleteId(null); }}
                          className="text-xs text-red-500 hover:text-red-700 font-medium focus:outline-none focus:ring-2 focus:ring-red-400 rounded px-1"
                        >
                          확인
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded px-1"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(cat.id)}
                        disabled={categories.length <= 1}
                        aria-label={`${cat.label} 삭제`}
                        title={count > 0 ? `할 일 ${count}개가 이 카테고리를 사용 중입니다` : undefined}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-400 rounded px-1.5 py-0.5"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 신규 추가 */}
        <div className="px-5 py-4 border-t border-gray-100 flex flex-col gap-2">
          <p className="text-xs font-medium text-gray-500">새 카테고리 추가</p>
          {usedColorKeys.size >= PALETTE_KEYS.length ? (
            <p className="text-xs text-gray-400">사용 가능한 색상이 없습니다. 기존 카테고리를 삭제 후 추가하세요.</p>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  ref={newInputRef}
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value.slice(0, 20))}
                  onKeyDown={handleAddKey}
                  placeholder="카테고리 이름"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F05A28]"
                />
                <button
                  onClick={handleAdd}
                  disabled={!canAdd}
                  className="px-3 py-1.5 text-sm rounded-lg text-white disabled:opacity-40 transition-colors focus:outline-none focus:ring-2 focus:ring-[#F05A28]"
                  style={{ backgroundColor: '#F05A28' }}
                >
                  추가
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PALETTE_KEYS.map(key => {
                  const p = COLOR_PALETTE[key];
                  const inUse = usedColorKeys.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      title={inUse ? `${p.label} (이미 사용 중)` : p.label}
                      disabled={inUse}
                      onClick={() => setNewColorKey(key)}
                      className={`w-6 h-6 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 ${p.swatch} ${
                        newColorKey === key ? 'ring-2 ring-offset-1 ring-gray-600 scale-110' : ''
                      } ${inUse ? 'opacity-25 cursor-not-allowed' : 'hover:scale-110'}`}
                      aria-label={p.label}
                      aria-pressed={newColorKey === key}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
