import React from 'react';
import PropTypes from 'prop-types';
import { Plus, CalendarDays, Users, FileText, Paperclip, Trash2, Pencil } from 'lucide-react';

const MeetingBoard = ({ meetings, onCreate, onEdit, onDelete, attachmentResolver }) => {
  const sortedMeetings = [...meetings].sort((a, b) => {
    const dateA = a.date ? new Date(a.date) : new Date(0);
    const dateB = b.date ? new Date(b.date) : new Date(0);
    return dateB - dateA;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Meetings</h2>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-500"
        >
          <Plus className="w-4 h-4" />
          New meeting
        </button>
      </div>

      {sortedMeetings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-[#0F1115] dark:text-gray-400">
          No meetings logged yet. Create one to capture agendas, notes, and follow-ups.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {sortedMeetings.map((meeting) => {
            const attachments = typeof attachmentResolver === 'function' ? attachmentResolver(meeting) : [];
            return (
              <div
                key={meeting.id}
                className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-indigo-500/60 hover:shadow-md dark:border-gray-800 dark:bg-[#0F1115]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <button
                      onClick={() => onEdit(meeting.id)}
                      className="text-left text-base font-semibold text-gray-900 hover:text-indigo-600 dark:text-gray-100 dark:hover:text-indigo-300"
                    >
                      {meeting.title || 'Untitled meeting'}
                    </button>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {meeting.date && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {meeting.date}
                        </span>
                      )}
                      {meeting.participants && (
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {meeting.participants}
                        </span>
                      )}
                      {meeting.summary && (
                        <span className="inline-flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          Summary
                        </span>
                      )}
                      {attachments.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="w-3.5 h-3.5" />
                          {attachments.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => onEdit(meeting.id)}
                      className="rounded-md border border-gray-200 p-1 text-gray-500 hover:text-indigo-600 dark:border-gray-700 dark:text-gray-300 dark:hover:text-indigo-300"
                      title="Edit meeting"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(meeting.id)}
                      className="rounded-md border border-red-200 p-1 text-red-500 hover:text-red-600 dark:border-red-900 dark:text-red-300 dark:hover:text-red-200"
                      title="Delete meeting"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {meeting.summary && (
                  <div
                    className="mt-4 rounded-xl bg-indigo-50/70 px-3 py-2 text-sm text-indigo-900 shadow-inner ring-1 ring-indigo-100/70 line-clamp-3 dark:bg-indigo-500/10 dark:text-indigo-100 dark:ring-indigo-500/30"
                    dangerouslySetInnerHTML={{ __html: meeting.summary }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

MeetingBoard.propTypes = {
  meetings: PropTypes.array.isRequired,
  onCreate: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  attachmentResolver: PropTypes.func,
};

MeetingBoard.defaultProps = {
  attachmentResolver: () => [],
};

export default MeetingBoard;
