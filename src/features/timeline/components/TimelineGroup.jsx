import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { ChevronDown, CalendarIcon, Flag, CheckCircle, List, Pencil, X } from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';

const TimelineGroup = ({ group, isCollapsed, onTaskClick, onMeetingClick, onTaskEdit, onTaskDelete }) => {
  const [collapsed, setCollapsed] = useState(isCollapsed);
  const [expandedId, setExpandedId] = useState(null);
  
  const getActivityIcon = (activity) => {
    if (activity.type === 'meeting') return <CalendarIcon className="w-4 h-4 text-blue-500" />;
    if (activity.prio) return <Flag className="w-4 h-4 text-red-500" />;
    if (activity.done) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <List className="w-4 h-4 text-gray-500" />;
  };

  const isOverdue = (activity) => {
    if (activity.type !== 'task' || activity.done) return false;
    const due = activity.dueDate || activity.date;
    if (!due) return false;
    try { return isBefore(parseISO(due), new Date()); } catch { return false; }
  };

  const handleActivitySelection = (activity) => {
    if (activity.type === 'task') {
      onTaskClick && onTaskClick(activity);
      return;
    }
    if (activity.type === 'meeting') {
      onMeetingClick && onMeetingClick(activity);
    }
    setExpandedId((prev) => (prev === activity.id ? null : activity.id));
  };

  return (
    <div className="timeline-group text-xs">
      <div 
        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors dark:bg-[#0F1115] dark:border dark:border-gray-800 dark:hover:bg-[#151922]"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center space-x-3">
          <ChevronDown className={`w-4 h-4 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
          <h3 className="font-medium text-gray-800 dark:text-gray-200">{group.period}</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {group.activities.length} activities
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-green-600">
            {group.activities.filter(a => a.done).length} completed
          </span>
        </div>
      </div>
      
      {!collapsed && (
        <div className="mt-3 relative pl-8">
          {/* vertical timeline line */}
          <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-800" />
          <div className="space-y-1.5">
            {group.activities.map(activity => (
              <motion.div
                key={`${activity.type}-${activity.id}`}
                className={`relative p-2.5 bg-white rounded-md border cursor-pointer transition-colors ${
                  activity.done ? 'opacity-90 border-green-200' : 'border-gray-200'
                } hover:bg-gray-50 dark:bg-[#0F1115] dark:border-gray-800 dark:hover:bg-[#151922] shadow-sm`}
                onClick={() => handleActivitySelection(activity)}
              >
                {/* node dot */}
                <div className={`absolute -left-4 top-1.5 w-3 h-3 rounded-full border-2 ${
                  activity.done ? 'bg-green-500 border-white' : isOverdue(activity) ? 'bg-red-500 border-white' : 'bg-purple-500 border-white'
                } dark:border-[#0F1115]`} />

                <div className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          className="p-1 rounded-sm hover:bg-gray-100 dark:hover:bg-[#1A1D24] border border-transparent"
                          onClick={(e) => { e.stopPropagation(); setExpandedId(prev => prev === activity.id ? null : activity.id); }}
                          aria-label={expandedId === activity.id ? 'Collapse' : 'Expand'}
                          title={expandedId === activity.id ? 'Collapse' : 'Expand'}
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${expandedId === activity.id ? '' : '-rotate-90'}`} />
                        </button>
                        <h4 className="font-medium text-gray-900 truncate dark:text-gray-100 text-[13px]">
                          {activity.label || activity.title}
                        </h4>
                      </div>
                      {activity.dueDate && (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          {activity.done && activity.completedAt ? 'Completed' : 'Due'} {format(parseISO(activity.done && activity.completedAt ? activity.completedAt : activity.dueDate), 'MMM dd')}
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-0.5 flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                      {activity.owner && (
                        <span>Owner: {activity.owner}</span>
                      )}
                      {activity.type === 'task' && activity.tileTitle && (
                        <span>Phase: {activity.tileTitle}</span>
                      )}
                      {activity.type === 'task' && activity.priority && (
                        <span className="capitalize">Priority: {activity.priority}</span>
                      )}
                      {activity.type === 'meeting' && activity.notes && (
                        <span>{activity.notes.length} notes</span>
                      )}
                    </div>

                    {/* expanded details */}
                    {expandedId === activity.id && (
                      <div className="mt-2.5 text-[12px] text-gray-700 dark:text-gray-300">
                        {activity.description && (
                          <p className="mb-1.5 leading-5">{activity.description}</p>
                        )}
                        {Array.isArray(activity.tags) && activity.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-1.5">
                            {activity.tags.map((t, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 dark:bg-[#1A1D24] dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2.5">
                          {activity.status && <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#1A1D24] border border-gray-200 dark:border-gray-700">Status: {activity.status}</span>}
                          {activity.done && <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200/60 dark:border-green-800/50">Done</span>}
                          {isOverdue(activity) && <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200/60 dark:border-red-800/50">Overdue</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions for tasks */}
                  {activity.type === 'task' && (
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      <button
                        className="p-1 text-gray-400 hover:text-gray-200 dark:hover:bg-[#1A1D24] rounded"
                        onClick={(e) => { e.stopPropagation(); onTaskEdit && onTaskEdit(activity); }}
                        title="Edit task"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1 text-gray-400 hover:text-red-400 dark:hover:bg-[#1A1D24] rounded"
                        onClick={(e) => { e.stopPropagation(); onTaskDelete && onTaskDelete(activity); }}
                        title="Delete task"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

TimelineGroup.propTypes = {
  group: PropTypes.shape({
    period: PropTypes.string.isRequired,
    activities: PropTypes.array.isRequired,
  }).isRequired,
  isCollapsed: PropTypes.bool,
  onTaskClick: PropTypes.func.isRequired,
  onMeetingClick: PropTypes.func.isRequired,
  onTaskEdit: PropTypes.func,
  onTaskDelete: PropTypes.func,
};

TimelineGroup.defaultProps = {
  isCollapsed: false,
};

export default TimelineGroup;
