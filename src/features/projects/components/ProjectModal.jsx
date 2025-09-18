import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import { PROJECT_COLORS } from '../../../shared/utils';

const ProjectModal = ({ project, projects, onSave, onClose }) => {
  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    color: project?.color || '#3B82F6',
    status: project?.status || 'active',
    startDate: project?.startDate || new Date().toISOString().split('T')[0],
    endDate: project?.endDate || '',
  });

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({
      ...form,
      endDate: form.endDate || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-gradient-to-br from-white via-gray-50 to-white p-6 shadow-2xl dark:border-gray-800 dark:from-[#0F131E] dark:via-[#111724] dark:to-[#0F131E]">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {project ? 'Edit project' : 'Create project'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Set the tone, timeline, and team scope for this initiative.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-gray-200 p-2 text-gray-400 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-5">
          <label className="grid gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Project name</span>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Internal codename or campaign title"
              className="rounded-2xl border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-white/5 dark:text-gray-100 dark:focus:ring-indigo-500/40"
            />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="What are we shipping?"
              rows={3}
              className="rounded-2xl border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-white/5 dark:text-gray-100 dark:focus:ring-indigo-500/40"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Start</span>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                className="rounded-2xl border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-white/5 dark:text-gray-100 dark:focus:ring-indigo-500/40"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Target wrap</span>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                className="rounded-2xl border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-white/5 dark:text-gray-100 dark:focus:ring-indigo-500/40"
              />
            </label>
          </div>

          <div className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Color</span>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setForm((prev) => ({ ...prev, color }))}
                  className={`h-9 w-9 rounded-full border-2 transition ${
                    form.color === color ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-500/40' : 'border-white shadow-sm'
                  }`}
                  style={{ background: color }}
                />
              ))}
            </div>
          </div>

          <label className="grid gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</span>
            <div className="relative">
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full appearance-none rounded-2xl border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-white/5 dark:text-gray-100 dark:focus:ring-indigo-500/40"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on-hold">On hold</option>
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">▾</span>
            </div>
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-200 pt-4 dark:border-white/10">
          <button
            onClick={onClose}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-[#1A1D24]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-400/40 transition hover:bg-indigo-500"
          >
            {project ? 'Save changes' : 'Create project'}
          </button>
        </div>
      </div>
    </div>
  );
};

ProjectModal.propTypes = {
  project: PropTypes.object,
  projects: PropTypes.array,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ProjectModal;
