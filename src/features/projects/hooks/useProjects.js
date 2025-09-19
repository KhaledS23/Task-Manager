import { useState, useEffect } from 'react';
import { generateId } from '../../../shared/utils';
import { StorageService } from '../../../shared/services';

export const useProjects = () => {
  const [projects, setProjects] = useState(() => {
    const saved = StorageService.get('workChecklist');
    if (saved && Array.isArray(saved.projects)) {
      return saved.projects;
    }
    // No forced default project; start empty and let the user create projects.
    return [];
  });

  // Persist projects to localStorage
  useEffect(() => {
    const saved = StorageService.get('workChecklist', {});
    StorageService.set('workChecklist', { ...saved, projects });
  }, [projects]);

  const addProject = (projectData) => {
    const newProject = {
      id: generateId('proj'),
      name: projectData.name,
      description: projectData.description || '',
      color: projectData.color || '#3B82F6',
      status: projectData.status || 'active',
      startDate: projectData.startDate || new Date().toISOString().split('T')[0],
      endDate: projectData.endDate || null,
      createdAt: new Date().toISOString(),
      attachments: projectData.attachments || [],
    };
    setProjects(prev => [...prev, newProject]);
  };

  const updateProject = (projectId, updates) => {
    setProjects(prev => prev.map(project => 
      project.id === projectId ? { ...project, ...updates } : project
    ));
  };

  const deleteProject = (projectId) => {
    setProjects(prev => prev.filter(project => project.id !== projectId));
  };

  const reorderProjects = (sourceId, targetId) => {
    setProjects((prev) => {
      const sourceIndex = prev.findIndex((project) => project.id === sourceId);
      const targetIndex = prev.findIndex((project) => project.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  return {
    projects,
    addProject,
    updateProject,
    deleteProject,
    reorderProjects,
  };
};
