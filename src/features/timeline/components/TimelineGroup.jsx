import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { ChevronDown, CalendarIcon, Flag, CheckCircle, List } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const TimelineGroup = ({ group, isCollapsed, onTaskClick, onMeetingClick }) => {
  const [collapsed, setCollapsed] = useState(isCollapsed);
  
  const getActivityIcon = (activity) => {
    if (activity.type === 'meeting') return <CalendarIcon className="w-4 h-4 text-blue-500" />;
    if (activity.prio) return <Flag className="w-4 h-4 text-red-500" />;
    if (activity.done) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <List className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="timeline-group">
      <div 
        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center space-x-3">
          <ChevronDown className={`w-4 h-4 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
          <h3 className="font-medium text-gray-800">{group.period}</h3>
          <span className="text-sm text-gray-500">
            {group.activities.length} activities
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-green-600">
            {group.activities.filter(a => a.done).length} completed
          </span>
        </div>
      </div>
      
      {!collapsed && (
        <div className="mt-3 space-y-2">
          {group.activities.map(activity => (
            <motion.div
              key={activity.id}
              className={`p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-all ${
                activity.done ? 'opacity-75' : ''
              }`}
              onClick={() => activity.type === 'task' 
                ? onTaskClick(activity) 
                : onMeetingClick(activity)
              }
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 truncate">
                      {activity.label || activity.title}
                    </h4>
                    {activity.date && (
                      <span className="text-sm text-gray-500">
                        {format(parseISO(activity.date), 'MMM dd')}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                    {activity.owner && (
                      <span>Owner: {activity.owner}</span>
                    )}
                    {activity.type === 'task' && activity.tileTitle && (
                      <span>Category: {activity.tileTitle}</span>
                    )}
                    {activity.type === 'meeting' && activity.notes && (
                      <span>{activity.notes.length} notes</span>
                    )}
                  </div>
                </div>
                
                {activity.done && (
                  <div className="flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
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
};

TimelineGroup.defaultProps = {
  isCollapsed: false,
};

export default TimelineGroup;
