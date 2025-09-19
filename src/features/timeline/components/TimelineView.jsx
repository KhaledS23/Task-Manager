import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Plus, CalendarCheck, Filter, Calendar, Columns, Eye, EyeOff, Trash2 } from 'lucide-react';
import TimelineGroup from './TimelineGroup';
import { CreateTaskModal, TaskModal } from '../../tasks';
import { MeetingBoard, MeetingEditor } from '../../meetings';
import { getAllProjectActivities, groupActivitiesByTimeRange } from '../../../shared/utils';

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
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [createTaskContext, setCreateTaskContext] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState('tasks');
  const [showAttachments, setShowAttachments] = useState(false);

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  const allActivities = useMemo(
    () => getAllProjectActivities(activeProject?.id || 'proj-default', tiles, meetings),
    [activeProject, tiles, meetings]
  );
  const groupedActivities = useMemo(() => {
    const source = allActivities.filter((a) => a.type === 'task');
    return groupActivitiesByTimeRange(source, timeRange, new Date());
  }, [allActivities, timeRange]);

  const taskLookup = useMemo(() => {
    const map = new Map();
    tiles.forEach((tile) => {
      if (tile.projectId !== (activeProject?.id || 'proj-default')) return;
      tile.tasks.forEach((task) => map.set(task.id, { task, tileId: tile.id, tileTitle: tile.title }));
    });
    return map;
  }, [tiles, activeProject]);

  const openCreateTaskModal = (context) => {
    setCreateTaskContext(context);
    setShowCreateTaskModal(true);
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

  const openTaskDetails = (activity) => {
    const id = activity.id ?? activity.taskId;
    if (!id) return;
    setEditingTaskId(id);
  };

  const meetingMap = useMemo(() => new Map(meetings.filter(m => m.projectId === (activeProject?.id || 'proj-default')).map((m) => [m.id, m])), [meetings, activeProject]);
  const attachmentsForProject = useMemo(() => Array.isArray(activeProject?.attachments) ? activeProject.attachments : [], [activeProject]);

  const isSelected = (project) => project.id === (activeProject?.id || null);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex h-screen">
        {/* Projects sidebar (simplified) */}
        <div className="mr-4 w-80 overflow-hidden rounded-xl bg-white navy-surface shadow-md dark:bg-[#0F1115] dark:border dark:border-gray-800">
          <div className="p-3.5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Projects</h3>
              <button onClick={onProjectCreate} className="rounded-full border border-gray-200 p-1.5 text-gray-500 transition hover:text-indigo-500 dark:border-gray-700 dark:text-gray-300" title="Create project">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              {projects.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">No projects yet</div>
              )}
              {projects.map((project) => (
                <div key={project.id} className={`p-2.5 rounded-md border transition ${isSelected(project) ? 'bg-gray-50 border-gray-300 dark:bg-[#1A1D24] dark:border-gray-700' : 'bg-white border-transparent hover:bg-gray-50 dark:bg-[#0F1115] dark:hover:bg-[#1A1D24]'}`} onClick={() => onProjectChange(project.id)}>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate text-gray-700 dark:text-gray-200">{project.name}</h4>
                      <p className="text-xs text-gray-500 truncate dark:text-gray-400">{project.description}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onProjectDelete(project.id); }} className="p-1 text-gray-400 hover:text-red-400" title="Delete project">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 rounded-xl bg-white navy-surface p-4 shadow-md dark:bg-[#0F1115] dark:border dark:border-gray-800">
          {/* View toggles (simplified) */}
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex rounded-lg bg-gray-100 dark:bg-[#1A1D24]">
              <button className={`flex items-center gap-1 rounded-md px-3 py-1.5 ${viewMode === 'tasks' && !showAttachments ? 'bg-white text-gray-700 shadow-sm dark:bg-[#232734] dark:text-gray-100' : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'}`} onClick={() => { setViewMode('tasks'); setShowAttachments(false); }}>
                Tasks
              </button>
              <button className={`flex items-center gap-1 rounded-md px-3 py-1.5 ${viewMode === 'meetings' && !showAttachments ? 'bg-white text-gray-700 shadow-sm dark:bg-[#232734] dark:text-gray-100' : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'}`} onClick={() => { setViewMode('meetings'); setShowAttachments(false); }}>
                Meetings
              </button>
            </div>
            {viewMode === 'tasks' && (
              <>
                <div className="flex rounded-lg bg-gray-100 dark:bg-[#1A1D24]">
                  {['week', 'month', 'quarter', 'year'].map((range) => (
                    <button key={range} className={`px-3 py-1.5 capitalize ${timeRange === range ? 'rounded-md bg-white text-gray-700 shadow-sm dark:bg-[#232734] dark:text-gray-100' : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'}`} onClick={() => setTimeRange(range)}>{range}</button>
                  ))}
                </div>
                <button onClick={() => setFiltersOpen((p) => !p)} className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-gray-600 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-gray-100"><Filter className="w-4 h-4" /> Filters</button>
                <button onClick={() => openCreateTaskModal({ projectId: activeProject?.id })} className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-[#232734]"><Plus className="w-4 h-4" /> Add task</button>
              </>
            )}
          </div>

          <div className="mt-4 h-[calc(100%-4rem)] overflow-y-auto text-gray-800 dark:text-gray-200">
            {viewMode === 'tasks' ? (
              groupedActivities.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-500 mb-2">No tasks yet</h3>
                  <p className="text-gray-400">Start by adding tasks to this project.</p>
                </div>
              ) : editingTaskId ? (
                <TaskModal
                  tileId={taskLookup.get(editingTaskId)?.tileId}
                  taskId={editingTaskId}
                  tiles={tiles}
                  projects={projects}
                  updateTask={updateTask}
                  onClose={() => setEditingTaskId(null)}
                  phases={phases}
                  presentation="inline"
                />
              ) : (
                <div className="space-y-3">
                  {groupedActivities.map((group, index) => (
                    <div key={group.period}>
                      {index !== 0 && <div className="h-px bg-gray-200 dark:bg-gray-800 mb-2" />}
                      <TimelineGroup
                        group={group}
                        isCollapsed={index > 0}
                        onTaskClick={(activity) => openTaskDetails(activity)}
                        onMeetingClick={(activity) => onTaskClick && onTaskClick(activity)}
                        onTaskEdit={(activity) => openTaskDetails(activity)}
                        onTaskDelete={(activity) => removeTask && removeTask(activity.tileId, activity.id)}
                      />
                    </div>
                  ))}
                </div>
              )
            ) : (
              <MeetingBoard
                meetings={meetings.filter((m) => m.projectId === (activeProject?.id || 'proj-default'))}
                onCreate={() => {
                  const meetingId = onMeetingCreate(activeProject?.id || 'proj-default');
                }}
                onEdit={() => {}}
                onDelete={(meetingId) => onMeetingDelete(meetingId)}
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
          presentation="inline"
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
  onAttachmentUnlink: PropTypes.func,
  attachmentDirStatus: PropTypes.string.isRequired,
  attachmentDirName: PropTypes.string,
};

export default TimelineView;

