import { format, parseISO, getISOWeek, getISOWeekYear, startOfWeek, endOfWeek, eachWeekOfInterval, isBefore, isAfter } from 'date-fns';

// Generate unique IDs for tiles, tasks, meetings and notes
export const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

// Compute ISO week key for a given date (YYYY-Www)
export const getWeekKey = (date) => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const week = getISOWeek(d);
  const year = getISOWeekYear(d);
  return `${year}-W${week.toString().padStart(2, '0')}`;
};

// Current week key for today
export const todayWeekKey = getWeekKey(new Date());

// Determine if a given week key is in the past (including current week)
export const isWeekInPast = (weekKey) => {
  const [yearStr, weekStr] = weekKey.split('-W');
  const week = parseInt(weekStr, 10);
  const year = parseInt(yearStr, 10);
  const [curYearStr, curWeekStr] = todayWeekKey.split('-W');
  const curWeek = parseInt(curWeekStr, 10);
  const curYear = parseInt(curYearStr, 10);
  if (year < curYear) return true;
  if (year > curYear) return false;
  return week <= curWeek;
};

// Build chart data for tasks
export const buildChartData = (tasks) => {
  const datedTasks = tasks.filter((task) => task.date);
  if (datedTasks.length === 0) return [];
  
  // Determine min and max dates among tasks and include today to ensure current week is shown
  let minDate = null;
  let maxDate = null;
  datedTasks.forEach((task) => {
    const d = parseISO(task.date);
    if (!minDate || isBefore(d, minDate)) minDate = d;
    if (!maxDate || isAfter(d, maxDate)) maxDate = d;
  });
  
  const today = new Date();
  if (!minDate || isBefore(today, minDate)) minDate = today;
  if (!maxDate || isAfter(today, maxDate)) maxDate = today;
  
  const start = startOfWeek(minDate, { weekStartsOn: 1 });
  const end = endOfWeek(maxDate, { weekStartsOn: 1 });
  const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
  
  // Initialize data array with categories
  const data = weeks.map((weekStart) => {
    const key = getWeekKey(weekStart);
    return { key, done: 0, nonPrio: 0, prio: 0, overdue: 0 };
  });
  
  // Categorize tasks by week and status
  datedTasks.forEach((task) => {
    const key = getWeekKey(task.date);
    const entry = data.find((d) => d.key === key);
    if (entry) {
      const taskDate = parseISO(task.date);
      const isPast = isBefore(taskDate, new Date());
      if (task.done) {
        entry.done += 1;
      } else if (task.prio) {
        entry.prio += 1;
        if (isPast) entry.overdue += 1;
      } else {
        entry.nonPrio += 1;
        if (isPast) entry.overdue += 1;
      }
    }
  });
  
  return data;
};

// Group activities by time range
export const groupActivitiesByTimeRange = (activities, range, selectedDate) => {
  const groups = {};
  
  activities.forEach(activity => {
    let groupKey;
    const activityDate = activity.date ? parseISO(activity.date) : new Date();
    
    switch (range) {
      case 'week':
        groupKey = getWeekKey(activityDate);
        break;
      case 'month':
        groupKey = format(activityDate, 'MMMM yyyy');
        break;
      case 'quarter':
        const quarter = Math.ceil((activityDate.getMonth() + 1) / 3);
        groupKey = `Q${quarter} ${activityDate.getFullYear()}`;
        break;
      case 'year':
        groupKey = activityDate.getFullYear().toString();
        break;
      default:
        groupKey = format(activityDate, 'MMMM yyyy');
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = {
        period: groupKey,
        activities: []
      };
    }
    groups[groupKey].activities.push(activity);
  });
  
  return Object.values(groups).sort((a, b) => {
    // Sort by date, most recent first
    const dateA = a.activities[0]?.date ? parseISO(a.activities[0].date) : new Date(0);
    const dateB = b.activities[0]?.date ? parseISO(b.activities[0].date) : new Date(0);
    return dateB - dateA;
  });
};

// Get all project activities
export const getAllProjectActivities = (projectId, tiles, meetings) => {
  const projectTasks = tiles
    .filter(tile => tile.projectId === projectId)
    .flatMap(tile => tile.tasks.map(task => ({
      ...task,
      type: 'task',
      tileId: tile.id,
      tileTitle: tile.title
    })));
  
  const projectMeetings = meetings
    .filter(meeting => meeting.projectId === projectId)
    .map(meeting => ({
      ...meeting,
      type: 'meeting',
      label: meeting.title
    }));
  
  return [...projectTasks, ...projectMeetings].sort((a, b) => {
    const dateA = a.date ? new Date(a.date) : new Date(0);
    const dateB = b.date ? new Date(b.date) : new Date(0);
    return dateB - dateA; // Most recent first
  });
};
