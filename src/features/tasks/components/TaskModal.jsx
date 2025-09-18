import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { X, Flag, Tag, FileText, Clock } from 'lucide-react';

const DEFAULT_PHASES = ['Conceptual', 'Design', 'Validation', 'Startup'];

const TaskModal = ({ tileId, taskId, tiles, projects, updateTask, onClose, phases }) => {
  const tile = tiles.find((t) => t.id === tileId);
  if (!tile) return null;
  const task = tile.tasks.find((t) => t.id === taskId);
  if (!task) return null;
  const availablePhases = useMemo(() => {
    const base = Array.isArray(phases) && phases.length ? [...phases] : [...DEFAULT_PHASES];
    if (task.category && !base.includes(task.category)) {
      base.push(task.category);
    }
    return base;
  }, [phases, task.category]);
  
  const [taskForm, setTaskForm] = useState({
    label: task.label,
    description: task.description || '',
    owner: task.owner || '',
    dueDate: task.dueDate || '',
    priority: task.priority || (task.prio ? 'high' : 'normal'),
    status: task.status || (task.done ? 'done' : 'todo'),
    category: task.category || tile.title || availablePhases[0] || '',
    tags: Array.isArray(task.tags) ? task.tags : [],
    prio: task.prio || false,
    done: task.done || false,
    projectId: tile.projectId || 'proj-default',
  });

  const [newTag, setNewTag] = useState('');

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  const statusOptions = [
    { value: 'todo', label: 'To Do' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Done' },
  ];

  const handleSave = () => {
    const updates = {
      label: taskForm.label,
      description: taskForm.description,
      owner: taskForm.owner,
      dueDate: taskForm.dueDate || null,
      priority: taskForm.priority,
      status: taskForm.status,
      category: taskForm.category,
      tags: taskForm.tags,
      prio: taskForm.priority === 'high' || taskForm.priority === 'urgent',
      done: taskForm.status === 'done' || taskForm.done,
      updatedAt: new Date().toISOString(),
    };

    // Track completion timestamp
    const wasDone = !!task.done;
    const isDone = !!updates.done;
    if (isDone && !wasDone && !task.completedAt) {
      updates.completedAt = new Date().toISOString();
    }
    if (!isDone) {
      updates.completedAt = null;
    }

    updateTask(tileId, taskId, updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto dark:bg-[#0F1115] dark:text-gray-200 dark:border dark:border-gray-800">
        <div className="p-6">
          <div className="flex justify-between items-center border-b pb-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Task</h2>
            <button onClick={onClose} className="px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors dark:hover:bg-[#1A1D24]">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Task Label *</label>
                  <input
                    type="text"
                    value={taskForm.label}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, label: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-transparent dark:bg-[#0F1115] dark:border-gray-700 dark:focus:ring-gray-600"
                    placeholder="Enter task title..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Owner</label>
                  <input
                    type="text"
                    value={taskForm.owner}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, owner: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-transparent dark:bg-[#0F1115] dark:border-gray-700 dark:focus:ring-gray-600"
                    placeholder="Assignee..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phase</label>
                  <div className="relative">
                    <select
                      value={taskForm.category}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, category: e.target.value }))}
                      className="appearance-none w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-gray-500 focus:border-transparent dark:bg-[#0F1115] dark:border-gray-700 dark:focus:ring-gray-600"
                    >
                      {availablePhases.map((phase) => (
                        <option key={phase} value={phase}>{phase}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">▾</span>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-transparent dark:bg-[#0F1115] dark:border-gray-700 dark:focus:ring-gray-600"
                    rows={3}
                    placeholder="Add details..."
                  />
                </div>
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Due Date
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.dueDate || ''}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-transparent dark:bg-[#0F1115] dark:border-gray-700 dark:focus:ring-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Priority & Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Flag className="w-5 h-5 mr-2" />
                Priority & Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                  <div className="relative">
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                      className="appearance-none w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-gray-500 focus:border-transparent dark:bg-[#0F1115] dark:border-gray-700 dark:focus:ring-gray-600"
                    >
                      {priorityOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">▾</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                  <div className="relative">
                    <select
                      value={taskForm.status}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, status: e.target.value }))}
                      className="appearance-none w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-gray-500 focus:border-transparent dark:bg-[#0F1115] dark:border-gray-700 dark:focus:ring-gray-600"
                    >
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">▾</span>
                  </div>
                </div>
              </div>
            </div>

            {/* No time tracking section per requirements */}

            {/* Tags */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Tag className="w-5 h-5 mr-2" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {taskForm.tags.map((tag, index) => (
                  <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm bg-gray-100 text-gray-800 dark:bg-[#1A1D24] dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                    {tag}
                    <button
                      onClick={() => setTaskForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))}
                      className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newTag.trim() && !taskForm.tags.includes(newTag.trim())) {
                        setTaskForm(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
                        setNewTag('');
                      }
                    }
                  }}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-transparent dark:bg-[#0F1115] dark:border-gray-700 dark:focus:ring-gray-600"
                  placeholder="Add a tag..."
                />
                <button
                  onClick={() => {
                    if (newTag.trim() && !taskForm.tags.includes(newTag.trim())) {
                      setTaskForm(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
                      setNewTag('');
                    }
                  }}
                  className="px-4 py-2 rounded-md border border-gray-300 text-gray-800 bg-white hover:bg-gray-100 transition-colors dark:border-gray-700 dark:text-gray-100 dark:bg-[#1A1D24] dark:hover:bg-[#232734]"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
            <button onClick={onClose} className="px-5 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors dark:border-gray-700 dark:text-gray-200 dark:hover:bg-[#1A1D24]">Cancel</button>
            <button onClick={handleSave} className="px-5 py-2 rounded-md border border-gray-300 text-gray-800 bg-white hover:bg-gray-100 transition-colors font-medium dark:border-gray-700 dark:text-gray-100 dark:bg-[#1A1D24] dark:hover:bg-[#232734]">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
};

TaskModal.propTypes = {
  tileId: PropTypes.string.isRequired,
  taskId: PropTypes.string.isRequired,
  tiles: PropTypes.array.isRequired,
  projects: PropTypes.array.isRequired,
  updateTask: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  phases: PropTypes.arrayOf(PropTypes.string),
};

TaskModal.defaultProps = {
  phases: DEFAULT_PHASES,
};

export default TaskModal;
