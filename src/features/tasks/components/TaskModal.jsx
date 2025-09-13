import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';

const TaskModal = ({ tileId, taskId, tiles, projects, updateTask, onClose }) => {
  const tile = tiles.find((t) => t.id === tileId);
  if (!tile) return null;
  const task = tile.tasks.find((t) => t.id === taskId);
  if (!task) return null;
  
  const [taskForm, setTaskForm] = useState({
    label: task.label,
    owner: task.owner || '',
    date: task.date || '',
    prio: task.prio || false,
    done: task.done || false,
    projectId: tile.projectId || 'proj-default',
  });

  const handleSave = () => {
    updateTask(tileId, taskId, {
      label: taskForm.label,
      owner: taskForm.owner,
      date: taskForm.date || null,
      prio: taskForm.prio,
      done: taskForm.done,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="font-semibold text-lg">Edit Task</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold mb-1">Label</label>
            <input
              type="text"
              value={taskForm.label}
              onChange={(e) => setTaskForm((prev) => ({ ...prev, label: e.target.value }))}
              className="w-full border border-gray-300 rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Owner</label>
            <input
              type="text"
              value={taskForm.owner}
              onChange={(e) => setTaskForm((prev) => ({ ...prev, owner: e.target.value }))}
              className="w-full border border-gray-300 rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Date</label>
            <input
              type="date"
              value={taskForm.date || ''}
              onChange={(e) => setTaskForm((prev) => ({ ...prev, date: e.target.value }))}
              className="w-full border border-gray-300 rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Project</label>
            <select
              value={taskForm.projectId}
              onChange={(e) => setTaskForm((prev) => ({ ...prev, projectId: e.target.value }))}
              className="w-full border border-gray-300 rounded px-2 py-1"
            >
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={taskForm.prio}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, prio: e.target.checked }))}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm">High Priority</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={taskForm.done}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, done: e.target.checked }))}
                className="w-4 h-4 accent-green-600"
              />
              <span className="text-sm">Done</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-2 pt-2 border-t">
          <button
            onClick={onClose}
            className="px-3 py-1 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
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
};

export default TaskModal;
