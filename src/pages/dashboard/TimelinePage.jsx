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
  onTaskCreate,
  onTaskClick,
  updateTask,
  removeTask
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
        onTaskCreate={onTaskCreate}
        onTaskClick={onTaskClick}
        tiles={tiles}
        projects={projects}
        updateTask={updateTask}
        removeTask={removeTask}
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
