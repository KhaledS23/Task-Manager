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
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 dark:bg-[#0F1115] dark:text-gray-200 dark:border dark:border-gray-800">
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="font-semibold text-lg dark:text-gray-100">
            {project ? 'Edit Project' : 'Create Project'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#1A1D24]">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Project Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 dark:bg-[#0F1115] dark:border-gray-700"
              placeholder="Enter project name..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 dark:bg-[#0F1115] dark:border-gray-700"
              placeholder="Add project description..."
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-1">Color</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setForm(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-full border-2 ${
                    form.color === color ? 'border-gray-800 dark:border-gray-500' : 'border-gray-300 dark:border-gray-700'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 dark:bg-[#0F1115] dark:border-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 dark:bg-[#0F1115] dark:border-gray-700"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-1">Status</label>
            <div className="relative">
              <select
                value={form.status}
                onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                className="appearance-none w-full border border-gray-300 rounded px-3 py-2 pr-8 dark:bg-[#0F1115] dark:border-gray-700"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on-hold">On Hold</option>
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">▾</span>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 rounded-md border border-gray-300 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-[#1A1D24]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-800 bg-white hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:bg-[#1A1D24] dark:hover:bg-[#232734]"
          >
            {project ? 'Update' : 'Create'} Project
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
