import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
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
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Sun,
  Moon,
  Palette,
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
import {
  StorageService,
  supabasePushState,
  supabasePullState,
  saveAttachmentDirectoryHandle,
  getAttachmentDirectoryHandle,
  ensureDirectoryPermission,
  clearAttachmentDirectoryHandle,
  writeFileToDirectory,
  readFileFromDirectory,
  deleteFileFromDirectory,
} from '../shared/services';

// Import features
import { 
  useTasks, 
  useMeetings, 
  useProjects,
  TaskModal,
  ProjectModal 
} from '../features';

// Lazy-loaded pages for code splitting
const TimelinePage = lazy(() => import('../pages/dashboard/TimelinePage.jsx'));
const AgentPage = lazy(() => import('../pages/agent/AgentPage.jsx'));
const DeepLPage = lazy(() => import('../pages/deepl/DeepLPage.jsx'));
const SettingsPage = lazy(() => import('./components/SettingsPage.jsx'));

// Import components that are still in App.jsx (to be extracted later)
import MiniCalendar from './components/MiniCalendar';
import TileChart from './components/TileChart';

export function AppShell() {
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
    addMeeting,
    updateMeeting,
    removeMeeting,
    addMeetingAttachment,
    updateMeetingAttachment,
    removeMeetingAttachment,
    linkTaskToMeeting,
    unlinkTaskFromMeeting,
    reorderMeetings,
  } = useMeetings();

  const {
    projects,
    addProject,
    updateProject,
    deleteProject,
    reorderProjects,
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
      const envDefaults = {
        supabaseUrl: import.meta?.env?.VITE_SUPABASE_URL || '',
        supabaseAnonKey: import.meta?.env?.VITE_SUPABASE_ANON_KEY || '',
        supabaseWorkspaceId: import.meta?.env?.VITE_SUPABASE_WORKSPACE_ID || '',
        supabaseEnabled: (import.meta?.env?.VITE_SUPABASE_ENABLED === 'true') || saved.settings.supabaseEnabled || false,
      };
      return { ...DEFAULT_SETTINGS, ...envDefaults, ...saved.settings };
    }
    const envDefaults = {
      supabaseUrl: import.meta?.env?.VITE_SUPABASE_URL || '',
      supabaseAnonKey: import.meta?.env?.VITE_SUPABASE_ANON_KEY || '',
      supabaseWorkspaceId: import.meta?.env?.VITE_SUPABASE_WORKSPACE_ID || '',
      supabaseEnabled: import.meta?.env?.VITE_SUPABASE_ENABLED === 'true',
    };
    return { ...DEFAULT_SETTINGS, ...envDefaults };
  });

  // Persist settings to localStorage
  useEffect(() => {
    const saved = StorageService.get(STORAGE_KEYS.WORK_CHECKLIST, {});
    StorageService.set(STORAGE_KEYS.WORK_CHECKLIST, { ...saved, settings });
  }, [settings]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const handle = await getAttachmentDirectoryHandle();
        if (!mounted) return;
        if (handle) {
          const permission = await ensureDirectoryPermission(handle);
          if (!mounted) return;
          setAttachmentDirHandle(handle);
          setAttachmentDirName(handle.name || '');
          setAttachmentDirStatus(permission === 'granted' ? 'granted' : 'denied');
          if (permission === 'granted' && settings.attachmentDirectoryName !== (handle.name || '')) {
            setSettings((prev) => ({ ...prev, attachmentDirectoryName: handle.name || '' }));
          }
        } else {
          setAttachmentDirHandle(null);
          setAttachmentDirStatus('not-configured');
        }
      } catch (err) {
        console.warn('Attachment directory init failed', err);
        if (!mounted) return;
        setAttachmentDirHandle(null);
        setAttachmentDirStatus('not-configured');
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [attachmentDirHandle, setAttachmentDirHandle] = useState(null);
  const [attachmentDirStatus, setAttachmentDirStatus] = useState('checking');
  const [attachmentDirName, setAttachmentDirName] = useState(settings.attachmentDirectoryName || '');

  // Debounced Supabase auto-sync (push on changes)
  const lastPushRef = React.useRef('');
  const pushTimerRef = React.useRef(null);
  const [cloudStatus, setCloudStatus] = useState('idle'); // idle|syncing|synced|offline|error
  useEffect(() => {
    const canSync = settings?.supabaseEnabled && settings?.supabaseUrl && settings?.supabaseAnonKey && settings?.supabaseWorkspaceId;
    if (!canSync) return;
    const state = { tiles, meetings, projects, settings };
    const payload = JSON.stringify(state);
    if (payload === lastPushRef.current) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(async () => {
      try {
        const result = await supabasePushState(settings, state);
        lastPushRef.current = payload;
        const savedLocal = StorageService.get(STORAGE_KEYS.WORK_CHECKLIST, {});
        const meta = {
          remoteUpdatedAt: (result && result.updated_at) || new Date().toISOString(),
          lastPushAt: new Date().toISOString(),
        };
        StorageService.set(STORAGE_KEYS.WORK_CHECKLIST, { ...savedLocal, cloudMeta: meta });
      } catch (err) {
        console.warn('Auto-sync failed:', err.message);
      }
    }, 1500);
    return () => pushTimerRef.current && clearTimeout(pushTimerRef.current);
  }, [tiles, meetings, projects, settings]);

  // Apply theme to document root/body
  useEffect(() => {
    const theme = settings?.theme || 'dark';
    const isDark = theme === 'dark';
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.dataset.theme = theme;
    if (typeof document !== 'undefined') {
      const body = document.body;
      const themeStyles = {
        light: { background: '#f4f6fb', color: '#1f2937' },
        dark: { background: '#05070c', color: '#e5e7eb' },
        navy: { background: '#e9ecf5', color: '#2f3545' },
      };
      const palette = themeStyles[theme] || themeStyles.dark;
      body.classList.toggle('light-theme', theme === 'light');
      body.classList.toggle('dark-theme', theme === 'dark');
      body.classList.toggle('navy-theme', theme === 'navy');
      body.style.backgroundColor = palette.background;
      body.style.color = palette.color;
    }
  }, [settings?.theme]);

  // On-load pull once per session: only reload if remote is newer than local
  const pulledOnceRef = React.useRef(false);
  useEffect(() => {
    const canSync = settings?.supabaseEnabled && settings?.supabaseUrl && settings?.supabaseAnonKey && settings?.supabaseWorkspaceId;
    if (!canSync || pulledOnceRef.current) return;
    pulledOnceRef.current = true;
    (async () => {
      try {
        const remote = await supabasePullState(settings);
        if (remote?.data) {
          const local = StorageService.get(STORAGE_KEYS.WORK_CHECKLIST, {});
          const localRemoteUpdatedAt = local?.cloudMeta?.remoteUpdatedAt ? new Date(local.cloudMeta.remoteUpdatedAt) : null;
          const remoteUpdatedAt = remote?.updated_at ? new Date(remote.updated_at) : null;
          // Reload only if remote is newer or local has no stamp
          if (!localRemoteUpdatedAt || (remoteUpdatedAt && remoteUpdatedAt > localRemoteUpdatedAt)) {
            StorageService.set(
              STORAGE_KEYS.WORK_CHECKLIST,
              { ...remote.data, cloudMeta: { remoteUpdatedAt: remote.updated_at, lastPullAt: new Date().toISOString() } }
            );
            window.location.reload();
          }
        }
      } catch (err) {
        // Silent fail on startup pull
      }
    })();
  }, [settings.supabaseEnabled, settings.supabaseUrl, settings.supabaseAnonKey, settings.supabaseWorkspaceId]);

  // Online listener: pull latest if remote is newer
  useEffect(() => {
    const handler = async () => {
      const canSync = settings?.supabaseEnabled && settings?.supabaseUrl && settings?.supabaseAnonKey && settings?.supabaseWorkspaceId;
      if (!canSync) return;
      try {
        const remote = await supabasePullState(settings);
        if (!remote?.data) return;
        const local = StorageService.get(STORAGE_KEYS.WORK_CHECKLIST, {});
        const localRemoteUpdatedAt = local?.cloudMeta?.remoteUpdatedAt ? new Date(local.cloudMeta.remoteUpdatedAt) : null;
        const remoteUpdatedAt = remote?.updated_at ? new Date(remote.updated_at) : null;
        if (!localRemoteUpdatedAt || (remoteUpdatedAt && remoteUpdatedAt > localRemoteUpdatedAt)) {
          StorageService.set(STORAGE_KEYS.WORK_CHECKLIST, { ...remote.data, cloudMeta: { remoteUpdatedAt: remote.updated_at, lastPullAt: new Date().toISOString() } });
          window.location.reload();
        }
      } catch {}
    };
    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
  }, [settings.supabaseEnabled, settings.supabaseUrl, settings.supabaseAnonKey, settings.supabaseWorkspaceId]);

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
  // Routing replaces activePage; see RoutedApp below
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTaskInfo, setSelectedTaskInfo] = useState(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNoteInfo, setCurrentNoteInfo] = useState(null);
  const [showExpandedTileModal, setShowExpandedTileModal] = useState(false);
  const [expandedTileId, setExpandedTileId] = useState(null);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
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

  const ensureAttachmentDirectory = async () => {
    if (!attachmentDirHandle) return 'not-configured';
    const status = await ensureDirectoryPermission(attachmentDirHandle);
    setAttachmentDirStatus(status === 'granted' ? 'granted' : 'denied');
    return status;
  };

  const selectAttachmentDirectory = async () => {
    if (!window.showDirectoryPicker) {
      alert('Your browser does not support the File System Access API. Please use the latest Chrome or Edge.');
      return null;
    }
    try {
      const handle = await window.showDirectoryPicker();
      const permission = await ensureDirectoryPermission(handle);
      if (permission !== 'granted') {
        alert('Folder permission is required to manage attachments.');
        return null;
      }
      await saveAttachmentDirectoryHandle(handle);
      setAttachmentDirHandle(handle);
      setAttachmentDirName(handle.name || '');
      setAttachmentDirStatus('granted');
      setSettings((prev) => ({ ...prev, attachmentDirectoryName: handle.name || '' }));
      return handle;
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.error('Selecting attachment directory failed', err);
      return null;
    }
  };

  const clearAttachmentDirectory = async () => {
    await clearAttachmentDirectoryHandle();
    setAttachmentDirHandle(null);
    setAttachmentDirStatus('not-configured');
    setAttachmentDirName('');
    setSettings((prev) => ({ ...prev, attachmentDirectoryName: '' }));
  };

  const updateProjectAttachments = (projectId, updater) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    const current = Array.isArray(project.attachments) ? project.attachments : [];
    const next = updater(current);
    updateProject(projectId, { attachments: next });
  };

  const attachFile = async ({ projectId, meetingId, files }) => {
    let handle = attachmentDirHandle;
    if (!handle) {
      handle = await selectAttachmentDirectory();
    }
    if (!handle) {
      return [];
    }
    const permission = await ensureDirectoryPermission(handle);
    if (permission !== 'granted') {
      alert('Folder permission is required to save attachments.');
      setAttachmentDirStatus('denied');
      return [];
    }
    setAttachmentDirStatus('granted');
    const metas = [];
    const projectKey = projectId || 'proj-default';
    for (const file of files) {
      const safeName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      const segments = [projectKey];
      if (meetingId) segments.push(`meeting-${meetingId}`);
      const filePath = [...segments, safeName].join('/');
      await writeFileToDirectory(handle, filePath, file);
      const meta = {
        id: generateId('file'),
        name: file.name,
        size: file.size,
        type: file.type,
        createdAt: new Date().toISOString(),
        projectId: projectKey,
        meetingId: meetingId || null,
        path: filePath,
      };
      metas.push(meta);
      if (meetingId) {
        addMeetingAttachment(meetingId, meta);
      }
      updateProjectAttachments(projectKey, (list) => {
        const filtered = list.filter((item) => item.id !== meta.id);
        return [...filtered, meta];
      });
    }
    return metas;
  };

  const linkAttachment = ({ projectId, meetingId, href, name }) => {
    if (!href) return null;
    const meta = {
      id: generateId('file'),
      name: name || href.split(/[\\/]/).pop() || 'Linked file',
      size: 0,
      type: 'link',
      storageType: 'link',
      href,
      createdAt: new Date().toISOString(),
      projectId: projectId || 'proj-default',
      meetingId: meetingId || null,
    };
    if (meetingId) {
      addMeetingAttachment(meetingId, meta);
    }
    updateProjectAttachments(meta.projectId, (list) => [...list, meta]);
    return meta;
  };

  const downloadAttachment = async (attachment) => {
    try {
      if (attachment?.href) {
        const opened = window.open(attachment.href, '_blank', 'noopener,noreferrer');
        if (!opened) alert('Allow popups to open linked files.');
        return;
      }
      if (!attachmentDirHandle) {
        alert('Select an attachment folder in Settings first.');
        return;
      }
      const permission = await ensureDirectoryPermission(attachmentDirHandle);
      if (permission !== 'granted') {
        alert('Permission to read the attachment folder was denied. Re-authorize in Settings.');
        return;
      }
      const file = await readFileFromDirectory(attachmentDirHandle, attachment.path);
      const url = URL.createObjectURL(file);
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error('Failed to download attachment', err);
      alert('Unable to open attachment. Please ensure the folder is still accessible.');
    }
  };

  const deleteAttachment = async (attachment) => {
    if (!attachment) return;
    try {
      if (attachment?.href) throw new Error('linked-only');
      if (!attachmentDirHandle) {
        alert('Select an attachment folder in Settings first.');
        return;
      }
      const permission = await ensureDirectoryPermission(attachmentDirHandle);
      if (permission !== 'granted') {
        alert('Permission denied. Re-authorize in Settings.');
        return;
      }
      await deleteFileFromDirectory(attachmentDirHandle, attachment.path);
    } catch (err) {
      if (err?.message !== 'linked-only') {
        console.warn('Could not delete file from disk', err);
      }
    }

    if (attachment.meetingId) {
      removeMeetingAttachment(attachment.meetingId, attachment.id);
    }
    updateProjectAttachments(attachment.projectId || 'proj-default', (list) =>
      list.filter((att) => att.id !== attachment.id)
    );
  };

  const unlinkAttachment = (attachment) => {
    if (!attachment?.id) return;
    if (attachment.meetingId) {
      removeMeetingAttachment(attachment.meetingId, attachment.id);
    }
    updateProjectAttachments(attachment.projectId || 'proj-default', (list) =>
      list.map((item) => (item.id === attachment.id ? { ...item, meetingId: null } : item))
    );
  };

  const findTaskContext = (taskId) => {
    for (const tile of tiles) {
      const match = tile.tasks.find((task) => task.id === taskId);
      if (match) {
        return { tileId: tile.id, tileTitle: tile.title };
      }
    }
    return null;
  };

  const handleMeetingDelete = async (meetingId) => {
    const meeting = meetings.find((m) => m.id === meetingId);
    if (meeting && Array.isArray(meeting.attachments)) {
      for (const attachment of meeting.attachments) {
        await deleteAttachment(attachment);
      }
    }
    removeMeeting(meetingId);
  };

  const handlePhaseReorder = (sourceIndex, targetIndex) => {
    setSettings((prev) => {
      const sequence = Array.isArray(prev.phases) ? [...prev.phases] : [];
      if (
        sourceIndex < 0 ||
        targetIndex < 0 ||
        sourceIndex >= sequence.length ||
        targetIndex >= sequence.length
      ) {
        return prev;
      }
      const updated = [...sequence];
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, moved);
      return { ...prev, phases: updated };
    });
  };

  const handleTaskOpen = (activity) => {
    if (!activity) return false;
    const taskId = activity.id ?? activity.taskId;
    if (!taskId) return false;
    let tileId = activity.tileId ?? activity.tile?.id ?? null;
    let tileTitle = activity.tileTitle ?? activity.tile?.title ?? null;
    if (tileId == null) {
      const fallback = findTaskContext(taskId);
      if (!fallback) return false;
      tileId = fallback.tileId;
      tileTitle = fallback.tileTitle;
    }
    // Push task deep link into URL for share/refresh; inline editor will handle display
    try {
      if (!location.pathname.startsWith('/task/')) {
        navigate(`/task/${encodeURIComponent(taskId)}`);
      }
    } catch {}
    return true;
  };

  const themeMode = settings?.theme || 'dark';
  const themeOptions = [
    { key: 'light', icon: Sun, label: 'Light' },
    { key: 'dark', icon: Moon, label: 'Dark' },
    { key: 'navy', icon: Palette, label: 'Midnight' },
  ];

  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname || '/timeline';

  // Deep link handling moved to TimelineView for inline presentation

  return (
    <div
      className={`min-h-screen bg-gray-50 dark:bg-[#0B0D12] ${
        themeMode === 'navy' ? 'bg-[#dde2ee]' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white navy-surface rounded-xl shadow-md p-6 mb-6 dark:bg-[#0F1115] dark:border dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {settings.logo && (
                <img src={settings.logo} alt="Logo" className="w-12 h-12 object-contain" />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Work Checklist App</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage your tasks, meetings, and projects efficiently</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 p-1 shadow-sm dark:border-gray-700 dark:bg-[#1A1D24]">
                {themeOptions.map(({ key, icon: Icon, label }) => {
                  const isActive = themeMode === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSettings((prev) => ({ ...prev, theme: key }))}
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                        isActive
                          ? 'bg-white text-indigo-600 shadow dark:bg-[#2B3242] dark:text-indigo-300'
                          : 'text-gray-500 hover:text-indigo-500'
                      }`}
                      aria-label={`Switch to ${label} mode`}
                      title={label}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
              {/* Cloud status */}
              {(() => {
                const enabled = !!settings.supabaseEnabled && !!settings.supabaseUrl && !!settings.supabaseAnonKey && !!settings.supabaseWorkspaceId;
                const offline = typeof navigator !== 'undefined' && !navigator.onLine;
                const status = !enabled ? 'local' : offline ? 'offline' : 'online';
                const pillClass =
                  status === 'online'
                    ? 'text-emerald-300 bg-emerald-900/30 border-emerald-700'
                    : status === 'offline'
                    ? 'text-yellow-300 bg-yellow-900/30 border-yellow-700'
                    : 'text-gray-300 bg-gray-800 border-gray-600';
                const LabelIcon = status === 'online' ? CheckCircle2 : status === 'offline' ? CloudOff : Cloud;
                return (
                  <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${pillClass}`} title={enabled ? `Supabase ${status}` : 'Local only'}>
                    <LabelIcon className="w-3.5 h-3.5" />
                    {enabled ? (status === 'online' ? 'Cloud: Online' : 'Cloud: Offline') : 'Local Storage'}
                  </span>
                );
              })()}
              <button
                onClick={() => navigate('/settings')}
                className="p-2 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-[#1A1D24]"
                title="Open settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white navy-surface rounded-xl shadow-md p-4 mb-6 dark:bg-[#0F1115] dark:border dark:border-gray-800">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-gray-600 dark:text-gray-300">
            {[
              { key: 'timeline', label: 'Timeline', icon: CalendarCheck, path: '/timeline' },
              { key: 'agent', label: 'Agent', icon: Bot, path: '/agent' },
              { key: 'deepl', label: 'DeepL', icon: Sparkles, path: '/deepl' },
              { key: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path || (item.path === '/timeline' && (currentPath === '/' || currentPath.startsWith('/timeline') || currentPath.startsWith('/task/')));
              return (
                <Link
                  key={item.key}
                  to={item.path}
                  className={`flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:focus-visible:ring-indigo-500 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-[#1A1D24]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <Suspense fallback={<div className="text-center text-sm text-gray-500 py-8">Loading…</div>}>
            <Routes future={{ v7_relativeSplatPath: true }}>
              <Route path="/" element={<Navigate to="/timeline" replace />} />
              <Route
                path="/task/:taskId"
                element={
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
              onProjectDelete={(projectId) => {
                if (confirm('Delete this project? Tasks under it remain.')) {
                  deleteProject(projectId);
                }
              }}
              onProjectReorder={(sourceId, targetId) => {
                reorderProjects(sourceId, targetId);
              }}
              onTaskCreate={(taskData) => createTask(taskData)}
              onTaskClick={handleTaskOpen}
              updateTask={updateTask}
              removeTask={removeTask}
              phases={settings.phases}
              onPhaseReorder={handlePhaseReorder}
              onMeetingCreate={addMeeting}
              onMeetingUpdate={updateMeeting}
              onMeetingDelete={handleMeetingDelete}
              onLinkTaskToMeeting={linkTaskToMeeting}
              onUnlinkTaskFromMeeting={unlinkTaskFromMeeting}
              onAttachmentUpload={attachFile}
              onAttachmentDownload={downloadAttachment}
              onAttachmentDelete={deleteAttachment}
              onAttachmentLink={linkAttachment}
              onAttachmentUnlink={unlinkAttachment}
              attachmentDirStatus={attachmentDirStatus}
              attachmentDirName={attachmentDirName}
                  />
                }
              />
              <Route
                path="/timeline"
                element={
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
              onProjectDelete={(projectId) => {
                if (confirm('Delete this project? Tasks under it remain.')) {
                  deleteProject(projectId);
                }
              }}
              onProjectReorder={(sourceId, targetId) => {
                reorderProjects(sourceId, targetId);
              }}
              onTaskCreate={(taskData) => createTask(taskData)}
              onTaskClick={handleTaskOpen}
              updateTask={updateTask}
              removeTask={removeTask}
              phases={settings.phases}
              onPhaseReorder={handlePhaseReorder}
              onMeetingCreate={addMeeting}
              onMeetingUpdate={updateMeeting}
              onMeetingDelete={handleMeetingDelete}
              onLinkTaskToMeeting={linkTaskToMeeting}
              onUnlinkTaskFromMeeting={unlinkTaskFromMeeting}
              onAttachmentUpload={attachFile}
              onAttachmentDownload={downloadAttachment}
              onAttachmentDelete={deleteAttachment}
              onAttachmentLink={linkAttachment}
              onAttachmentUnlink={unlinkAttachment}
              attachmentDirStatus={attachmentDirStatus}
              attachmentDirName={attachmentDirName}
                  />
                }
              />
              <Route
                path="/agent"
                element={
                  <AgentPage
              projects={projects}
              tiles={tiles}
              meetings={meetings}
              selectedProjectId={selectedProjectId}
              createTask={createTask}
              settings={settings}
                  />
                }
              />
              <Route path="/deepl" element={<DeepLPage settings={settings} />} />
              <Route
                path="/settings"
                element={
                  <SettingsPage
              settings={settings}
              setSettings={setSettings}
                      onNavigateBack={() => navigate('/timeline')}
              attachmentDirStatus={attachmentDirStatus}
              attachmentDirName={attachmentDirName}
              onChooseAttachmentDirectory={selectAttachmentDirectory}
              onClearAttachmentDirectory={clearAttachmentDirectory}
              onRetryAttachmentPermission={ensureAttachmentDirectory}
                    />
                }
              />
            </Routes>
          </Suspense>
        </div>

        {/* Task editing is handled inline within TimelineView */}

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

        {/* Footer */}
        <footer className="text-center text-xs py-3 border-t border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400">
          © {new Date().getFullYear()} Khaled Senan. All rights reserved.
        </footer>
      </div>
    </div>
    );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
