import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Upload,
  Download,
  Calendar as CalendarIcon,
  Eye,
  EyeOff,
  Flag,
  ChevronDown,
  X,
  Pencil,
  Copy,
  FileText,
  List,
  Settings,
  Bot,
  Maximize2,
  Users,
  Briefcase,
  CalendarCheck,
  ClipboardList,
  Code,
  Share,
  Headphones,
  Tag,
  LifeBuoy,
  PieChart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format,
  parseISO,
  getISOWeek,
  getISOWeekYear,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  isBefore,
  isAfter,
} from 'date-fns';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { jsPDF } from 'jspdf';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Import shared utilities and components
import { 
  generateId, 
  getWeekKey, 
  todayWeekKey, 
  isWeekInPast, 
  buildChartData,
  DEFAULT_SETTINGS,
  DEFAULT_TOKEN_INFO,
  MEETING_ICON_OPTIONS,
  STORAGE_KEYS
} from '../shared/utils';
import { StorageService } from '../shared/services';

// Import features
import { 
  useTasks, 
  useMeetings, 
  useProjects,
  TaskModal,
  ProjectModal 
} from '../features';

// Import pages
import { TimelinePage } from '../pages';

// Import components that are still in App.jsx (to be extracted later)
import MiniCalendar from './components/MiniCalendar';
import TileChart from './components/TileChart';
import MeetingModal from './components/MeetingModal';
import NoteModal from './components/NoteModal';
import IconPicker from './components/IconPicker';
import ExpandedTileModal from './components/ExpandedTileModal';
import ExpandedAddTaskInput from './components/ExpandedAddTaskInput';
import SettingsPage from './components/SettingsPage';

export default function App() {
  // Use custom hooks for state management
  const {
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
  } = useTasks();

  const {
    meetings,
    setMeetings,
    addMeeting,
    renameMeeting,
    removeMeeting,
    updateMeetingIcon,
    addMeetingAttachment,
    removeMeetingAttachment,
    addNote,
    updateNote,
    removeNote,
    reorderMeetings,
  } = useMeetings();

  const {
    projects,
    addProject,
    updateProject,
    deleteProject,
  } = useProjects();

  // Token tracking state for AI usage
  const [tokenInfo, setTokenInfo] = useState(() => {
    const saved = StorageService.get(STORAGE_KEYS.TOKENS);
    return saved || DEFAULT_TOKEN_INFO;
  });

  // Persist token information whenever it changes
  useEffect(() => {
    StorageService.set(STORAGE_KEYS.TOKENS, tokenInfo);
  }, [tokenInfo]);

  // Add token usage
  const addTokenUsage = (chars, multiplier = 1) => {
    setTokenInfo((prev) => ({ ...prev, used: prev.used + chars * multiplier }));
  };

  // Settings state
  const [settings, setSettings] = useState(() => {
    const saved = StorageService.get(STORAGE_KEYS.WORK_CHECKLIST);
    if (saved && saved.settings) {
      return { ...DEFAULT_SETTINGS, ...saved.settings };
    }
    return DEFAULT_SETTINGS;
  });

  // Persist settings to localStorage
  useEffect(() => {
    const saved = StorageService.get(STORAGE_KEYS.WORK_CHECKLIST, {});
    StorageService.set(STORAGE_KEYS.WORK_CHECKLIST, { ...saved, settings });
  }, [settings]);

  // Global filters and states
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [activePage, setActivePage] = useState('tasks');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTaskInfo, setSelectedTaskInfo] = useState(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNoteInfo, setCurrentNoteInfo] = useState(null);
  const [showExpandedTileModal, setShowExpandedTileModal] = useState(false);
  const [expandedTileId, setExpandedTileId] = useState(null);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dirHandle, setDirHandle] = useState(null);
  const [analysisTileIds, setAnalysisTileIds] = useState([]);
  const [analysisMeetingIds, setAnalysisMeetingIds] = useState([]);
  const [analysisInstructions, setAnalysisInstructions] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [analysisAudioUrl, setAnalysisAudioUrl] = useState(null);
  const [actionPlanLoading, setActionPlanLoading] = useState(false);
  const [actionPlanResult, setActionPlanResult] = useState('');
  const [actionPlanAudioUrl, setActionPlanAudioUrl] = useState(null);

  // Timeline view state
  const [selectedProjectId, setSelectedProjectId] = useState('proj-default');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  // Update document title
  useEffect(() => {
    document.title = 'Work Checklist App';
  }, []);

  // Cloud sync functions (stub)
  const pushToDrive = async () => {
    if (!cloudSyncEnabled) return;
    // Implementation for Google Drive sync
  };

  const pullFromDrive = async () => {
    if (!cloudSyncEnabled) return;
    // Implementation for Google Drive sync
  };

  // AI analysis functions
  const analyzeSelected = async () => {
    if (analysisLoading) return;
    setAnalysisLoading(true);
    setAnalysisResult('');
    setAnalysisAudioUrl(null);

    try {
      const selectedTasks = analysisTileIds
        .map((id) => {
          const t = tiles.find((tile) => tile.id === id);
          return t ? t.tasks : [];
        })
        .flat();
      const selectedNotes = analysisMeetingIds
        .map((id) => {
          const m = meetings.find((meeting) => meeting.id === id);
          return m ? m.notes : [];
        })
        .flat();

      const tasksText = selectedTasks
        .map(
          (t) =>
            `- ${t.label} (Owner: ${t.owner || 'None'}, Date: ${t.date || 'None'}, Priority: ${t.prio ? 'High' : 'Normal'}, Done: ${t.done ? 'Yes' : 'No'})`
        )
        .join('\n');
      const notesText = selectedNotes
        .map((n) => {
          const plainSummary = n.summary ? n.summary.replace(/<[^>]+>/g, '') : '';
          const plainActions = n.actions ? n.actions.replace(/<[^>]+>/g, '') : '';
          return `Date: ${n.date || 'None'}; Attendance: ${n.attendance || 'None'}; Summary: ${plainSummary}; Actions: ${plainActions}`;
        })
        .join('\n');

      const prompt = `Analyze the following tasks and meeting notes and provide insights:

Tasks:
${tasksText}

Meeting Notes:
${notesText}

Instructions: ${analysisInstructions}

Please provide a comprehensive analysis with actionable insights.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
        }),
      });

      const data = await response.json();
      const result = data.choices[0].message.content;
      setAnalysisResult(result);
      addTokenUsage(result.length);

      if (settings.aiPlay) {
        const audioResponse = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`,
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: result,
            voice: 'alloy',
          }),
        });

        if (audioResponse.ok) {
          const audioBlob = await audioResponse.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          setAnalysisAudioUrl(audioUrl);
          addTokenUsage(result.length, settings.tokenPerCharAudio);
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisResult('Error: ' + error.message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const generateActionPlan = async () => {
    if (actionPlanLoading) return;
    setActionPlanLoading(true);
    setActionPlanResult('');
    setActionPlanAudioUrl(null);

    try {
      const selectedTasks = tiles.flatMap((tile) => tile.tasks);
      const selectedNotes = meetings.flatMap((m) => m.notes);

      const tasksText = selectedTasks
        .map(
          (t) =>
            `- ${t.label} (Owner: ${t.owner || 'None'}, Date: ${t.date || 'None'}, Priority: ${t.prio ? 'High' : 'Normal'}, Done: ${t.done ? 'Yes' : 'No'})`
        )
        .join('\n');
      const notesText = selectedNotes
        .map((n) => {
          const plainSummary = n.summary ? n.summary.replace(/<[^>]+>/g, '') : '';
          const plainActions = n.actions ? n.actions.replace(/<[^>]+>/g, '') : '';
          return `Date: ${n.date || 'None'}; Attendance: ${n.attendance || 'None'}; Summary: ${plainSummary}; Actions: ${plainActions}`;
        })
        .join('\n');

      const prompt = `Create a detailed day-by-day action plan based on the following tasks and meeting notes:

Tasks:
${tasksText}

Meeting Notes:
${notesText}

Please provide a structured action plan with specific daily tasks and priorities.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500,
        }),
      });

      const data = await response.json();
      const result = data.choices[0].message.content;
      setActionPlanResult(result);
      addTokenUsage(result.length);

      if (settings.aiPlay) {
        const audioResponse = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`,
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: result,
            voice: 'alloy',
          }),
        });

        if (audioResponse.ok) {
          const audioBlob = await audioResponse.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          setActionPlanAudioUrl(audioUrl);
          addTokenUsage(result.length, settings.tokenPerCharAudio);
        }
      }
    } catch (error) {
      console.error('Action plan error:', error);
      setActionPlanResult('Error: ' + error.message);
    } finally {
      setActionPlanLoading(false);
    }
  };

  // Export functions
  const exportToCSV = () => {
    const tasksData = tiles.flatMap((tile) =>
      tile.tasks.map((task) => ({
        Tile: tile.title,
        Task: task.label,
        Owner: task.owner || '',
        Date: task.date || '',
        Priority: task.prio ? 'High' : 'Normal',
        Done: task.done ? 'Yes' : 'No',
      }))
    );

    const meetingsData = meetings.flatMap((meeting) =>
      meeting.notes.map((note) => ({
        Meeting: meeting.title,
        Date: note.date || '',
        Attendance: note.attendance || '',
        Summary: note.summary ? note.summary.replace(/<[^>]+>/g, '') : '',
        Actions: note.actions ? note.actions.replace(/<[^>]+>/g, '') : '',
      }))
    );

    const csv = Papa.unparse([...tasksData, ...meetingsData]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'work-checklist-export.csv');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    let y = 40;

    // Add title
    doc.setFontSize(20);
    doc.text('Work Checklist Export', 20, 30);

    // Add tasks
    doc.setFontSize(16);
    doc.text('Tasks', 20, y);
    y += 10;

    tiles.forEach((tile) => {
      if (tile.tasks.length > 0) {
        doc.setFontSize(12);
        doc.text(`${tile.title}:`, 20, y);
        y += 8;

        tile.tasks.forEach((task) => {
          const status = task.done ? '✓' : '○';
          const priority = task.prio ? ' (High Priority)' : '';
          doc.text(`  ${status} ${task.label}${priority}`, 25, y);
          y += 6;
        });
        y += 5;
      }
    });

    // Add meetings
    doc.setFontSize(16);
    doc.text('Meetings', 20, y);
    y += 10;

    meetings.forEach((meeting) => {
      if (meeting.notes.length > 0) {
        doc.setFontSize(12);
        doc.text(`${meeting.title}:`, 20, y);
        y += 8;

        meeting.notes.forEach((note) => {
          const date = note.date ? ` (${note.date})` : '';
          doc.text(`  • ${note.summary ? note.summary.replace(/<[^>]+>/g, '') : 'No summary'}${date}`, 25, y);
          y += 6;
        });
        y += 5;
      }
    });

    doc.save('work-checklist-export.pdf');
  };

  // Import function
  const importFromCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const data = results.data;
        const newTiles = [];
        const newMeetings = [];

        data.forEach((row) => {
          if (row.Task) {
            // This is a task
            let tile = newTiles.find((t) => t.title === row.Tile);
            if (!tile) {
              tile = {
                id: generateId('tile'),
                title: row.Tile,
                tasks: [],
                projectId: 'proj-default',
              };
              newTiles.push(tile);
            }

            tile.tasks.push({
              id: generateId('task'),
              label: row.Task,
              owner: row.Owner || '',
              date: row.Date || null,
              prio: row.Priority === 'High',
              done: row.Done === 'Yes',
            });
          } else if (row.Meeting) {
            // This is a meeting note
            let meeting = newMeetings.find((m) => m.title === row.Meeting);
            if (!meeting) {
              meeting = {
                id: generateId('meeting'),
                title: row.Meeting,
                notes: [],
                attachments: [],
                updatedAt: Date.now(),
                icon: null,
                projectId: 'proj-default',
              };
              newMeetings.push(meeting);
            }

            meeting.notes.push({
              id: generateId('note'),
              date: row.Date || '',
              attendance: row.Attendance || '',
              summary: row.Summary || '',
              actions: row.Actions || '',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          }
        });

        setTiles((prev) => [...prev, ...newTiles]);
        setMeetings((prev) => [...prev, ...newMeetings]);
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {settings.logo && (
                <img src={settings.logo} alt="Logo" className="w-12 h-12 object-contain" />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Work Checklist App</h1>
                <p className="text-gray-600">Manage your tasks, meetings, and projects efficiently</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex items-center justify-center space-x-8">
            <button
              onClick={() => setActivePage('tasks')}
              className={`flex flex-col items-center ${activePage === 'tasks' ? 'text-purple-700' : 'text-gray-500 hover:text-purple-600'}`}
            >
              <List className="w-6 h-6" />
              <span className="text-xs mt-1">Tasks</span>
            </button>
            <button
              onClick={() => setActivePage('meetings')}
              className={`flex flex-col items-center ${activePage === 'meetings' ? 'text-purple-700' : 'text-gray-500 hover:text-purple-600'}`}
            >
              <CalendarIcon className="w-6 h-6" />
              <span className="text-xs mt-1">Meetings</span>
            </button>
            <button
              onClick={() => setActivePage('timeline')}
              className={`flex flex-col items-center ${activePage === 'timeline' ? 'text-purple-700' : 'text-gray-500 hover:text-purple-600'}`}
            >
              <CalendarCheck className="w-6 h-6" />
              <span className="text-xs mt-1">Timeline</span>
            </button>
            <button
              onClick={() => setActivePage('ai')}
              className={`flex flex-col items-center ${activePage === 'ai' ? 'text-purple-700' : 'text-gray-500 hover:text-purple-600'}`}
            >
              <Bot className="w-6 h-6" />
              <span className="text-xs mt-1">AI</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {activePage === 'timeline' && (
            <TimelinePage
              projects={projects}
              tiles={tiles}
              meetings={meetings}
              selectedProjectId={selectedProjectId}
              onProjectChange={setSelectedProjectId}
              onProjectEdit={(project) => {
                setEditingProject(project);
                setShowProjectModal(true);
              }}
              onProjectCreate={(projectData) => {
                addProject(projectData);
              }}
              onProjectSave={(projectId, updates) => {
                updateProject(projectId, updates);
              }}
              onProjectClose={() => {
                setShowProjectModal(false);
                setEditingProject(null);
              }}
              onTaskCreate={(taskData) => {
                createTask(taskData);
              }}
              onTaskClick={(task) => {
                // Handle task click - could open a detailed view or edit modal
                console.log('Task clicked:', task);
              }}
            />
          )}

          {/* Other pages would go here */}
          {activePage === 'tasks' && (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-500">Tasks Page</h2>
              <p className="text-gray-400">This will be implemented in the next phase</p>
            </div>
          )}

          {activePage === 'meetings' && (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-500">Meetings Page</h2>
              <p className="text-gray-400">This will be implemented in the next phase</p>
            </div>
          )}

          {activePage === 'ai' && (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-500">AI Assistant Page</h2>
              <p className="text-gray-400">This will be implemented in the next phase</p>
            </div>
          )}
        </div>

        {/* Modals */}
        {showTaskModal && selectedTaskInfo && (
          <TaskModal
            tileId={selectedTaskInfo.tileId}
            taskId={selectedTaskInfo.taskId}
            tiles={tiles}
            projects={projects}
            updateTask={updateTask}
            onClose={() => setShowTaskModal(false)}
          />
        )}

        {showProjectModal && (
          <ProjectModal
            project={editingProject}
            projects={projects}
            onSave={(projectData) => {
              if (editingProject) {
                updateProject(editingProject.id, projectData);
              } else {
                addProject(projectData);
              }
              setShowProjectModal(false);
              setEditingProject(null);
            }}
            onClose={() => {
              setShowProjectModal(false);
              setEditingProject(null);
            }}
          />
        )}

        {/* Settings Modal */}
        {showSettings && (
          <SettingsPage
            settings={settings}
            setSettings={setSettings}
            tokenInfo={tokenInfo}
            setTokenInfo={setTokenInfo}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Footer */}
        <footer className="text-center text-xs py-3 border-t border-gray-200 text-gray-500">
          © {new Date().getFullYear()} Khaled Senan. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
