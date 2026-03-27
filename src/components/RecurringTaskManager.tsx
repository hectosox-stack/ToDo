// 반복 업무 관리 모달
// 반복 업무 등록·수정·비활성화·삭제 제공
// 기존 생성된 할일에 소급 미적용 (useRecurringTasks.ts 에서 처리)

import { useState } from 'react';
import { useCategoryContext } from '../store/CategoryContext';
import type { RecurringTask, RepeatCycle } from '../types';
import { REPEAT_CYCLE_LABELS, REPEAT_CYCLE_OPTIONS } from '../constants';

interface Props {
  recurringTasks: RecurringTask[];
  onAdd: (data: Omit<RecurringTask, 'id' | 'lastGeneratedDate'>) => void;
  onUpdate: (id: string, changes: Partial<Omit<RecurringTask, 'id'>>) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void;
  onClose: () => void;
}

interface FormState {
  title: string;
  category: string;
  important: boolean;
  dueDateOffset: string;
  repeatCycle: RepeatCycle;
  startDate: string;
  endDate: string;
  note: string;
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

function defaultForm(firstCatId: string): FormState {
  return { title: '', category: firstCatId, important: false, dueDateOffset: '0', repeatCycle: 'weekly', startDate: todayStr(), endDate: '', note: '' };
}

export default function RecurringTaskManager({ recurringTasks, onAdd, onUpdate, onDelete, onToggleActive, onClose }: Props) {
  const { categories } = useCategoryContext();
  const [form, setForm] = useState<FormState>(() => defaultForm(categories[0]?.id ?? ''));
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleAdd() {
    if (!form.title.trim()) { setFormError('업무명을 입력하세요'); return; }
    if (!form.startDate)    { setFormError('시작일을 선택하세요'); return; }
    setFormError('');
    const offset = Math.max(0, parseInt(form.dueDateOffset, 10) || 0);
    onAdd({ title: form.title.trim(), category: form.category, important: form.important, dueDateOffset: offset, repeatCycle: form.repeatCycle, startDate: form.startDate, endDate: form.endDate || undefined, note: form.note.trim() || undefined, active: true });
    setForm(defaultForm(categories[0]?.id ?? ''));
  }

  function startEdit(rt: RecurringTask) {
    setEditingId(rt.id);
    setEditForm({ title: rt.title, category: rt.category, important: rt.important, dueDateOffset: String(rt.dueDateOffset), repeatCycle: rt.repeatCycle, startDate: rt.startDate, endDate: rt.endDate ?? '', note: rt.note ?? '' });
    setConfirmDeleteId(null);
  }

  function saveEdit() {
    if (!editingId || !editForm || !editForm.title.trim()) return;
    const offset = Math.max(0, parseInt(editForm.dueDateOffset, 10) || 0);
    onUpdate(editingId, { title: editForm.title.trim(), category: editForm.category, important: editForm.important, dueDateOffset: offset, repeatCycle: editForm.repeatCycle, startDate: editForm.startDate, endDate: editForm.endDate || undefined, note: editForm.note.trim() || undefined });
    setEditingId(null); setEditForm(null);
  }

  function cancelEdit() { setEditingId(null); setEditForm(null); }

  // Generic form renderer used for both Add and Edit
  function renderForm(f: FormState, setF: (v: FormState) => void, submitLabel: string, onSubmit: () => void, onCancel?: () => void, error?: string) {
    const upd = <K extends keyof FormState>(key: K, val: FormState[K]) => setF({ ...f, [key]: val });
    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input type="text" placeholder="업무명 (필수)" value={f.title} onChange={e => upd('title', e.target.value.slice(0, 100))} className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F05A28]" />
          <select value={f.category} onChange={e => upd('category', e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F05A28] bg-white">
            {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <select value={f.repeatCycle} onChange={e => upd('repeatCycle', e.target.value as RepeatCycle)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F05A28] bg-white">
            {REPEAT_CYCLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 whitespace-nowrap">시작</span>
            <input type="date" value={f.startDate} onChange={e => upd('startDate', e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F05A28]" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 whitespace-nowrap">종료</span>
            <input type="date" value={f.endDate} onChange={e => upd('endDate', e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F05A28]" />
            {f.endDate && <button type="button" onClick={() => upd('endDate', '')} className="text-xs text-gray-400 hover:text-red-400 transition-colors">지우기</button>}
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 whitespace-nowrap">마감 기한</span>
            <input type="number" min={0} max={365} value={f.dueDateOffset} onChange={e => upd('dueDateOffset', e.target.value)} className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#F05A28]" />
            <span className="text-xs text-gray-400">일 후</span>
            {(parseInt(f.dueDateOffset, 10) || 0) === 0 && <span className="text-xs text-gray-300">(없음)</span>}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={f.important} onChange={e => upd('important', e.target.checked)} className="w-4 h-4 cursor-pointer" />
            <span className="text-sm text-gray-600">중요</span>
            {f.important && <span style={{ color: '#F05A28' }}>★</span>}
          </label>
        </div>
        <input type="text" placeholder="메모 (선택사항)" value={f.note} onChange={e => upd('note', e.target.value.slice(0, 200))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F05A28]" />
        <div className="flex items-center justify-between">
          {error ? <p className="text-xs text-red-500">{error}</p> : <span />}
          <div className="flex gap-2">
            {onCancel && <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none">취소</button>}
            <button type="button" onClick={onSubmit} className="px-4 py-1.5 text-xs text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#F05A28]" style={{ backgroundColor: '#F05A28' }}>{submitLabel}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔁</span>
            <h2 className="text-base font-semibold" style={{ color: '#1A1A1A' }}>반복 업무 관리</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#FFF4F0', color: '#F05A28' }}>{recurringTasks.length}개</span>
          </div>
          <button onClick={onClose} aria-label="닫기" className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none rounded p-1">✕</button>
        </div>

        {/* 목록 */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {recurringTasks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">등록된 반복 업무가 없습니다<br /><span className="text-xs">아래 폼에서 반복 업무를 추가하세요</span></p>
          ) : (
            <div className="flex flex-col gap-2">
              {recurringTasks.map(rt => {
                const cycleLabel = REPEAT_CYCLE_LABELS[rt.repeatCycle] ?? rt.repeatCycle;
                const cat = categories.find(c => c.id === rt.category);
                const isEditing = editingId === rt.id;
                const isConfirmDel = confirmDeleteId === rt.id;
                return (
                  <div key={rt.id} className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className={`flex items-center gap-3 px-4 py-2.5 ${rt.active ? 'bg-white' : 'bg-gray-50'}`}>
                      {/* ON/OFF 토글 */}
                      <button type="button" onClick={() => onToggleActive(rt.id)} aria-label={rt.active ? '비활성화' : '활성화'} className="flex-shrink-0 relative w-9 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#F05A28]" style={{ backgroundColor: rt.active ? '#F05A28' : '#D1D5DB' }}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${rt.active ? 'left-[18px]' : 'left-0.5'}`} />
                      </button>
                      {/* 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {rt.important && <span className="text-sm" style={{ color: '#F05A28' }}>★</span>}
                          <span className={`text-sm font-medium truncate ${rt.active ? '' : 'text-gray-400 line-through'}`} style={{ color: rt.active ? '#1A1A1A' : undefined }}>{rt.title}</span>
                          {cat && <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{cat.label}</span>}
                          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FFF4F0', color: '#F05A28' }}>{cycleLabel}</span>
                          {rt.dueDateOffset > 0 && <span className="text-xs text-gray-400">마감 +{rt.dueDateOffset}일</span>}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          시작: {rt.startDate}{rt.endDate ? ` ~ ${rt.endDate}` : ''}
                          {rt.lastGeneratedDate && ` · 최근 생성: ${rt.lastGeneratedDate}`}
                        </div>
                      </div>
                      {/* 액션 */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => isEditing ? cancelEdit() : startEdit(rt)} className="text-xs text-gray-400 hover:text-[#F05A28] transition-colors focus:outline-none px-2 py-1 rounded">{isEditing ? '접기' : '수정'}</button>
                        {isConfirmDel ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">삭제?</span>
                            <button onClick={() => { onDelete(rt.id); setConfirmDeleteId(null); }} className="text-xs text-red-500 hover:text-red-700 font-medium focus:outline-none px-1 rounded">확인</button>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-400 hover:text-gray-600 focus:outline-none px-1 rounded">취소</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(rt.id)} className="text-xs text-gray-400 hover:text-red-500 transition-colors focus:outline-none px-2 py-1 rounded">삭제</button>
                        )}
                      </div>
                    </div>
                    {/* 인라인 수정 폼 */}
                    {isEditing && editForm && (
                      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/80">
                        {renderForm(editForm, (v: FormState) => setEditForm(v), '저장', saveEdit, cancelEdit)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 추가 폼 */}
        <div className="px-6 py-4 border-t border-gray-100" style={{ backgroundColor: '#FAF8F6' }}>
          <p className="text-xs font-semibold text-gray-500 mb-3">새 반복 업무 추가</p>
          {renderForm(form, setForm, '+ 추가', handleAdd, undefined, formError)}
        </div>
      </div>
    </div>
  );
}
