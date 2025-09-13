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

// Build a normalized snapshot suitable for LLM context ingestion
export const buildLLMContextSnapshot = ({ projects = [], tiles = [], meetings = [] }) => {
  const tasks = tiles.flatMap(tile => (tile.tasks || []).map(t => ({
    id: t.id,
    label: t.label,
    description: t.description || '',
    owner: t.owner || '',
    dueDate: t.dueDate || null,
    priority: t.priority || (t.prio ? 'high' : 'normal'),
    status: t.status || (t.done ? 'done' : 'todo'),
    category: t.category || tile.title || '',
    tags: Array.isArray(t.tags) ? t.tags : [],
    done: !!t.done,
    completedAt: t.completedAt || null,
    projectId: tile.projectId || 'proj-default',
  })));

  const meetingsFlat = meetings.map(m => ({
    id: m.id,
    title: m.title,
    projectId: m.projectId || 'proj-default',
    notes: (m.notes || []).map(n => ({
      id: n.id,
      date: n.date || null,
      attendance: n.attendance || '',
      summary: n.summary ? n.summary.replace(/<[^>]+>/g, '') : '',
      actions: n.actions ? n.actions.replace(/<[^>]+>/g, '') : '',
    }))
  }));

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    projects: projects.map(p => ({ id: p.id, name: p.name, description: p.description || '', color: p.color, status: p.status })),
    tasks,
    meetings: meetingsFlat,
  };
};

// Build a concise per-project context for LLM
export const buildProjectContext = (projectId, tiles = [], meetings = []) => {
  const tasks = tiles
    .filter(t => t.projectId === projectId)
    .flatMap(tile => (tile.tasks || []).map(task => ({
      label: task.label,
      description: task.description || '',
      owner: task.owner || '',
      dueDate: task.dueDate || '',
      priority: task.priority || (task.prio ? 'high' : 'normal'),
      status: task.status || (task.done ? 'done' : 'todo'),
      category: task.category || tile.title || '',
      tags: Array.isArray(task.tags) ? task.tags : [],
      done: !!task.done,
    })));

  const meetingsForProject = meetings
    .filter(m => m.projectId === projectId)
    .map(m => ({
      title: m.title,
      notes: (m.notes || []).map(n => ({
        date: n.date || '',
        attendance: n.attendance || '',
        summary: n.summary ? n.summary.replace(/<[^>]+>/g, '') : '',
        actions: n.actions ? n.actions.replace(/<[^>]+>/g, '') : '',
      }))
    }));

  return { tasks, meetings: meetingsForProject };
};
