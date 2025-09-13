import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { Plus, X, CalendarCheck, Filter, Calendar, List, ChevronDown, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getAllProjectActivities, groupActivitiesByTimeRange } from '../../../shared/utils';
import TimelineGroup from './TimelineGroup';
import { CreateTaskModal, TaskModal } from '../../tasks';

const TimelineView = ({ 
  projects, 
  tiles, 
  meetings, 
  selectedProjectId, 
  onProjectChange,
  onProjectEdit,
  onProjectCreate,
  onProjectDelete,
  onTaskCreate,
  onTaskClick,
  updateTask,
  removeTask
}) => {
  const [timeRange, setTimeRange] = useState('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTaskInfo, setSelectedTaskInfo] = useState(null);
  const [viewMode, setViewMode] = useState('tasks'); // 'tasks' or 'meetings'
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Use effective date: dueDate for open tasks; completedAt for done
  const [ownerFilter, setOwnerFilter] = useState([]); // array of owners
  const [tagFilter, setTagFilter] = useState([]); // array of tags
  const [categoryFilter, setCategoryFilter] = useState([]); // array of categories (tile titles)
  const [priorityFilter, setPriorityFilter] = useState([]); // array of priorities: low|normal|high|urgent

  const allActivities = getAllProjectActivities(selectedProjectId, tiles, meetings);

  const taskActivities = useMemo(() => allActivities.filter(a => a.type === 'task'), [allActivities]);
  const meetingActivities = useMemo(() => allActivities.filter(a => a.type === 'meeting'), [allActivities]);

  const taskFilterOptions = useMemo(() => {
    const owners = new Set();
    const tags = new Set();
    const categories = new Set();
    const priorities = new Set(['low', 'normal', 'high', 'urgent']);
    taskActivities.forEach(t => {
      if (t.owner) owners.add(t.owner);
      if (Array.isArray(t.tags)) t.tags.forEach(tag => tags.add(tag));
      if (t.tileTitle) categories.add(t.tileTitle);
    });
    return {
      owners: Array.from(owners),
      tags: Array.from(tags),
      categories: Array.from(categories),
      priorities: Array.from(priorities),
    };
  }, [taskActivities]);

  const isTaskOverdue = (t) => {
    if (t.done) return false;
    const due = t.dueDate;
    if (!due) return false;
    try { return parseISO(due) < new Date(); } catch { return false; }
  };

  const getTaskDateForGrouping = (t) => {
    return t.done && t.completedAt ? t.completedAt : (t.dueDate || null);
  };

  const filteredTasksForGrouping = useMemo(() => {
    // Apply selected filters
    const matchesFilters = (t) => {
      if (ownerFilter.length && (!t.owner || !ownerFilter.includes(t.owner))) return false;
      if (priorityFilter.length) {
        const priority = t.priority || (t.prio ? 'high' : 'normal');
        if (!priorityFilter.includes(priority)) return false;
      }
      if (categoryFilter.length) {
        const cat = t.tileTitle || t.category || '';
        if (!categoryFilter.includes(cat)) return false;
      }
      if (tagFilter.length) {
        const tTags = Array.isArray(t.tags) ? t.tags : [];
        if (!tTags.some(tag => tagFilter.includes(tag))) return false;
      }
      return true;
    };

    return taskActivities
      .filter(matchesFilters)
      .map(t => ({ ...t, date: getTaskDateForGrouping(t), overdue: isTaskOverdue(t) }))
      .filter(t => !!t.date);
  }, [taskActivities, ownerFilter, tagFilter, categoryFilter, priorityFilter]);

  const groupedActivities = useMemo(() => {
    const source = viewMode === 'tasks' ? filteredTasksForGrouping : meetingActivities;
    return groupActivitiesByTimeRange(source, timeRange, selectedDate);
  }, [filteredTasksForGrouping, meetingActivities, timeRange, selectedDate, viewMode]);

  const handleActivityClick = (activity) => {
    if (activity.type === 'task') {
      setSelectedTaskInfo({ tileId: activity.tileId, taskId: activity.id });
    }
    onTaskClick && onTaskClick(activity);
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
        <div className="w-80 bg-white rounded-xl shadow-md p-3.5 mr-4 dark:bg-[#0F1115] dark:border dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Projects</h3>
            <button
              onClick={onProjectCreate}
              className="text-gray-500 hover:text-gray-300"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-2 text-xs">
            {projects.map(project => (
              <div
                key={project.id}
                className={`p-2.5 rounded-md cursor-pointer transition-colors text-gray-700 dark:text-gray-300 border ${
                  selectedProjectId === project.id 
                    ? 'bg-gray-50 border-gray-300 dark:bg-[#1A1D24] dark:border-gray-700' 
                    : 'bg-white border-transparent hover:bg-gray-50 dark:bg-[#0F1115] dark:hover:bg-[#1A1D24]'
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
                    <h4 className="font-medium text-sm truncate dark:text-gray-200">{project.name}</h4>
                    <p className="text-xs text-gray-500 truncate dark:text-gray-400">{project.description}</p>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {getAllProjectActivities(project.id, tiles, meetings).length}
                    </div>
                    {project.id !== 'proj-default' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onProjectEdit(project);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-200 rounded dark:hover:bg-[#1A1D24]"
                          title="Edit project"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this project?')) onProjectDelete(project.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-400 rounded dark:hover:bg-[#1A1D24]"
                          title="Delete project"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline View */}
        <div className="flex-1 bg-white rounded-xl shadow-md p-4 dark:bg-[#0F1115] dark:border dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium tracking-wide text-gray-500 dark:text-gray-400 uppercase">Timeline</h2>
            
            <div className="flex items-center space-x-3 text-xs">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1 dark:bg-[#1A1D24]">
                <button
                  className={`flex items-center px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'tasks' 
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-[#232734] dark:text-gray-100 border border-gray-200 dark:border-gray-700' 
                      : 'text-gray-600 hover:text-gray-800 dark:text-gray-300'
                  }`}
                  onClick={() => setViewMode('tasks')}
                >
                  <List className="w-4 h-4 mr-1" />
                  Tasks
                </button>
                <button
                  className={`flex items-center px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'meetings' 
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-[#232734] dark:text-gray-100 border border-gray-200 dark:border-gray-700' 
                      : 'text-gray-600 hover:text-gray-800 dark:text-gray-300'
                  }`}
                  onClick={() => setViewMode('meetings')}
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Meetings
                </button>
              </div>

              {/* Time Range Selector */}
              <div className="flex bg-gray-100 rounded-lg p-1 dark:bg-[#1A1D24]">
                {['week', 'month', 'quarter', 'year'].map(range => (
                  <button
                    key={range}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      timeRange === range 
                        ? 'bg-white text-purple-700 shadow-sm dark:bg-white dark:text-purple-700' 
                        : 'text-gray-600 hover:text-gray-800 dark:text-gray-300'
                    }`}
                    onClick={() => setTimeRange(range)}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>

              {/* Group By removed per requirement; timeline uses effective date */}

              {/* Filters */}
              {viewMode === 'tasks' && (
                <div className="relative">
                  <button
                    onClick={() => setFiltersOpen(v => !v)}
                    className="flex items-center px-3 py-2 bg-gray-100 rounded-lg text-gray-800 hover:bg-gray-200 dark:bg-[#1A1D24] dark:text-gray-200 dark:hover:bg-[#232734] border border-gray-200 dark:border-gray-700"
                  >
                    <Filter className="w-4 h-4 mr-1" /> Filters
                    <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {filtersOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-3 space-y-3 dark:bg-[#0F1115] dark:border-gray-800">
                      <div>
                        <div className="text-xs font-semibold text-gray-500 mb-1">Owner</div>
                        <div className="flex flex-wrap gap-2 max-h-24 overflow-auto">
                          {taskFilterOptions.owners.length === 0 && (
                            <span className="text-xs text-gray-400">No owners</span>
                          )}
                          {taskFilterOptions.owners.map(owner => {
                            const active = ownerFilter.includes(owner);
                            return (
                              <button
                                key={owner}
                                onClick={() => setOwnerFilter(prev => active ? prev.filter(o => o !== owner) : [...prev, owner])}
                                className={`px-2 py-1 rounded-md border text-xs ${active ? 'bg-gray-100 dark:bg-[#232734] border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100' : 'bg-transparent border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
                              >
                                {owner}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 mb-1">Tags</div>
                        <div className="flex flex-wrap gap-2 max-h-24 overflow-auto">
                          {taskFilterOptions.tags.length === 0 && (
                            <span className="text-xs text-gray-400">No tags</span>
                          )}
                          {taskFilterOptions.tags.map(tag => {
                            const active = tagFilter.includes(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => setTagFilter(prev => active ? prev.filter(t => t !== tag) : [...prev, tag])}
                                className={`px-2 py-1 rounded-md border text-xs ${active ? 'bg-gray-100 dark:bg-[#232734] border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100' : 'bg-transparent border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 mb-1">Category</div>
                        <div className="flex flex-wrap gap-2 max-h-24 overflow-auto">
                          {taskFilterOptions.categories.length === 0 && (
                            <span className="text-xs text-gray-400">No categories</span>
                          )}
                          {taskFilterOptions.categories.map(cat => {
                            const active = categoryFilter.includes(cat);
                            return (
                              <button
                                key={cat}
                                onClick={() => setCategoryFilter(prev => active ? prev.filter(c => c !== cat) : [...prev, cat])}
                                className={`px-2 py-1 rounded-md border text-xs ${active ? 'bg-gray-100 dark:bg-[#232734] border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100' : 'bg-transparent border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
                              >
                                {cat}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 mb-1">Priority</div>
                        <div className="flex flex-wrap gap-2">
                          {taskFilterOptions.priorities.map(p => {
                            const active = priorityFilter.includes(p);
                            return (
                              <button
                                key={p}
                                onClick={() => setPriorityFilter(prev => active ? prev.filter(x => x !== p) : [...prev, p])}
                                className={`px-2 py-1 rounded-md border text-xs capitalize ${active ? 'bg-gray-100 dark:bg-[#232734] border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100' : 'bg-transparent border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
                              >
                                {p}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1 border-t">
                        <button
                          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          onClick={() => {
                            setOwnerFilter([]);
                            setTagFilter([]);
                            setCategoryFilter([]);
                            setPriorityFilter([]);
                          }}
                        >
                          Reset
                        </button>
                        <button
                          className="text-sm text-purple-700 hover:text-purple-800"
                          onClick={() => setFiltersOpen(false)}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Add Task Button */}
              {viewMode === 'tasks' && (
                <button
                  onClick={handleAddTask}
                  className="flex items-center px-3 py-1.5 rounded-md border border-gray-300 text-gray-800 bg-white hover:bg-gray-100 transition-colors dark:border-gray-700 dark:text-gray-100 dark:bg-[#1A1D24] dark:hover:bg-[#232734]"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Task
                </button>
              )}
            </div>
          </div>

          {/* Timeline Content */}
          <div className="h-full overflow-y-auto text-gray-800 dark:text-gray-200">
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
                    className="mt-4 px-4 py-2 rounded-md border border-gray-300 text-gray-800 bg-white hover:bg-gray-100 transition-colors dark:border-gray-700 dark:text-gray-100 dark:bg-[#1A1D24] dark:hover:bg-[#232734]"
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
                    onTaskEdit={(activity) => setSelectedTaskInfo({ tileId: activity.tileId, taskId: activity.id })}
                    onTaskDelete={(activity) => removeTask && removeTask(activity.tileId, activity.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Task Modal */}
        {showCreateTaskModal && (
          <CreateTaskModal
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSave={handleCreateTask}
            onClose={() => setShowCreateTaskModal(false)}
          />
        )}

        {/* Edit Task Modal */}
        {selectedTaskInfo && (
          <TaskModal
            tileId={selectedTaskInfo.tileId}
            taskId={selectedTaskInfo.taskId}
            tiles={tiles}
            projects={projects}
            updateTask={updateTask}
            onClose={() => setSelectedTaskInfo(null)}
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
  updateTask: PropTypes.func,
  removeTask: PropTypes.func,
};

export default TimelineView;
