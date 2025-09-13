import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { X, Calendar, User, Flag, Tag, FileText } from 'lucide-react';

const CreateTaskModal = ({ 
  projects, 
  selectedProjectId, 
  onSave, 
  onClose 
}) => {
  const [taskForm, setTaskForm] = useState({
    label: '',
    description: '',
    owner: '',
    dueDate: '',
    priority: 'normal', // low, normal, high, urgent
    status: 'todo', // todo, in-progress, review, done
    category: '',
    tags: [],
    projectId: selectedProjectId || 'proj-default',
  });

  const [newTag, setNewTag] = useState('');

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'text-green-600' },
    { value: 'normal', label: 'Normal', color: 'text-blue-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' },
  ];

  const statusOptions = [
    { value: 'todo', label: 'To Do', color: 'text-gray-600' },
    { value: 'in-progress', label: 'In Progress', color: 'text-blue-600' },
    { value: 'review', label: 'Review', color: 'text-yellow-600' },
    { value: 'done', label: 'Done', color: 'text-green-600' },
  ];

  const handleSave = () => {
    if (!taskForm.label.trim()) {
      alert('Please enter a task label');
      return;
    }

    const taskData = {
      ...taskForm,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      done: taskForm.status === 'done',
      prio: taskForm.priority === 'high' || taskForm.priority === 'urgent',
    };

    onSave(taskData);
    onClose();
  };

  const addTag = () => {
    if (newTag.trim() && !taskForm.tags.includes(newTag.trim())) {
      setTaskForm(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setTaskForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto dark:bg-[#0F1115] dark:text-gray-200 dark:border dark:border-gray-800">
        <div className="p-6">
          <div className="flex justify-between items-center border-b pb-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create New Task</h2>
            <button 
              onClick={onClose} 
              className="px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors dark:hover:bg-[#1A1D24]"
            >
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Label *
                  </label>
                  <input
                    type="text"
                    value={taskForm.label}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, label: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-transparent dark:bg-[#0F1115] dark:border-gray-700 dark:focus:ring-gray-600"
                    placeholder="Enter task title..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project</label>
                  <div className="relative">
                    <select
                      value={taskForm.projectId}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, projectId: e.target.value }))}
                      className="appearance-none w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-gray-500 focus:border-transparent dark:bg-[#0F1115] dark:border-gray-700 dark:focus:ring-gray-600"
                    >
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">▾</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-transparent dark:bg-[#0F1115] dark:border-gray-700 dark:focus:ring-gray-600"
                  rows={3}
                  placeholder="Enter task description..."
                />
              </div>
            </div>

            {/* Assignment & Due Date */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Assignment & Due Date
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Owner
                  </label>
                  <input
                    type="text"
                    value={taskForm.owner}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, owner: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-transparent dark:bg-[#0F1115] dark:border-gray-700 dark:focus:ring-gray-600"
                    placeholder="Assign to..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={taskForm.category}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-transparent dark:bg-[#0F1115] dark:border-gray-700 dark:focus:ring-gray-600"
                    placeholder="e.g., Development, Design, Research"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskForm.dueDate}
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

            {/* No time tracking per requirements */}

            {/* Tags */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Tag className="w-5 h-5 mr-2" />
                Tags
              </h3>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {taskForm.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm bg-gray-100 text-gray-800 dark:bg-[#1A1D24] dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
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
                  onKeyPress={handleKeyPress}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-transparent dark:bg-[#0F1115] dark:border-gray-700 dark:focus:ring-gray-600"
                  placeholder="Add a tag..."
                />
                <button
                  onClick={addTag}
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
            <button onClick={handleSave} className="px-5 py-2 rounded-md border border-gray-300 text-gray-800 bg-white hover:bg-gray-100 transition-colors font-medium dark:border-gray-700 dark:text-gray-100 dark:bg-[#1A1D24] dark:hover:bg-[#232734]">Create Task</button>
          </div>
        </div>
      </div>
    </div>
  );
};

CreateTaskModal.propTypes = {
  projects: PropTypes.array.isRequired,
  selectedProjectId: PropTypes.string.isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default CreateTaskModal;
