import { useState, useEffect } from 'react';
import { StorageService } from '../../../shared/services';
import { generateId, STORAGE_KEYS } from '../../../shared/utils';

export const useFinanceProjects = () => {
  const [projects, setProjects] = useState(() => {
    const saved = StorageService.get(STORAGE_KEYS.FINANCE);
    if (saved && Array.isArray(saved.projects)) return saved.projects;
    return [];
  });

  useEffect(() => {
    const saved = StorageService.get(STORAGE_KEYS.FINANCE, {});
    StorageService.set(STORAGE_KEYS.FINANCE, { ...saved, projects });
  }, [projects]);

  const addProject = (projectData) => {
    const newProject = {
      id: generateId('finproj'),
      name: projectData?.name || 'New Finance Project',
      description: projectData?.description || '',
      color: projectData?.color || '#6366F1',
      createdAt: new Date().toISOString(),
      finance: { limit: '', budgetId: '', expiry: '', pos: [] },
    };
    setProjects((prev) => [...prev, newProject]);
  };

  const updateProject = (projectId, updates) => {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, ...updates } : p)));
  };

  const deleteProject = (projectId) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  const reorderProjects = (sourceId, targetId) => {
    setProjects((prev) => {
      const a = [...prev];
      const from = a.findIndex((p) => p.id === sourceId);
      const to = a.findIndex((p) => p.id === targetId);
      if (from < 0 || to < 0 || from === to) return prev;
      const [m] = a.splice(from, 1);
      a.splice(to, 0, m);
      return a;
    });
  };

  return { projects, addProject, updateProject, deleteProject, reorderProjects };
};

