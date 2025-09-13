import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { Plus, X, CalendarCheck, Flag, CheckCircle, List, Calendar, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getAllProjectActivities, groupActivitiesByTimeRange } from '../../../shared/utils';
import TimelineGroup from './TimelineGroup';
import { CreateTaskModal } from '../../tasks';

const TimelineView = ({ 
  projects, 
  tiles, 
  meetings, 
  selectedProjectId, 
  onProjectChange,
  onProjectEdit,
  onProjectCreate,
  onTaskCreate,
  onTaskClick
}) => {
  const [timeRange, setTimeRange] = useState('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showTimelineDetail, setShowTimelineDetail] = useState(false);
  const [selectedTimelineActivity, setSelectedTimelineActivity] = useState(null);
  const [viewMode, setViewMode] = useState('tasks'); // 'tasks' or 'meetings'
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

  const activities = getAllProjectActivities(selectedProjectId, tiles, meetings);
  const groupedActivities = groupActivitiesByTimeRange(activities, timeRange, selectedDate);

  const handleActivityClick = (activity) => {
    setSelectedTimelineActivity(activity);
    setShowTimelineDetail(true);
    if (onTaskClick) {
      onTaskClick(activity);
    }
  };

  const handleCreateTask = (taskData) => {
    if (onTaskCreate) {
      onTaskCreate(taskData);
    }
    setShowCreateTaskModal(false);
  };

  const handleAddTask = () => {
    setShowCreateTaskModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex h-screen">
        {/* Project Sidebar */}
        <div className="w-80 bg-white rounded-xl shadow-md p-4 mr-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Projects</h3>
            <button
              onClick={onProjectCreate}
              className="text-purple-600 hover:text-purple-700"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-2">
            {projects.map(project => (
              <div
                key={project.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedProjectId === project.id 
                    ? 'bg-purple-50 border-2 border-purple-200' 
                    : 'hover:bg-gray-50 border-2 border-transparent'
                }`}
                onClick={() => onProjectChange(project.id)}
                onDoubleClick={() => onProjectEdit(project)}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{project.name}</h4>
                    <p className="text-xs text-gray-500 truncate">{project.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-xs text-gray-400">
                      {getAllProjectActivities(project.id, tiles, meetings).length}
                    </div>
                    {project.id !== 'proj-default' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onProjectEdit(project);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline View */}
        <div className="flex-1 bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {projects.find(p => p.id === selectedProjectId)?.name || 'Timeline'}
            </h2>
            
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  className={`flex items-center px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'tasks' 
                      ? 'bg-white text-purple-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  onClick={() => setViewMode('tasks')}
                >
                  <List className="w-4 h-4 mr-1" />
                  Tasks
                </button>
                <button
                  className={`flex items-center px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'meetings' 
                      ? 'bg-white text-purple-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  onClick={() => setViewMode('meetings')}
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Meetings
                </button>
              </div>

              {/* Time Range Selector */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                {['week', 'month', 'quarter', 'year'].map(range => (
                  <button
                    key={range}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      timeRange === range 
                        ? 'bg-white text-purple-700 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    onClick={() => setTimeRange(range)}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>

              {/* Add Task Button */}
              {viewMode === 'tasks' && (
                <button
                  onClick={handleAddTask}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </button>
              )}
            </div>
          </div>

          {/* Timeline Content */}
          <div className="h-full overflow-y-auto">
            {groupedActivities.length === 0 ? (
              <div className="text-center py-12">
                <CalendarCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-500 mb-2">
                  No {viewMode} yet
                </h3>
                <p className="text-gray-400">
                  Start by adding {viewMode === 'tasks' ? 'tasks' : 'meetings'} to this project.
                </p>
                {viewMode === 'tasks' && (
                  <button
                    onClick={handleAddTask}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Add Your First Task
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {groupedActivities.map((group, index) => (
                  <TimelineGroup
                    key={group.period}
                    group={group}
                    isCollapsed={index > 0}
                    onTaskClick={handleActivityClick}
                    onMeetingClick={handleActivityClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        {showTimelineDetail && selectedTimelineActivity && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="w-96 bg-white rounded-xl shadow-md p-4 ml-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {selectedTimelineActivity.label || selectedTimelineActivity.title}
              </h3>
              <button
                onClick={() => setShowTimelineDetail(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Type</label>
                <p className="text-sm">{selectedTimelineActivity.type === 'task' ? 'Task' : 'Meeting'}</p>
              </div>
              
              {selectedTimelineActivity.owner && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Owner</label>
                  <p className="text-sm">{selectedTimelineActivity.owner}</p>
                </div>
              )}
              
              {selectedTimelineActivity.date && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p className="text-sm">{format(parseISO(selectedTimelineActivity.date), 'MMM dd, yyyy')}</p>
                </div>
              )}
              
              {selectedTimelineActivity.prio && (
                <div className="flex items-center space-x-2">
                  <Flag className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-600 font-medium">High Priority</span>
                </div>
              )}
              
              {selectedTimelineActivity.done && (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600 font-medium">Completed</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Create Task Modal */}
        {showCreateTaskModal && (
          <CreateTaskModal
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSave={handleCreateTask}
            onClose={() => setShowCreateTaskModal(false)}
          />
        )}
      </div>
    </div>
  );
};

TimelineView.propTypes = {
  projects: PropTypes.array.isRequired,
  tiles: PropTypes.array.isRequired,
  meetings: PropTypes.array.isRequired,
  selectedProjectId: PropTypes.string.isRequired,
  onProjectChange: PropTypes.func.isRequired,
  onProjectEdit: PropTypes.func.isRequired,
  onProjectCreate: PropTypes.func.isRequired,
  onTaskCreate: PropTypes.func,
  onTaskClick: PropTypes.func,
};

export default TimelineView;
