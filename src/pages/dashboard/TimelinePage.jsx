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
  onTaskCreate,
  onTaskClick
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
    if (editingProject) {
      onProjectEdit(editingProject.id, projectData);
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
        onTaskCreate={onTaskCreate}
        onTaskClick={onTaskClick}
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
