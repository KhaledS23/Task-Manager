import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import ReactQuill from 'react-quill';
import {
  X,
  CalendarDays,
  Users,
  Save,
  Trash2,
  Plus,
  Paperclip,
  FileText,
  CheckCircle2,
} from 'lucide-react';

import 'react-quill/dist/quill.snow.css';

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ color: [] }, { background: [] }],
    ['link'],
    ['clean'],
  ],
};

const MeetingEditor = ({
  meeting,
  onClose,
  onSave,
  onDelete,
  onAddTask,
  onEditTask,
  onUnlinkTask,
  onDeleteTask,
  taskLookup,
  onAttachmentUpload,
  onAttachmentDownload,
  onAttachmentDelete,
  attachmentDirStatus,
}) => {
  const [form, setForm] = useState(() => ({
    title: meeting.title || 'Untitled meeting',
    date: meeting.date || new Date().toISOString().slice(0, 10),
    participants: meeting.participants || '',
    agenda: meeting.agenda || '',
    summary: meeting.summary || '',
    followUps: meeting.followUps || '',
  }));
  const fileInputRef = useRef(null);

  useEffect(() => {
    setForm({
      title: meeting.title || 'Untitled meeting',
      date: meeting.date || new Date().toISOString().slice(0, 10),
      participants: meeting.participants || '',
      agenda: meeting.agenda || '',
      summary: meeting.summary || '',
      followUps: meeting.followUps || '',
    });
  }, [meeting]);

  const linkedTasks = useMemo(() => {
    return (meeting.linkedTaskIds || [])
      .map((taskId) => ({ taskId, context: taskLookup.get(taskId) }))
      .filter(({ context }) => Boolean(context));
  }, [meeting.linkedTaskIds, taskLookup]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(meeting.id, form);
  };

  const triggerAttachmentUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleAttachmentChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    await onAttachmentUpload({ projectId: meeting.projectId, meetingId: meeting.id, files });
  };

  const attachmentStatusBadge = () => {
    switch (attachmentDirStatus) {
      case 'granted':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500"><CheckCircle2 className="w-3 h-3" /> Synced</span>;
      case 'denied':
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500">Auth needed</span>;
      case 'not-configured':
        return <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 px-2 py-0.5 text-[10px] font-medium text-gray-500">No folder</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 px-2 py-0.5 text-[10px] font-medium text-gray-500">Checking…</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative h-full w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#0F1115] dark:text-gray-100">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Meeting details</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Capture agenda, notes, follow-up tasks, and attachments.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-500"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={() => onDelete(meeting.id)}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-900/30"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:text-gray-600 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="h-full overflow-y-auto px-6 py-4">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <FileText className="w-3.5 h-3.5" /> Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-[#1A1D24] dark:text-gray-100 dark:focus:ring-indigo-500/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <CalendarDays className="w-3.5 h-3.5" /> Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => handleChange('date', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-[#1A1D24] dark:text-gray-100 dark:focus:ring-indigo-500/40"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <Users className="w-3.5 h-3.5" /> Participants
                  </label>
                  <input
                    type="text"
                    value={form.participants}
                    onChange={(e) => handleChange('participants', e.target.value)}
                    placeholder="Comma separated"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-[#1A1D24] dark:text-gray-100 dark:focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Agenda</label>
                <ReactQuill
                  theme="snow"
                  modules={quillModules}
                  value={form.agenda}
                  onChange={(value) => handleChange('agenda', value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Summary notes</label>
                <ReactQuill
                  theme="snow"
                  modules={quillModules}
                  value={form.summary}
                  onChange={(value) => handleChange('summary', value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Follow-up tasks &amp; decisions</label>
                <ReactQuill
                  theme="snow"
                  modules={quillModules}
                  value={form.followUps}
                  onChange={(value) => handleChange('followUps', value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#10131A]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Tasks</h3>
                  <button
                    onClick={() => onAddTask(meeting.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add task
                  </button>
                </div>

                {linkedTasks.length === 0 ? (
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    No tasks linked yet. Create tasks directly in the meeting to keep everything in sync.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {linkedTasks.map(({ taskId, context }) => (
                      <div key={taskId} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs dark:border-gray-700 dark:bg-[#0F1115]">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium text-gray-700 dark:text-gray-100">{context.task.label}</div>
                            <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                              {context.task.owner && <span>Owner: {context.task.owner}</span>}
                              {context.task.dueDate && <span>Due: {context.task.dueDate}</span>}
                              {context.task.priority && <span>Priority: {context.task.priority}</span>}
                              <span>Status: {context.task.status || (context.task.done ? 'done' : 'todo')}</span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => onEditTask(context.tileId, context.task.id)}
                              className="rounded-md border border-gray-200 p-1 text-gray-500 hover:text-indigo-500 dark:border-gray-700 dark:text-gray-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => onUnlinkTask(meeting.id, context.task.id)}
                              className="rounded-md border border-gray-200 p-1 text-gray-500 hover:text-gray-700 dark:border-gray-700 dark:text-gray-300"
                            >
                              Unlink
                            </button>
                            <button
                              onClick={() => onDeleteTask(context.tileId, context.task.id, meeting.id)}
                              className="rounded-md border border-red-200 p-1 text-red-500 hover:text-red-600 dark:border-red-900 dark:text-red-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#10131A]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Attachments</h3>
                  <div className="flex items-center gap-2">
                    {attachmentStatusBadge()}
                    <button
                      onClick={triggerAttachmentUpload}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-[#1A1D24]"
                      disabled={attachmentDirStatus === 'denied' || attachmentDirStatus === 'not-configured'}
                    >
                      <Paperclip className="w-3.5 h-3.5" /> Upload
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleAttachmentChange}
                      multiple
                      hidden
                    />
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {(meeting.attachments || []).length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">No files yet. Upload presentations, minutes, or recordings to keep everything together.</p>
                  ) : (
                    meeting.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs dark:border-gray-700 dark:bg-[#0F1115]">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <Paperclip className="w-3.5 h-3.5" />
                          <div>
                            <div className="font-medium text-gray-700 dark:text-gray-100">{attachment.name}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">{Math.round((attachment.size || 0) / 1024)} KB</div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => onAttachmentDownload(attachment)}
                            className="rounded-md border border-gray-200 px-2 py-1 text-gray-500 hover:text-indigo-500 dark:border-gray-700 dark:text-gray-300"
                          >
                            View
                          </button>
                          <button
                            onClick={() => onAttachmentDelete(attachment)}
                            className="rounded-md border border-red-200 px-2 py-1 text-red-500 hover:text-red-600 dark:border-red-900 dark:text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

MeetingEditor.propTypes = {
  meeting: PropTypes.shape({
    id: PropTypes.string.isRequired,
    projectId: PropTypes.string.isRequired,
    title: PropTypes.string,
    date: PropTypes.string,
    participants: PropTypes.string,
    agenda: PropTypes.string,
    summary: PropTypes.string,
    followUps: PropTypes.string,
    linkedTaskIds: PropTypes.arrayOf(PropTypes.string),
    attachments: PropTypes.array,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onAddTask: PropTypes.func.isRequired,
  onEditTask: PropTypes.func.isRequired,
  onUnlinkTask: PropTypes.func.isRequired,
  onDeleteTask: PropTypes.func.isRequired,
  taskLookup: PropTypes.instanceOf(Map).isRequired,
  onAttachmentUpload: PropTypes.func.isRequired,
  onAttachmentDownload: PropTypes.func.isRequired,
  onAttachmentDelete: PropTypes.func.isRequired,
  attachmentDirStatus: PropTypes.string.isRequired,
};

export default MeetingEditor;
