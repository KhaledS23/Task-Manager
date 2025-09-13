import { useState, useEffect } from 'react';
import { generateId } from '../../../shared/utils';
import { StorageService } from '../../../shared/services';

export const useTasks = () => {
  const [tiles, setTiles] = useState(() => {
    const saved = StorageService.get('workChecklist');
    if (saved && Array.isArray(saved.tiles)) {
      return saved.tiles;
    }
    return [
      { id: generateId('tile'), title: 'New Tile', tasks: [], projectId: 'proj-default' },
    ];
  });

  // Persist tiles to localStorage
  useEffect(() => {
    const saved = StorageService.get('workChecklist', {});
    StorageService.set('workChecklist', { ...saved, tiles });
  }, [tiles]);

  const addTile = (title, projectId = 'proj-default') => {
    const newTile = {
      id: generateId('tile'),
      title: title || 'New Tile',
      tasks: [],
      projectId
    };
    setTiles(prev => [...prev, newTile]);
  };

  const removeTile = (tileId) => {
    setTiles(prev => prev.filter(tile => tile.id !== tileId));
  };

  const renameTile = (tileId, newTitle) => {
    setTiles(prev => prev.map(tile => 
      tile.id === tileId ? { ...tile, title: newTitle } : tile
    ));
  };

  const addTask = (tileId, label, projectId = 'proj-default') => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const newTask = {
      id: generateId('task'),
      label: trimmed,
      done: false,
      prio: false,
      date: null,
      owner: '',
    };
    setTiles(prev => prev.map(tile => 
      tile.id === tileId 
        ? { 
            ...tile, 
            tasks: [...tile.tasks, newTask],
            projectId: projectId || tile.projectId || 'proj-default'
          } 
        : tile
    ));
  };

  const createTask = (taskData) => {
    const newTask = {
      id: taskData.id || generateId('task'),
      label: taskData.label,
      description: taskData.description || '',
      owner: taskData.owner || '',
      date: taskData.date || null,
      dueDate: taskData.dueDate || null,
      prio: taskData.prio || false,
      done: taskData.done || false,
      priority: taskData.priority || 'normal',
      status: taskData.status || 'todo',
      category: taskData.category || '',
      tags: taskData.tags || [],
      estimatedHours: taskData.estimatedHours || '',
      actualHours: taskData.actualHours || '',
      createdAt: taskData.createdAt || new Date().toISOString(),
      updatedAt: taskData.updatedAt || new Date().toISOString(),
    };

    // Find or create a tile for this task
    let targetTileId = null;
    const existingTile = tiles.find(tile => 
      tile.projectId === taskData.projectId && 
      (tile.title === taskData.category || tile.title === 'New Task')
    );

    if (existingTile) {
      targetTileId = existingTile.id;
    } else {
      // Create a new tile
      const newTile = {
        id: generateId('tile'),
        title: taskData.category || 'New Task',
        tasks: [],
        projectId: taskData.projectId || 'proj-default',
      };
      setTiles(prev => [...prev, newTile]);
      targetTileId = newTile.id;
    }

    // Add the task to the target tile
    setTiles(prev => prev.map(tile => 
      tile.id === targetTileId 
        ? { 
            ...tile, 
            tasks: [...tile.tasks, newTask]
          } 
        : tile
    ));
  };

  const removeTask = (tileId, taskId) => {
    setTiles(prev => prev.map(tile => 
      tile.id === tileId 
        ? { ...tile, tasks: tile.tasks.filter(task => task.id !== taskId) }
        : tile
    ));
  };

  const updateTask = (tileId, taskId, updatedFields) => {
    setTiles(prev => prev.map(tile => 
      tile.id === tileId 
        ? { 
            ...tile, 
            tasks: tile.tasks.map(task => 
              task.id === taskId ? { ...task, ...updatedFields } : task
            )
          }
        : tile
    ));
  };

  const toggleDone = (tileId, taskId) => {
    setTiles(prev => prev.map(tile => 
      tile.id === tileId 
        ? { 
            ...tile, 
            tasks: tile.tasks.map(task => 
              task.id === taskId ? { ...task, done: !task.done } : task
            )
          }
        : tile
    ));
  };

  const togglePrio = (tileId, taskId) => {
    setTiles(prev => prev.map(tile => 
      tile.id === tileId 
        ? { 
            ...tile, 
            tasks: tile.tasks.map(task => 
              task.id === taskId ? { ...task, prio: !task.prio } : task
            )
          }
        : tile
    ));
  };

  const updateDate = (tileId, taskId, date) => {
    setTiles(prev => prev.map(tile => 
      tile.id === tileId 
        ? { 
            ...tile, 
            tasks: tile.tasks.map(task => 
              task.id === taskId ? { ...task, date } : task
            )
          }
        : tile
    ));
  };

  const reorderTasks = (tileId, fromIndex, toIndex) => {
    setTiles(prev => prev.map(tile => {
      if (tile.id !== tileId) return tile;
      const tasksCopy = [...tile.tasks];
      const [moved] = tasksCopy.splice(fromIndex, 1);
      tasksCopy.splice(toIndex, 0, moved);
      return { ...tile, tasks: tasksCopy };
    }));
  };

  const reorderTiles = (fromIndex, toIndex) => {
    setTiles(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return arr;
    });
  };

  return {
    tiles,
    setTiles,
    addTile,
    removeTile,
    renameTile,
    addTask,
    createTask,
    removeTask,
    updateTask,
    toggleDone,
    togglePrio,
    updateDate,
    reorderTasks,
    reorderTiles,
  };
};
