import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import {
  Plus,
  X,
  CalendarCheck,
  Filter,
  Calendar,
  List,
  ChevronDown,
  Trash2,
  Paperclip,
  Columns,
  FolderOpen,
  ChevronRight,
  Minus,
  EyeOff,
  Eye,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getAllProjectActivities, groupActivitiesByTimeRange } from '../../../shared/utils';
import TimelineGroup from './TimelineGroup';
import { CreateTaskModal, TaskModal } from '../../tasks';
import { MeetingBoard, MeetingEditor } from '../../meetings';

const PhaseColumn = ({
  phase,
  tasks,
  onDropTask,
  onDragStartPhase,
  onDragOverPhase,
  onDragEndPhase,
  groupingEnabled,
  onAddTask,
  onOpenTask,
  onHidePhase,
}) => (
  <div
    className="flex w-72 shrink-0 flex-col rounded-2xl border border-indigo-100/60 bg-white/90 shadow-lg shadow-indigo-100/40 backdrop-blur dark:border-indigo-500/20 dark:bg-[#111624] dark:shadow-none"
    draggable={groupingEnabled}
    onDragStart={(event) => onDragStartPhase(event, phase)}
    onDragOver={(event) => onDragOverPhase(event, phase)}
    onDragEnd={onDragEndPhase}
    onDrop={(event) => onDropTask(event, phase)}
  >
    <div className="flex items-center justify-between border-b border-indigo-100 px-4 py-3 text-xs tracking-wide text-indigo-600 dark:border-indigo-500/20 dark:text-indigo-200">
      <div>
        <div className="text-[11px] font-semibold uppercase">{phase}</div>
        <div className="text-[10px] text-gray-400 dark:text-gray-500">{tasks.length} task{tasks.length === 1 ? '' : 's'}</div>
      </div>
      <div className="flex items-center gap-1.5">
        {onHidePhase && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onHidePhase(phase);
            }}
            className="rounded-full border border-indigo-100 bg-white/80 p-1 text-indigo-500 shadow hover:bg-indigo-500 hover:text-white dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200"
            title="Hide phase"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={(event) => {
            event.stopPropagation();
            onAddTask(phase);
          }}
          className="rounded-full border border-indigo-100 bg-white/80 p-1 text-indigo-500 shadow hover:bg-indigo-500 hover:text-white dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-indigo-200/70 bg-indigo-50/40 p-4 text-[11px] font-medium text-indigo-400 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
          Drag tasks here
        </div>
      ) : (
        tasks.map((task) => (
          <motion.div
            key={task.id}
            layout
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData('application/task-id', task.id);
              event.dataTransfer.effectAllowed = 'move';
            }}
            onClick={() => onOpenTask(task)}
            className="cursor-grab rounded-2xl border border-transparent bg-gradient-to-br from-white via-indigo-50 to-white px-4 py-3 text-xs text-gray-700 shadow-md shadow-indigo-100 transition hover:border-indigo-300 dark:from-[#101624] dark:via-[#121a2a] dark:to-[#101624] dark:text-gray-100"
          >
            <div className="font-semibold text-gray-800 dark:text-gray-100">{task.label}</div>
            <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-gray-500 dark:text-gray-400">
              {task.owner && <span>Owner: {task.owner}</span>}
              {task.dueDate && <span>Due: {task.dueDate}</span>}
              {task.priority && <span>Priority: {task.priority}</span>}
            </div>
          </motion.div>
        ))
      )}
    </div>
  </div>
);

PhaseColumn.propTypes = {
  phase: PropTypes.string.isRequired,
  tasks: PropTypes.array.isRequired,
  onDropTask: PropTypes.func.isRequired,
  onDragStartPhase: PropTypes.func.isRequired,
  onDragOverPhase: PropTypes.func.isRequired,
  onDragEndPhase: PropTypes.func.isRequired,
  groupingEnabled: PropTypes.bool,
  onAddTask: PropTypes.func.isRequired,
  onOpenTask: PropTypes.func.isRequired,
  onHidePhase: PropTypes.func,
};

PhaseColumn.defaultProps = {
  groupingEnabled: false,
  onHidePhase: null,
};

const TimelineView = ({
  projects,
  tiles,
  meetings,
  selectedProjectId,
  onProjectChange,
  onProjectEdit,
  onProjectCreate,
  onProjectDelete,
  onProjectReorder,
  onTaskCreate,
  onTaskClick,
  updateTask,
  removeTask,
  phases,
  onPhaseReorder,
  onMeetingCreate,
  onMeetingUpdate,
  onMeetingDelete,
  onLinkTaskToMeeting,
  onUnlinkTaskFromMeeting,
  onAttachmentUpload,
  onAttachmentDownload,
  onAttachmentDelete,
  onAttachmentLink,
  onAttachmentUnlink,
  attachmentDirStatus,
  attachmentDirName,
}) => {
  const [timeRange, setTimeRange] = useState('month');
  const [selectedDate] = useState(new Date());
  const [selectedTaskInfo, setSelectedTaskInfo] = useState(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [createTaskContext, setCreateTaskContext] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState([]);
  const [tagFilter, setTagFilter] = useState([]);
  const [phaseFilter, setPhaseFilter] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState([]);
  const [draggingProjectId, setDraggingProjectId] = useState(null);
  const [dragOverProjectId, setDragOverProjectId] = useState(null);
  const [viewMode, setViewMode] = useState('tasks'); // 'tasks' | 'meetings'
  const [groupingMode, setGroupingMode] = useState('time'); // 'time' | 'phases'
  const [showAttachments, setShowAttachments] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState(null);
  const [phaseDrag, setPhaseDrag] = useState({ active: null, over: null });
  const [projectsCollapsed, setProjectsCollapsed] = useState(false);
  const [hiddenPhases, setHiddenPhases] = useState([]);

  const activeProject = useMemo(() => {
    return projects.find((project) => project.id === selectedProjectId) || projects[0];
  }, [projects, selectedProjectId]);

  const meetingsForProject = useMemo(
    () => meetings.filter((meeting) => meeting.projectId === (activeProject?.id || 'proj-default')),
    [meetings, activeProject]
  );

  const meetingMap = useMemo(() => new Map(meetingsForProject.map((m) => [m.id, m])), [meetingsForProject]);

  const taskLookup = useMemo(() => {
    const map = new Map();
    tiles.forEach((tile) => {
      if (tile.projectId !== (activeProject?.id || 'proj-default')) return;
      tile.tasks.forEach((task) => {
        map.set(task.id, { task, tileId: tile.id, tileTitle: tile.title });
      });
    });
    return map;
  }, [tiles, activeProject]);

  const allActivities = useMemo(
    () => getAllProjectActivities(activeProject?.id || 'proj-default', tiles, meetings),
    [activeProject, tiles, meetings]
  );

  const taskActivities = useMemo(() => allActivities.filter((a) => a.type === 'task'), [allActivities]);
  const meetingActivities = useMemo(() => allActivities.filter((a) => a.type === 'meeting'), [allActivities]);

  const taskFilterOptions = useMemo(() => {
    const owners = new Set();
    const tags = new Set();
    const categories = new Set();
    const priorities = new Set(['low', 'normal', 'high', 'urgent']);
    taskActivities.forEach((t) => {
      if (t.owner) owners.add(t.owner);
      if (Array.isArray(t.tags)) t.tags.forEach((tag) => tags.add(tag));
      if (t.category || t.tileTitle) categories.add(t.category || t.tileTitle || 'Unassigned');
    });
    return {
      owners: Array.from(owners),
      tags: Array.from(tags),
      categories: Array.from(categories),
      priorities: Array.from(priorities),
    };
  }, [taskActivities]);

  const isTaskOverdue = (task) => {
    if (task.done) return false;
    if (!task.dueDate) return false;
    try {
      return parseISO(task.dueDate) < new Date();
    } catch {
      return false;
    }
  };

  const filteredTasks = useMemo(() => {
    const matchFilters = (task) => {
      if (ownerFilter.length && (!task.owner || !ownerFilter.includes(task.owner))) return false;
      if (priorityFilter.length) {
        const priority = task.priority || (task.prio ? 'high' : 'normal');
        if (!priorityFilter.includes(priority)) return false;
      }
      if (phaseFilter.length) {
        const phase = task.category || task.tileTitle || 'Unassigned';
        if (!phaseFilter.includes(phase)) return false;
      }
      if (tagFilter.length) {
        const tags = Array.isArray(task.tags) ? task.tags : [];
        if (!tags.some((tag) => tagFilter.includes(tag))) return false;
      }
      return true;
    };

    return taskActivities
      .map((task) => ({
        ...task,
        date: task.done && task.completedAt ? task.completedAt : task.dueDate || task.date || null,
        overdue: isTaskOverdue(task),
      }))
      .filter((task) => matchFilters(task));
  }, [taskActivities, ownerFilter, priorityFilter, phaseFilter, tagFilter]);

  const groupedActivities = useMemo(() => {
    const source = viewMode === 'tasks' ? filteredTasks : meetingActivities;
    return groupActivitiesByTimeRange(source, timeRange, selectedDate);
  }, [filteredTasks, meetingActivities, timeRange, selectedDate, viewMode]);

  const phaseOrder = phases && phases.length ? phases : ['Conceptual', 'Design', 'Validation', 'Startup'];
  const visiblePhases = useMemo(
    () => phaseOrder.filter((phase) => !hiddenPhases.includes(phase)),
    [phaseOrder, hiddenPhases]
  );

  const tasksByPhase = useMemo(() => {
    const map = new Map();
    phaseOrder.forEach((phase) => map.set(phase, []));
    const unassigned = [];
    filteredTasks.forEach((task) => {
      const phase = task.category || task.tileTitle;
      if (phase && map.has(phase)) {
        map.get(phase).push(task);
      } else {
        unassigned.push(task);
      }
    });
    return { map, unassigned };
  }, [filteredTasks, phaseOrder]);

  const attachmentsForProject = useMemo(() => {
    const items = Array.isArray(activeProject?.attachments) ? activeProject.attachments : [];
    return [...items].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [activeProject]);

  const handleActivityClick = (activity) => {
    if (activity.type === 'task') {
      openTaskDetails(activity);
      return;
    }
    onTaskClick && onTaskClick(activity);
  };

  const openCreateTaskModal = (context) => {
    setCreateTaskContext(context);
    setShowCreateTaskModal(true);
  };

  const openTaskDetails = (task) => {
    const taskId = task.id ?? task.taskId;
    if (!taskId) return;
    const context = taskLookup.get(taskId);
    const payload = {
      ...task,
      id: taskId,
      type: 'task',
      tileId: context?.tileId ?? task.tileId ?? null,
      tileTitle: context?.tileTitle ?? task.tileTitle ?? null,
    };
    if (onTaskClick) {
      onTaskClick(payload);
    } else if (payload.tileId != null) {
      setSelectedTaskInfo({ tileId: payload.tileId, taskId });
    }
  };

  const handleCreateTask = (taskData) => {
    if (!onTaskCreate) return;
    const payload = {
      ...taskData,
      projectId: createTaskContext?.projectId || activeProject?.id || 'proj-default',
      category: createTaskContext?.phase || taskData.category || '',
    };
    const result = onTaskCreate(payload);
    if (result && createTaskContext?.meetingId) {
      onLinkTaskToMeeting(createTaskContext.meetingId, result.task.id);
    }
    setShowCreateTaskModal(false);
    setCreateTaskContext(null);
  };

  const handleTaskDropToPhase = (event, phase) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('application/task-id');
    if (!taskId) return;
    const context = taskLookup.get(taskId);
    if (!context) return;
    updateTask && updateTask(context.tileId, taskId, { category: phase });
  };

  const handlePhaseDragStart = (event, phase) => {
    if (!onPhaseReorder) return;
    event.dataTransfer.effectAllowed = 'move';
    setPhaseDrag({ active: phase, over: null });
  };

  const handlePhaseDragOver = (event, phase) => {
    if (!onPhaseReorder || !phaseDrag.active || phaseDrag.active === phase) return;
    event.preventDefault();
    setPhaseDrag((prev) => ({ ...prev, over: phase }));
  };

  const handlePhaseDragEnd = () => {
    if (!onPhaseReorder || !phaseDrag.active || !phaseDrag.over) {
      setPhaseDrag({ active: null, over: null });
      return;
    }
    const sourceIndex = phaseOrder.findIndex((phase) => phase === phaseDrag.active);
    const targetIndex = phaseOrder.findIndex((phase) => phase === phaseDrag.over);
    if (sourceIndex !== -1 && targetIndex !== -1 && sourceIndex !== targetIndex) {
      onPhaseReorder(sourceIndex, targetIndex);
    }
    setPhaseDrag({ active: null, over: null });
  };

  const handleReorderProjects = (sourceId, targetId) => {
    if (!onProjectReorder) return;
    if (sourceId === targetId) return;
    onProjectReorder(sourceId, targetId);
    setDraggingProjectId(null);
    setDragOverProjectId(null);
  };

  const handleLinkAttachment = async () => {
    if (!onAttachmentLink) return;
    const hrefInput = window.prompt('Enter file path or URL to link');
    const href = hrefInput?.trim();
    if (!href) return;
    const defaultName = href.split(/[\\/]/).pop() || 'Linked file';
    const nameInput = window.prompt('Display name for this link', defaultName);
    const name = (nameInput && nameInput.trim()) || defaultName;
    onAttachmentLink({ projectId: activeProject?.id || 'proj-default', href, meetingId: null, name });
  };

  const hidePhase = (phase) => {
    setHiddenPhases((prev) => {
      if (prev.includes(phase)) return prev;
      if (phaseOrder.length - prev.length <= 1) return prev; // keep at least one visible
      return [...prev, phase];
    });
  };

  const restorePhase = (phase) => {
    setHiddenPhases((prev) => prev.filter((item) => item !== phase));
  };

  const editingMeeting = editingMeetingId ? meetingMap.get(editingMeetingId) : null;

  const attachmentUsageMessage = () => {
    if (attachmentDirStatus === 'not-configured') {
      return 'Select a folder in Settings to enable attachment syncing.';
    }
    if (attachmentDirStatus === 'denied') {
      return 'Permission to access the attachment folder was denied. Re-authorize in Settings.';
    }
    return '';
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex h-screen">
        {/* Project Sidebar */}
        <div
          className={`mr-4 overflow-hidden rounded-xl bg-white navy-surface shadow-md transition-[width] duration-300 dark:bg-[#0F1115] dark:border dark:border-gray-800 ${
            projectsCollapsed ? 'w-16' : 'w-80'
          }`}
        >
          {projectsCollapsed ? (
            <div className="flex h-full flex-col items-center justify-between py-4">
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={onProjectCreate}
                  className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:text-indigo-500 dark:border-gray-700 dark:text-gray-300"
                  title="Create project"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setProjectsCollapsed(false)}
                  className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:text-indigo-500 dark:border-gray-700 dark:text-gray-300"
                  title="Expand projects"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <span className="mb-6 rotate-90 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Projects
              </span>
            </div>
          ) : (
            <div className="p-3.5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Projects</h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={onProjectCreate}
                    className="rounded-full border border-gray-200 p-1.5 text-gray-500 transition hover:text-indigo-500 dark:border-gray-700 dark:text-gray-300"
                    title="Create project"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setProjectsCollapsed(true)}
                    className="rounded-full border border-gray-200 p-1.5 text-gray-500 transition hover:text-indigo-500 dark:border-gray-700 dark:text-gray-300"
                    title="Collapse projects"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                {projects.map((project) => {
                  const isSelected = project.id === activeProject?.id;
                  const isDragOver = dragOverProjectId === project.id && draggingProjectId && draggingProjectId !== project.id;
                  return (
                    <div
                      key={project.id}
                  draggable={Boolean(onProjectReorder)}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('application/project-id', project.id);
                    setDraggingProjectId(project.id);
                  }}
                  onDragOver={(event) => {
                    if (!draggingProjectId || draggingProjectId === project.id) return;
                    event.preventDefault();
                    setDragOverProjectId(project.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const sourceId = draggingProjectId || event.dataTransfer.getData('application/project-id');
                    handleReorderProjects(sourceId, project.id);
                  }}
                  onDragLeave={() => setDragOverProjectId((prev) => (prev === project.id ? null : prev))}
                  className={`p-2.5 rounded-md border transition ${
                    isSelected
                      ? 'bg-gray-50 border-gray-300 dark:bg-[#1A1D24] dark:border-gray-700'
                      : 'bg-white border-transparent hover:bg-gray-50 dark:bg-[#0F1115] dark:hover:bg-[#1A1D24]'
                  } ${isDragOver ? 'ring-2 ring-indigo-400' : ''}`}
                  onClick={() => onProjectChange(project.id)}
                  onDoubleClick={() => onProjectEdit(project)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate text-gray-700 dark:text-gray-200">{project.name}</h4>
                      <p className="text-xs text-gray-500 truncate dark:text-gray-400">{project.description}</p>
                    </div>
                    {project.id !== 'proj-default' && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onProjectDelete(project.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 bg-white navy-surface rounded-xl shadow-md p-4 dark:bg-[#0F1115] dark:border dark:border-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
              <button
                onClick={() => {
                  setViewMode('tasks');
                  setShowAttachments(false);
                }}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 ${
                  viewMode === 'tasks' && !showAttachments
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[#1A1D24] dark:hover:bg-[#232734] dark:text-gray-300'
                }`}
              >
                <List className="w-4 h-4" /> Tasks
              </button>
              <button
                onClick={() => {
                  setViewMode('meetings');
                  setShowAttachments(false);
                }}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 ${
                  viewMode === 'meetings' && !showAttachments
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[#1A1D24] dark:hover:bg-[#232734] dark:text-gray-300'
                }`}
              >
                <Calendar className="w-4 h-4" /> Meetings
              </button>
              <button
                onClick={() => {
                  setShowAttachments((prev) => !prev);
                }}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 ${
                  showAttachments
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[#1A1D24] dark:hover-bg-[#232734] dark:text-gray-300'
                }`}
              >
                <Paperclip className="w-4 h-4" /> Attachments
              </button>
            </div>

            {viewMode === 'tasks' && !showAttachments && (
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex rounded-lg bg-gray-100 dark:bg-[#1A1D24]">
                  <button
                    className={`flex items-center gap-1 rounded-md px-3 py-1.5 ${
                      groupingMode === 'time'
                        ? 'bg-white text-gray-700 shadow-sm dark:bg-[#232734] dark:text-gray-100'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'
                    }`}
                    onClick={() => setGroupingMode('time')}
                  >
                    <Calendar className="w-4 h-4" /> Timeline
                  </button>
                  <button
                    className={`flex items-center gap-1 rounded-md px-3 py-1.5 ${
                      groupingMode === 'phases'
                        ? 'bg-white text-gray-700 shadow-sm dark:bg-[#232734] dark:text-gray-100'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'
                    }`}
                    onClick={() => setGroupingMode('phases')}
                  >
                    <Columns className="w-4 h-4" /> Phases
                  </button>
                </div>

                {groupingMode === 'time' && (
                  <div className="flex rounded-lg bg-gray-100 dark:bg-[#1A1D24]">
                    {['week', 'month', 'quarter', 'year'].map((range) => (
                      <button
                        key={range}
                        className={`px-3 py-1.5 capitalize ${
                          timeRange === range
                            ? 'rounded-md bg-white text-gray-700 shadow-sm dark:bg-[#232734] dark:text-gray-100'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'
                        }`}
                        onClick={() => setTimeRange(range)}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setFiltersOpen((prev) => !prev)}
                  className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-gray-600 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  <Filter className="w-4 h-4" /> Filters
                </button>
                <button
                  onClick={() => openCreateTaskModal({ projectId: activeProject?.id })}
                  className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-[#232734]"
                >
                  <Plus className="w-4 h-4" /> Add task
                </button>
              </div>
            )}

            {viewMode === 'meetings' && !showAttachments && (
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                {meetingsForProject.length} meeting{meetingsForProject.length === 1 ? '' : 's'} tracked
              </div>
            )}

            {showAttachments && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <FolderOpen className="w-4 h-4" />
                {attachmentDirStatus === 'granted'
                  ? `Stored in: ${attachmentDirName || 'Selected folder'}`
                  : attachmentUsageMessage()}
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.onchange = async (event) => {
                      const files = Array.from(event.target.files || []);
                      if (!files.length) return;
                      await onAttachmentUpload({ projectId: activeProject?.id || 'proj-default', meetingId: null, files });
                    };
                    input.click();
                  }}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-600 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                  disabled={attachmentDirStatus !== 'granted'}
                >
                  Upload
                </button>
              </div>
            )}
          </div>

          {/* Filters dropdown */}
          {filtersOpen && !showAttachments && viewMode === 'tasks' && (
            <div className="relative mt-3">
              <div className="absolute right-0 z-20 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-[#0F1115]">
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Owner</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {taskFilterOptions.owners.length === 0 && (
                        <span className="text-[11px] text-gray-400">No owners yet</span>
                      )}
                      {taskFilterOptions.owners.map((owner) => {
                        const active = ownerFilter.includes(owner);
                        return (
                          <button
                            key={owner}
                            onClick={() =>
                              setOwnerFilter((prev) =>
                                active ? prev.filter((item) => item !== owner) : [...prev, owner]
                              )
                            }
                            className={`rounded-md border px-2 py-1 ${
                              active
                                ? 'border-gray-300 bg-gray-100 text-gray-800 dark:border-gray-700 dark:bg-[#232734] dark:text-gray-100'
                                : 'border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {owner}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Tags</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {taskFilterOptions.tags.length === 0 && <span className="text-[11px] text-gray-400">No tags</span>}
                      {taskFilterOptions.tags.map((tag) => {
                        const active = tagFilter.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() =>
                              setTagFilter((prev) =>
                                active ? prev.filter((item) => item !== tag) : [...prev, tag]
                              )
                            }
                            className={`rounded-md border px-2 py-1 ${
                              active
                                ? 'border-gray-300 bg-gray-100 text-gray-800 dark:border-gray-700 dark:bg-[#232734] dark:text-gray-100'
                                : 'border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Phase</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {taskFilterOptions.categories.length === 0 && <span className="text-[11px] text-gray-400">No phases</span>}
                      {taskFilterOptions.categories.map((cat) => {
                        const active = phaseFilter.includes(cat);
                        return (
                          <button
                            key={cat}
                            onClick={() =>
                              setPhaseFilter((prev) =>
                                active ? prev.filter((item) => item !== cat) : [...prev, cat]
                              )
                            }
                            className={`rounded-md border px-2 py-1 ${
                              active
                                ? 'border-gray-300 bg-gray-100 text-gray-800 dark:border-gray-700 dark:bg-[#232734] dark:text-gray-100'
                                : 'border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Priority</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {taskFilterOptions.priorities.map((priority) => {
                        const active = priorityFilter.includes(priority);
                        return (
                          <button
                            key={priority}
                            onClick={() =>
                              setPriorityFilter((prev) =>
                                active ? prev.filter((item) => item !== priority) : [...prev, priority]
                              )
                            }
                            className={`rounded-md border px-2 py-1 capitalize ${
                              active
                                ? 'border-gray-300 bg-gray-100 text-gray-800 dark:border-gray-700 dark:bg-[#232734] dark:text-gray-100'
                                : 'border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {priority}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t pt-2">
                    <button
                      onClick={() => {
                        setOwnerFilter([]);
                        setTagFilter([]);
                        setPhaseFilter([]);
                        setPriorityFilter([]);
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setFiltersOpen(false)}
                      className="text-xs text-indigo-600 hover:text-indigo-500"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 h-[calc(100%-4rem)] overflow-y-auto text-gray-800 dark:text-gray-200">
            {showAttachments ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Project attachments</span>
                  <button
                    onClick={handleLinkAttachment}
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:text-indigo-500 dark:border-gray-700 dark:text-gray-300"
                  >
                    Link file
                  </button>
                </div>
                {attachmentsForProject.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-[#10131A] dark:text-gray-400">
                    No attachments yet.
                  </div>
                ) : (
                  attachmentsForProject.map((attachment) => {
                    const meetingTitle = attachment.meetingId ? meetingMap.get(attachment.meetingId)?.title : null;
                    return (
                      <div key={attachment.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-gray-800 dark:bg-[#10131A]">
                        <div className="space-y-1">
                      <button
                        onClick={() => onAttachmentDownload(attachment)}
                        className="text-left font-medium text-gray-700 underline-offset-4 hover:underline dark:text-gray-100"
                      >
                        {attachment.name}
                      </button>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        {attachment.storageType === 'link' || attachment.type === 'link'
                          ? 'Linked file'
                          : `${(Math.round((attachment.size || 0) / 102.4) / 10).toFixed(1)} KB`}
                        {meetingTitle ? ` • From meeting: ${meetingTitle}` : ''}
                      </div>
                    </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {attachment.meetingId && (
                            <button
                              onClick={() => onAttachmentUnlink(attachment)}
                              className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:text-indigo-500 dark:border-gray-700 dark:text-gray-300"
                            >
                              Unlink
                            </button>
                          )}
                          <button
                            onClick={() => onAttachmentDownload(attachment)}
                            className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:text-indigo-500 dark:border-gray-700 dark:text-gray-300"
                          >
                            Open
                          </button>
                          <button
                            onClick={() => onAttachmentDelete(attachment)}
                            className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-500 hover:text-red-600 dark:border-red-900 dark:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : viewMode === 'tasks' ? (
              groupingMode === 'phases' ? (
                <div className="space-y-3">
                  {hiddenPhases.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>Hidden phases:</span>
                      {hiddenPhases.map((phase) => (
                        <button
                          key={phase}
                          onClick={() => restorePhase(phase)}
                          className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:text-indigo-500 dark:border-gray-700 dark:text-gray-300"
                        >
                          <Eye className="w-3 h-3" /> {phase}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3 overflow-x-auto py-2">
                    {visiblePhases.map((phase) => (
                      <PhaseColumn
                        key={phase}
                        phase={phase}
                        tasks={tasksByPhase.map.get(phase) || []}
                        onDropTask={handleTaskDropToPhase}
                        onDragStartPhase={handlePhaseDragStart}
                        onDragOverPhase={handlePhaseDragOver}
                        onDragEndPhase={handlePhaseDragEnd}
                        groupingEnabled={Boolean(onPhaseReorder)}
                        onAddTask={(phaseName) =>
                          openCreateTaskModal({
                            projectId: activeProject?.id,
                            phase: phaseName === 'Unassigned' ? undefined : phaseName,
                          })
                        }
                        onOpenTask={openTaskDetails}
                        onHidePhase={visiblePhases.length > 1 ? hidePhase : null}
                      />
                    ))}
                    {tasksByPhase.unassigned.length > 0 && (
                      <PhaseColumn
                        phase="Unassigned"
                        tasks={tasksByPhase.unassigned}
                        onDropTask={handleTaskDropToPhase}
                        onDragStartPhase={handlePhaseDragStart}
                        onDragOverPhase={handlePhaseDragOver}
                        onDragEndPhase={handlePhaseDragEnd}
                        groupingEnabled={false}
                        onAddTask={(phaseName) =>
                          openCreateTaskModal({
                            projectId: activeProject?.id,
                            phase: phaseName === 'Unassigned' ? undefined : phaseName,
                          })
                        }
                        onOpenTask={openTaskDetails}
                      />
                    )}
                  </div>
                </div>
              ) : groupedActivities.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-500 mb-2">No tasks yet</h3>
                  <p className="text-gray-400">Start by adding tasks to this project.</p>
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
                      onTaskEdit={openTaskDetails}
                      onTaskDelete={(activity) => removeTask && removeTask(activity.tileId, activity.id)}
                    />
                  ))}
                </div>
              )
            ) : viewMode === 'meetings' && editingMeeting ? (
              <MeetingEditor
                meeting={editingMeeting}
                presentation="inline"
                onClose={() => setEditingMeetingId(null)}
                onSave={(meetingId, updates) => onMeetingUpdate(meetingId, updates)}
                onDelete={(meetingId) => {
                  onMeetingDelete(meetingId);
                  setEditingMeetingId(null);
                }}
                onAddTask={(meetingId) =>
                  openCreateTaskModal({ projectId: editingMeeting.projectId, meetingId })
                }
                onEditTask={(tileId, taskId) => setSelectedTaskInfo({ tileId, taskId })}
                onUnlinkTask={(meetingId, taskId) => onUnlinkTaskFromMeeting(meetingId, taskId)}
                onDeleteTask={(tileId, taskId, meetingId) => {
                  removeTask && removeTask(tileId, taskId);
                  onUnlinkTaskFromMeeting(meetingId, taskId);
                }}
                taskLookup={taskLookup}
                onAttachmentUpload={onAttachmentUpload}
                onAttachmentDownload={onAttachmentDownload}
                onAttachmentDelete={onAttachmentDelete}
                onAttachmentUnlink={onAttachmentUnlink}
                onAttachmentLink={onAttachmentLink}
                attachmentDirStatus={attachmentDirStatus}
              />
            ) : (
              <MeetingBoard
                meetings={meetingsForProject}
                onCreate={() => {
                  setViewMode('meetings');
                  setShowAttachments(false);
                  const meetingId = onMeetingCreate(activeProject?.id || 'proj-default');
                  setEditingMeetingId(meetingId);
                }}
                onEdit={(meetingId) => {
                  setViewMode('meetings');
                  setShowAttachments(false);
                  setEditingMeetingId(meetingId);
                }}
                onDelete={(meetingId) => {
                  if (confirm('Delete this meeting and its attachments?')) {
                    onMeetingDelete(meetingId);
                    setEditingMeetingId((prev) => (prev === meetingId ? null : prev));
                  }
                }}
                attachmentResolver={(meeting) => meeting.attachments || []}
              />
            )}
          </div>
        </div>
      </div>

      {showCreateTaskModal && (
        <CreateTaskModal
          projects={projects}
          selectedProjectId={createTaskContext?.projectId || activeProject?.id}
          onSave={handleCreateTask}
          onClose={() => {
            setShowCreateTaskModal(false);
            setCreateTaskContext(null);
          }}
          phases={phases}
        />
      )}

      {!onTaskClick && selectedTaskInfo && (
        <TaskModal
          tileId={selectedTaskInfo.tileId}
          taskId={selectedTaskInfo.taskId}
          tiles={tiles}
          projects={projects}
          updateTask={updateTask}
          onClose={() => setSelectedTaskInfo(null)}
          phases={phases}
        />
      )}
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
  onProjectDelete: PropTypes.func.isRequired,
  onProjectReorder: PropTypes.func,
  onTaskCreate: PropTypes.func,
  onTaskClick: PropTypes.func,
  updateTask: PropTypes.func,
  removeTask: PropTypes.func,
  phases: PropTypes.arrayOf(PropTypes.string),
  onPhaseReorder: PropTypes.func,
  onMeetingCreate: PropTypes.func.isRequired,
  onMeetingUpdate: PropTypes.func.isRequired,
  onMeetingDelete: PropTypes.func.isRequired,
  onLinkTaskToMeeting: PropTypes.func.isRequired,
  onUnlinkTaskFromMeeting: PropTypes.func.isRequired,
  onAttachmentUpload: PropTypes.func.isRequired,
  onAttachmentDownload: PropTypes.func.isRequired,
  onAttachmentDelete: PropTypes.func.isRequired,
  onAttachmentLink: PropTypes.func.isRequired,
  onAttachmentUnlink: PropTypes.func.isRequired,
  attachmentDirStatus: PropTypes.string.isRequired,
  attachmentDirName: PropTypes.string,
};

TimelineView.defaultProps = {
  phases: undefined,
  onProjectReorder: undefined,
  onTaskCreate: undefined,
  onTaskClick: undefined,
  updateTask: undefined,
  removeTask: undefined,
  onPhaseReorder: undefined,
  attachmentDirName: '',
};

export default TimelineView;
