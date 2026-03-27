import React from 'react';
import type { Task } from '../types';

interface MiniCalendarProps {
  tasks: Task[];
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function MiniCalendar({
  tasks, year, month, onMonthChange, selectedDate, onDateSelect,
}: MiniCalendarProps) {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());

  // 날짜별 task 집합 계산
  const createdDates = new Set(tasks.map(t => t.createdAt.slice(0, 10)));
  const dueDates = new Set(tasks.filter(t => t.dueDate).map(t => t.dueDate as string));
  const completedDates = new Set(tasks.filter(t => t.completedAt).map(t => (t.completedAt as string).slice(0, 10)));
  const importantDates = new Set(
    tasks.filter(t => t.important && !t.completed).map(t => t.createdAt.slice(0, 10))
  );
  // 중요 항목의 마감일도 포함
  tasks.filter(t => t.important && !t.completed && t.dueDate).forEach(t => {
    importantDates.add(t.dueDate as string);
  });

  // 달력 그리드 계산
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=일
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // 6주 채우기
  while (cells.length < 42) cells.push(null);

  function prevMonth() {
    let y = year, m = month - 1;
    if (m < 1) { m = 12; y -= 1; }
    onMonthChange(y, m);
  }

  function nextMonth() {
    let y = year, m = month + 1;
    if (m > 12) { m = 1; y += 1; }
    onMonthChange(y, m);
  }

  function goToday() {
    onMonthChange(today.getFullYear(), today.getMonth() + 1);
  }

  function handleDayClick(day: number) {
    const dateStr = toDateStr(year, month, day);
    onDateSelect(dateStr);
  }

  return (
    <div className="flex flex-col p-3 select-none">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="이전 달"
          className="px-2 py-1 text-xs text-gray-400 hover:text-blue-500 transition-colors focus:outline-none rounded hover:bg-gray-100"
        >
          ◀
        </button>
        <span className="text-xs font-semibold text-gray-700">
          {year}년 {month}월
        </span>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="다음 달"
          className="px-2 py-1 text-xs text-gray-400 hover:text-blue-500 transition-colors focus:outline-none rounded hover:bg-gray-100"
        >
          ▶
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((wd, i) => (
          <div
            key={wd}
            className={`text-center text-xs font-medium py-1 ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
            }`}
          >
            {wd}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }
          const dateStr = toDateStr(year, month, day);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const isImportant = importantDates.has(dateStr);
          const hasCreated = createdDates.has(dateStr);
          const hasDue = dueDates.has(dateStr);
          const hasCompleted = completedDates.has(dateStr);
          const col = idx % 7;

          let dayTextClass = col === 0 ? 'text-red-500' : col === 6 ? 'text-blue-500' : 'text-gray-700';
          if (isToday && !isSelected) dayTextClass = 'text-white';
          if (isSelected) dayTextClass = 'text-white';

          let bgClass = '';
          let bgStyle: React.CSSProperties = {};
          if (isSelected) bgStyle = { backgroundColor: '#D94E20' };
          else if (isToday) bgStyle = { backgroundColor: '#F05A28' };
          else if (isImportant) bgClass = 'bg-[#FFF4F0]';

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => handleDayClick(day)}
              aria-label={`${dateStr} 선택`}
              className={`flex flex-col items-center justify-start pt-0.5 pb-1 rounded-lg transition-colors focus:outline-none hover:bg-[#FFF4F0] text-xs font-medium leading-none ${bgClass} ${dayTextClass}`}
              style={bgStyle}
            >
              <span className={`w-6 h-6 flex items-center justify-center rounded-full ${isSelected || isToday ? '' : ''}`}>
                {day}
              </span>
              {/* 점 표시 */}
              <div className="flex gap-0.5 mt-0.5 h-1.5 items-center">
                {hasCreated && (
                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: '#F05A28' }} />
                )}
                {hasDue && (
                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: '#F59E0B' }} />
                )}
                {hasCompleted && (
                  <span className="w-1 h-1 rounded-full bg-green-400 flex-shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-3 pt-2 border-t border-gray-100 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#F05A28' }} />
          <span>생성일</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#F59E0B' }} />
          <span>마감일</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
          <span>완료일</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2 h-2 rounded flex-shrink-0 border" style={{ backgroundColor: '#FFF4F0', borderColor: '#F05A28' }} />
          <span>중요 항목</span>
        </div>
      </div>

      {/* 오늘 버튼 */}
      <button
        type="button"
        onClick={goToday}
        className="mt-3 w-full text-xs rounded-lg py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#F05A28] border"
        style={{ color: '#F05A28', borderColor: '#F05A28' }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FFF4F0')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        오늘
      </button>
    </div>
  );
}
