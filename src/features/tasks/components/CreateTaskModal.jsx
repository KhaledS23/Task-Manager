import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { X, User, Flag, Tag, FileText, Calendar, Plus } from 'lucide-react';

const CreateTaskModal = ({
  projects,
  selectedProjectId,
  onSave,
  onClose,
  phases,
}) => {
  const availablePhases = useMemo(
    () => (Array.isArray(phases) && phases.length ? phases : ['Conceptual', 'Design', 'Validation', 'Startup']),
    [phases]
  );

  const [taskForm, setTaskForm] = useState({
    label: '',
    description: '',
    owner: '',
    dueDate: '',
    priority: 'normal',
    status: 'todo',
    category: availablePhases[0] || 'Conceptual',
    tags: [],
    projectId: selectedProjectId || 'proj-default',
  });
  const [newTag, setNewTag] = useState('');

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];
  const statusOptions = [
    { value: 'todo', label: 'To do' },
    { value: 'in-progress', label: 'In progress' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Done' },
  ];

  const handleSave = () => {
    if (!taskForm.label.trim()) {
      alert('Please enter a task label.');
      return;
    }
    const payload = {
      ...taskForm,
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      prio: taskForm.priority === 'high' || taskForm.priority === 'urgent',
      done: taskForm.status === 'done',
    };
    onSave(payload);
    onClose();
  };

  const addTag = () => {
    const value = newTag.trim();
    if (!value || taskForm.tags.includes(value)) return;
    setTaskForm((prev) => ({ ...prev, tags: [...prev.tags, value] }));
    setNewTag('');
  };

  const removeTag = (tag) => {
    setTaskForm((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-white via-gray-50 to-white shadow-2xl dark:border-gray-800 dark:from-[#0F131E] dark:via-[#111723] dark:to-[#0F131E]">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create task</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Compact capture designed for fast planning.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-gray-200 p-2 text-gray-400 hover:text-gray-700 dark:border-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <FileText className="w-4 h-4" /> Details
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Label *</label>
                <input
                  value={taskForm.label}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="Design review, outreach email…"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-white/5 dark:text-gray-100 dark:focus:ring-indigo-500/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Project</label>
                <div className="relative">
                  <select
                    value={taskForm.projectId}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, projectId: e.target.value }))}
                    className="w-full appearance-none rounded-2xl border border-gray-300 px-4 py-2 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-white/5 dark:text-gray-100 dark:focus:ring-indigo-500/40"
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">▾</span>
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Description</label>
              <textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="Add context, outcomes, or helpful links."
                className="w-full rounded-2xl border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-white/5 dark:text-gray-100 dark:focus:ring-indigo-500/40"
              />
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <User className="w-4 h-4" /> Assignment & timeline
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Owner</label>
                <input
                  value={taskForm.owner}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, owner: e.target.value }))}
                  placeholder="Name or @handle"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-white/5 dark:text-gray-100 dark:focus:ring-indigo-500/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Phase</label>
                <div className="relative">
                  <select
                    value={taskForm.category}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full appearance-none rounded-2xl border border-gray-300 px-4 py-2 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-white/5 dark:text-gray-100 dark:focus:ring-indigo-500/40"
                  >
                    {availablePhases.map((phase) => (
                      <option key={phase} value={phase}>
                        {phase}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">▾</span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Due date</label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-white/5 dark:text-gray-100 dark:focus:ring-indigo-500/40"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <Flag className="w-4 h-4" /> Priority & status
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Priority</label>
                <div className="relative">
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value }))}
                    className="w-full appearance-none rounded-2xl border border-gray-300 px-4 py-2 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-white/5 dark:text-gray-100 dark:focus:ring-indigo-500/40"
                  >
                    {priorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">▾</span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</label>
                <div className="relative">
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full appearance-none rounded-2xl border border-gray-300 px-4 py-2 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-white/5 dark:text-gray-100 dark:focus:ring-indigo-500/40"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">▾</span>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <Tag className="w-4 h-4" /> Tags
            </div>
            <div className="flex flex-wrap gap-2">
              {taskForm.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-[11px] text-gray-700 dark:border-gray-700 dark:bg-[#1A1D24] dark:text-gray-100">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tag"
                className="flex-1 rounded-2xl border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-white/5 dark:text-gray-100 dark:focus:ring-indigo-500/40"
              />
              <button
                onClick={addTag}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-[#1A1D24]"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-white/10">
          <button
            onClick={onClose}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-[#1A1D24]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-400/40 transition hover:bg-indigo-500"
          >
            Create task
          </button>
        </div>
      </div>
    </div>
  );
};

CreateTaskModal.propTypes = {
  projects: PropTypes.array.isRequired,
  selectedProjectId: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  phases: PropTypes.arrayOf(PropTypes.string),
};

CreateTaskModal.defaultProps = {
  selectedProjectId: 'proj-default',
  phases: undefined,
};

export default CreateTaskModal;
