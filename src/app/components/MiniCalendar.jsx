import React from 'react';
import { startOfWeek } from 'date-fns';

// MiniCalendar renders a small month view with calendar week labels
function MiniCalendar({ month, year, onClose, onPrev, onNext }) {
  const start = startOfWeek(new Date(year, month, 1), { weekStartsOn: 1 });
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    weeks.push(days.slice(w * 7, w * 7 + 7));
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-4">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={onPrev}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ←
          </button>
          <h3 className="font-semibold text-lg">
            {new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={onNext}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            →
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="p-2 font-medium text-gray-500">{day}</div>
          ))}
          {weeks.map((week, w) => (
            <React.Fragment key={w}>
              {week.map((day, d) => (
                <div
                  key={d}
                  className={`p-2 rounded-lg cursor-pointer hover:bg-gray-100 ${
                    day.getMonth() === month ? 'text-gray-900' : 'text-gray-400'
                  } ${day.toDateString() === new Date().toDateString() ? 'bg-blue-100 text-blue-700' : ''}`}
                >
                  {day.getDate()}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default MiniCalendar;
