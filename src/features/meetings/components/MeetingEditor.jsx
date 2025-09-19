import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import ReactQuill from 'react-quill';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Plus,
  Sparkles,
  Trash2,
  Users,
  Paperclip,
  Link as LinkIcon,
} from 'lucide-react';

import 'react-quill/dist/quill.snow.css';
import './MeetingEditor.css';

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

const attachmentStatusBadge = (status) => {
  switch (status) {
    case 'granted':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
          <CheckCircle2 className="w-3 h-3" /> Synced
        </span>
      );
    case 'denied':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500">
          Permission needed
        </span>
      );
    case 'not-configured':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 px-2 py-0.5 text-[10px] font-medium text-gray-500">
          No folder
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 px-2 py-0.5 text-[10px] font-medium text-gray-500">
          Checking…
        </span>
      );
  }
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
  onAttachmentUnlink,
  onAttachmentLink,
  attachmentDirStatus,
  presentation = 'modal',
}) => {
  const buildFormState = (meetingData) => ({
    title: meetingData.title || 'Untitled meeting',
    date: meetingData.date || new Date().toISOString().slice(0, 10),
    participants: meetingData.participants || '',
    summary: meetingData.summary || '',
  });

  const [form, setForm] = useState(() => buildFormState(meeting));
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const initialFormRef = useRef(buildFormState(meeting));

  useEffect(() => {
    const nextState = buildFormState(meeting);
    setForm(nextState);
    initialFormRef.current = nextState;
  }, [meeting]);

  const linkedTasks = useMemo(() => {
    return (meeting.linkedTaskIds || [])
      .map((taskId) => ({ taskId, context: taskLookup.get(taskId) }))
      .filter(({ context }) => Boolean(context));
  }, [meeting.linkedTaskIds, taskLookup]);

  const isDirty = useMemo(() => {
    const initial = initialFormRef.current;
    return Object.keys(initial).some((key) => (initial[key] || '') !== (form[key] || ''));
  }, [form]);

  const handleField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitSave = async () => {
    setSaving(true);
    try {
      await onSave(meeting.id, form);
      initialFormRef.current = { ...form };
      return true;
    } catch (err) {
      console.error('Failed to save meeting', err);
      alert('Unable to save meeting changes right now. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleBack = async () => {
    if (isDirty) {
      const shouldSave = window.confirm('Save changes before going back? Press OK to save, Cancel to choose whether to discard.');
      if (shouldSave) {
        const saved = await submitSave();
        if (saved) {
          onClose();
        }
        return;
      }
      const discard = window.confirm('Discard unsaved changes and go back?');
      if (!discard) {
        return;
      }
    }
    onClose();
  };

  const triggerUpload = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  };

  const handleAttachmentChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    await onAttachmentUpload({ projectId: meeting.projectId, meetingId: meeting.id, files });
  };

  const handleAttachmentLink = () => {
    const hrefInput = window.prompt('Enter file path or URL to link');
    const href = hrefInput?.trim();
    if (!href) return;
    const defaultName = href.split(/[\\/]/).pop() || 'Linked file';
    const nameInput = window.prompt('Display name for this link', defaultName);
    const name = (nameInput && nameInput.trim()) || defaultName;
    onAttachmentLink({ projectId: meeting.projectId, meetingId: meeting.id, href, name });
  };

  const attachments = Array.isArray(meeting.attachments) ? meeting.attachments : [];
  const isModal = presentation === 'modal';

  const editorShellClass = isModal
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'
    : 'w-full';
  const editorBodyClass = isModal
    ? 'relative h-full w-full max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-white via-gray-50 to-white shadow-2xl dark:from-[#0E111A] dark:via-[#11141D] dark:to-[#0E111A]'
    : 'rounded-3xl border border-gray-200 bg-gradient-to-br from-white via-gray-50 to-white shadow-xl dark:border-gray-800 dark:from-[#0E111A] dark:via-[#11141D] dark:to-[#0E111A]';

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        onClick={submitSave}
        disabled={saving}
        className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-60"
      >
        <Sparkles className="w-3.5 h-3.5" />
        {saving ? 'Saving…' : 'Save changes'}
      </button>
      <button
        onClick={() => {
          if (confirm('Permanently delete this meeting and its attachments?')) {
            onDelete(meeting.id);
          }
        }}
        className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-900/30"
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete
      </button>
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-[#1A1D24]"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>
    </div>
  );

  return (
    <div className={editorShellClass}>
      <div className={editorBodyClass}>
        <div className="flex flex-col">
          <div className="border-b border-white/40 px-6 py-5 backdrop-blur dark:border-white/5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <input
                  value={form.title}
                  onChange={(e) => handleField('title', e.target.value)}
                  className="w-full min-w-[240px] rounded-xl border border-transparent bg-white/60 px-4 py-2 text-lg font-semibold text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:bg-white/10 dark:text-gray-100 dark:shadow-none dark:focus:ring-indigo-500/40"
                  placeholder="Meeting title"
                />
                <p className="mt-1 text-[12px] text-gray-500 dark:text-gray-400">
                  Meeting notes stay in sync with tasks, attachments, and project metadata.
                </p>
              </div>
              {headerActions}
            </div>
          </div>

          <div className="grid gap-6 px-6 pb-6 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-white/5">
                  <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <CalendarDays className="w-3.5 h-3.5" /> Date
                  </span>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => handleField('date', e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-white/5 dark:text-gray-100 dark:focus:ring-indigo-500/40"
                  />
                </label>
                <label className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-white/5 sm:col-span-2">
                  <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <Users className="w-3.5 h-3.5" /> Participants
                  </span>
                  <input
                    type="text"
                    value={form.participants}
                    onChange={(e) => handleField('participants', e.target.value)}
                    placeholder="Comma-separated names"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-white/5 dark:text-gray-100 dark:focus:ring-indigo-500/40"
                  />
                </label>
              </div>

              <div className="rounded-[28px] bg-white/95 shadow-xl ring-1 ring-indigo-100/70 backdrop-blur dark:bg-[#111624]/95 dark:ring-indigo-500/20">
                <div className="flex items-center justify-between gap-3 px-6 pt-6">
                  <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-300" /> Summary
                  </span>
                  <span className="hidden rounded-full bg-gray-100 px-3 py-1 text-[10px] font-medium text-gray-500 dark:bg-white/10 dark:text-gray-300 sm:inline-flex">
                    Rich text
                  </span>
                </div>
                <div className="px-4 pb-6 pt-2">
                  <ReactQuill
                    theme="snow"
                    modules={quillModules}
                    value={form.summary}
                    onChange={(value) => handleField('summary', value)}
                    className="meeting-summary-editor"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-200 bg-white/85 p-4 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Associated tasks</h3>
                  <button
                    onClick={() => onAddTask(meeting.id)}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1.5 text-[11px] font-medium text-white shadow hover:bg-indigo-500"
                  >
                    <Plus className="w-3.5 h-3.5" /> New task
                  </button>
                </div>
                {linkedTasks.length === 0 ? (
                  <p className="mt-3 text-[12px] text-gray-500 dark:text-gray-400">
                    No tasks yet. Create action items here and they’ll appear in the project board automatically.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {linkedTasks.map(({ taskId, context }) => (
                      <div key={taskId} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-gray-700 dark:bg-[#0F1115] dark:text-gray-100">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-gray-800 dark:text-gray-100">{context.task.label}</div>
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
                              className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-500 hover:text-indigo-500 dark:border-gray-700 dark:text-gray-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => onUnlinkTask(meeting.id, context.task.id)}
                              className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-500 hover:text-gray-700 dark:border-gray-700 dark:text-gray-300"
                            >
                              Unlink
                            </button>
                            <button
                              onClick={() => onDeleteTask(context.tileId, context.task.id, meeting.id)}
                              className="rounded-md border border-red-200 px-2 py-1 text-[11px] text-red-500 hover:text-red-600 dark:border-red-900 dark:text-red-300"
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

              <div className="rounded-2xl border border-gray-200 bg-white/85 p-4 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Attachments</h3>
                  <div className="flex items-center gap-2">
                    {attachmentStatusBadge(attachmentDirStatus)}
                    <button
                      onClick={triggerUpload}
                      disabled={attachmentDirStatus !== 'granted'}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-gray-600 transition hover:text-indigo-500 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
                    >
                      <Paperclip className="w-3.5 h-3.5" /> Upload
                    </button>
                    <button
                      onClick={handleAttachmentLink}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-gray-600 transition hover:text-indigo-500 dark:border-gray-700 dark:text-gray-300"
                    >
                      <LinkIcon className="w-3.5 h-3.5" /> Link file
                    </button>
                    <input ref={fileInputRef} type="file" multiple hidden onChange={handleAttachmentChange} />
                  </div>
                </div>
                {attachments.length === 0 ? (
                  <p className="mt-3 text-[12px] text-gray-500 dark:text-gray-400">No supporting files yet. Drop slides, transcripts, or recordings here.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {attachments.map((attachment) => {
                      const isLink = attachment.storageType === 'link' || attachment.type === 'link' || Boolean(attachment.href);
                      return (
                        <div key={attachment.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-gray-700 dark:bg-[#0F1115] dark:text-gray-100">
                          <div className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                            {isLink ? (
                              <LinkIcon className="w-3.5 h-3.5 mt-0.5" />
                            ) : (
                              <Paperclip className="w-3.5 h-3.5 mt-0.5" />
                            )}
                            <div>
                              <button
                                onClick={() => onAttachmentDownload(attachment)}
                                className="text-left font-medium text-gray-800 underline-offset-4 hover:underline dark:text-gray-100"
                              >
                                {attachment.name}
                              </button>
                              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                {isLink
                                  ? 'Linked file'
                                  : `${Math.round((attachment.size || 0) / 1024)} KB`}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {attachment.meetingId && (
                              <button
                                onClick={() => onAttachmentUnlink(attachment)}
                                className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-500 hover:text-indigo-500 dark:border-gray-700 dark:text-gray-300"
                              >
                                Unlink
                              </button>
                            )}
                            <button
                              onClick={() => onAttachmentDownload(attachment)}
                              className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-500 hover:text-indigo-500 dark:border-gray-700 dark:text-gray-300"
                            >
                              Open
                            </button>
                            <button
                              onClick={() => onAttachmentDelete(attachment)}
                              className="rounded-md border border-red-200 px-2 py-1 text-[11px] text-red-500 hover:text-red-600 dark:border-red-900 dark:text-red-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
  onAttachmentUnlink: PropTypes.func.isRequired,
  onAttachmentLink: PropTypes.func.isRequired,
  attachmentDirStatus: PropTypes.string.isRequired,
  presentation: PropTypes.oneOf(['modal', 'inline']),
};

// default props moved to parameter defaults

export default MeetingEditor;
