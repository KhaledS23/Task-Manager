import React, { useState } from 'react';
import { TimelineView } from '../../features/timeline';
import { ProjectModal } from '../../features/projects';

const TimelinePage = ({ 
  projects, 
  tiles, 
  meetings, 
  selectedProjectId, 
  onProjectChange,
  onProjectEdit,
  onProjectCreate,
  onProjectSave,
  onProjectClose,
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
  attachmentDirStatus,
  attachmentDirName,
}) => {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const handleProjectCreate = () => {
    setEditingProject(null);
    setShowProjectModal(true);
  };

  const handleProjectEdit = (project) => {
    setEditingProject(project);
    setShowProjectModal(true);
  };

  const handleProjectSave = (projectData) => {
    // Use onProjectSave for edits to ensure persistence
    if (editingProject) {
      onProjectSave(editingProject.id, projectData);
    } else {
      onProjectCreate(projectData);
    }
    setShowProjectModal(false);
    setEditingProject(null);
  };

  const handleProjectClose = () => {
    setShowProjectModal(false);
    setEditingProject(null);
  };

  return (
    <>
      <TimelineView
        projects={projects}
        tiles={tiles}
        meetings={meetings}
        selectedProjectId={selectedProjectId}
        onProjectChange={onProjectChange}
        onProjectEdit={handleProjectEdit}
        onProjectCreate={handleProjectCreate}
        onProjectDelete={onProjectDelete}
        onProjectReorder={onProjectReorder}
        onTaskCreate={onTaskCreate}
        onTaskClick={onTaskClick}
        updateTask={updateTask}
        removeTask={removeTask}
        phases={phases}
        onPhaseReorder={onPhaseReorder}
        onMeetingCreate={onMeetingCreate}
        onMeetingUpdate={onMeetingUpdate}
        onMeetingDelete={onMeetingDelete}
        onLinkTaskToMeeting={onLinkTaskToMeeting}
        onUnlinkTaskFromMeeting={onUnlinkTaskFromMeeting}
        onAttachmentUpload={onAttachmentUpload}
        onAttachmentDownload={onAttachmentDownload}
        onAttachmentDelete={onAttachmentDelete}
        attachmentDirStatus={attachmentDirStatus}
        attachmentDirName={attachmentDirName}
      />
      
      {showProjectModal && (
        <ProjectModal
          project={editingProject}
          projects={projects}
          onSave={handleProjectSave}
          onClose={handleProjectClose}
        />
      )}
    </>
  );
};

export default TimelinePage;
