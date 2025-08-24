import React, { useState, useEffect, useRef } from 'react';
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
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
  Copy,
  FileText
} from 'lucide-react';
import { List, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format,
  parseISO,
  getISOWeek,
  getISOWeekYear,
  eachWeekOfInterval,
  startOfWeek,
  endOfWeek,
  addWeeks,
  isBefore,
  isAfter,
  isSameWeek,
  isThisWeek
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
  ReferenceLine
} from 'recharts';

// PDF generation library
import { jsPDF } from 'jspdf';

// Rich text editor
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Utility to generate unique identifiers
const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

// Utility to compute ISO week key for date string (YYYY-MM-DD)
const getWeekKey = (date) => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const week = getISOWeek(d);
  const year = getISOWeekYear(d);
  return `${year}-W${week.toString().padStart(2, '0')}`;
};

// Get today's ISO week key
const todayWeekKey = getWeekKey(new Date());

// Determine if a week key represents a week in the past (including this week)
const isWeekInPast = (weekKey) => {
  const [yearStr, wStr] = weekKey.split('-W');
  const week = parseInt(wStr, 10);
  const year = parseInt(yearStr, 10);
  const current = todayWeekKey.split('-W');
  const currentYear = parseInt(current[0], 10);
  const currentWeek = parseInt(current[1], 10);
  if (year < currentYear) return true;
  if (year > currentYear) return false;
  return week <= currentWeek;
};

// Mini calendar component: renders a month view with calendar week numbers on left
function MiniCalendar({ month, year, onClose, onPrev, onNext }) {
  // Render a 6-week grid with calendar week numbers on the left
  const start = startOfWeek(new Date(year, month, 1), { weekStartsOn: 1 });
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    weeks.push(days.slice(w * 7, w * 7 + 7));
  }
  return (
    <div className="absolute z-50 p-4 bg-white rounded-xl shadow-lg border border-gray-200">
      {/* Header with navigation and close */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2">
          <button onClick={onPrev} className="p-1 rounded hover:bg-gray-100">
            <ChevronLeft size={16} />
          </button>
          <span className="font-semibold">{format(new Date(year, month, 1), 'MMMM yyyy')}</span>
          <button onClick={onNext} className="p-1 rounded hover:bg-gray-100">
            <ChevronRight size={16} />
          </button>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
          <X size={16} />
        </button>
      </div>
      <table className="text-sm select-none">
        <thead>
          <tr>
            <th className="text-left pr-2">CW</th>
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
              <th key={d} className="w-8 text-center">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi} className="h-6">
              <td className="pr-2 text-gray-500">{getISOWeek(week[0])}</td>
              {week.map((day, di) => (
                <td
                  key={di}
                  className={`w-8 text-center rounded ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'bg-blue-100 font-bold' : ''}`}
                >
                  {day.getDate()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  // Initial state: load from localStorage or fallback
  const [tiles, setTiles] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workChecklist');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.tiles)) return parsed.tiles;
        } catch (e) {
          console.error('Failed to parse checklist from storage', e);
        }
      }
    }
    // default: one empty tile
    return [
      {
        id: generateId('tile'),
        title: 'New Tile',
        tasks: [],
      },
    ];
  });

  // Meetings state
  const [meetings, setMeetings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workChecklist');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.meetings)) return parsed.meetings;
        } catch (e) {
          console.error('Failed to parse meetings from storage', e);
        }
      }
    }
    return [];
  });

  // Default settings for colors and branding
  const defaultSettings = {
    appName: 'Oral-B task manager',
    logo: null,
    colorPast: '#D3D3D3', // grey for past/done
    colorNonPrio: '#007BFF', // blue for non-prio
    colorPrio: '#8B0000', // dark red for prio
  };

  // Settings state with persistence
  const [settings, setSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workChecklist');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.settings) {
            return { ...defaultSettings, ...parsed.settings };
          }
        } catch (e) {
          console.error('Failed to parse settings from storage', e);
        }
      }
    }
    return defaultSettings;
  });

  // Persist to localStorage whenever tiles, meetings or settings change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const payload = { tiles, meetings, settings };
      localStorage.setItem('workChecklist', JSON.stringify(payload));
    }
  }, [tiles, meetings, settings]);

  // Global filter state
  // filter: 'all' | 'prio' | 'nonPrio'
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  // Owner filter state
  // ownerFilter: 'all' or name string
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  // Calendar visibility
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Page selection: 'tasks' or 'meetings'
  const [activePage, setActivePage] = useState('tasks');


  // Search query for filtering tasks and meetings
  const [searchQuery, setSearchQuery] = useState('');

  // Which meetings are expanded (showing notes) in the list view
  const [expandedMeetings, setExpandedMeetings] = useState({});

  // Selected task for modal editing
  const [selectedTaskInfo, setSelectedTaskInfo] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Selected meeting for modal display
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  // Compute sorted and filtered meetings once per render
  // Sort meetings by latest note date or update time and filter by search query
  const getLatestMeetingDate = (meeting) => {
    let latest = meeting.updatedAt || 0;
    if (Array.isArray(meeting.notes)) {
      meeting.notes.forEach((n) => {
        if (n.date) {
          const ts = new Date(n.date).getTime();
          if (!isNaN(ts) && ts > latest) latest = ts;
        }
      });
    }
    return latest;
  };
  const sortedFilteredMeetings = meetings
    .slice()
    .sort((a, b) => getLatestMeetingDate(b) - getLatestMeetingDate(a))
    .filter((m) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      if (m.title.toLowerCase().includes(q)) return true;
      return m.notes.some((n) =>
        (n.summary && n.summary.toLowerCase().includes(q)) ||
        (n.actions && n.actions.toLowerCase().includes(q)) ||
        (n.attendance && n.attendance.toLowerCase().includes(q))
      );
    });

  // File input ref for import
  const fileInputRef = useRef(null);

  // Add a new tile
  const addTile = () => {
    const newTile = {
      id: generateId('tile'),
      title: 'New Tile',
      tasks: [],
    };
    setTiles((prev) => [...prev, newTile]);
  };

  // Remove a tile
  const removeTile = (tileId) => {
    setTiles((prev) => prev.filter((t) => t.id !== tileId));
  };

  // Rename a tile
  const renameTile = (tileId, newTitle) => {
    setTiles((prev) =>
      prev.map((t) => (t.id === tileId ? { ...t, title: newTitle } : t))
    );
  };

  // Add a task to tile
  const addTask = (tileId, label) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const newTask = {
      id: generateId('task'),
      label: trimmed,
      done: false,
      prio: false,
      date: null, // ISO date string or null
      owner: ''
    };
    setTiles((prev) =>
      prev.map((t) =>
        t.id === tileId ? { ...t, tasks: [...t.tasks, newTask] } : t
      )
    );
  };

  // Remove a task
  const removeTask = (tileId, taskId) => {
    setTiles((prev) =>
      prev.map((t) =>
        t.id === tileId ? { ...t, tasks: t.tasks.filter((task) => task.id !== taskId) } : t
      )
    );
  };

  // Toggle done state
  const toggleDone = (tileId, taskId) => {
    setTiles((prev) =>
      prev.map((t) =>
        t.id === tileId
          ? {
              ...t,
              tasks: t.tasks.map((task) =>
                task.id === taskId ? { ...task, done: !task.done } : task
              ),
            }
          : t
      )
    );
  };

  // Toggle priority state
  const togglePrio = (tileId, taskId) => {
    setTiles((prev) =>
      prev.map((t) =>
        t.id === tileId
          ? {
              ...t,
              tasks: t.tasks.map((task) =>
                task.id === taskId ? { ...task, prio: !task.prio } : task
              ),
            }
          : t
      )
    );
  };

  // Update date
  const updateDate = (tileId, taskId, date) => {
    setTiles((prev) =>
      prev.map((t) =>
        t.id === tileId
          ? {
              ...t,
              tasks: t.tasks.map((task) =>
                task.id === taskId ? { ...task, date } : task
              ),
            }
          : t
      )
    );
  };

  // Reorder tasks within a tile
  const reorderTasks = (tileId, fromIndex, toIndex) => {
    setTiles((prev) =>
      prev.map((tile) => {
        if (tile.id !== tileId) return tile;
        const tasksCopy = [...tile.tasks];
        const [moved] = tasksCopy.splice(fromIndex, 1);
        tasksCopy.splice(toIndex, 0, moved);
        return { ...tile, tasks: tasksCopy };
      })
    );
  };

  // Update task fields by id
  const updateTask = (tileId, taskId, updatedFields) => {
    setTiles((prev) =>
      prev.map((tile) => {
        if (tile.id !== tileId) return tile;
        return {
          ...tile,
          tasks: tile.tasks.map((task) =>
            task.id === taskId ? { ...task, ...updatedFields } : task
          ),
        };
      })
    );
  };

  // Generate PDF summary of this week's to-dos
  const handleGeneratePDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(`${settings.appName} - Weekly To‑Do Summary`, 10, 10);
      let y = 20;
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayTasks = [];
        tiles.forEach((tile) => {
          tile.tasks.forEach((task) => {
            if (task.date && task.date === dateStr && !task.done) {
              dayTasks.push({ tile: tile.title, ...task });
            }
          });
        });
        if (dayTasks.length > 0) {
          if (y > 260) {
            doc.addPage();
            y = 20;
          }
          doc.setFontSize(12);
          doc.text(format(day, 'EEEE, MMM d'), 10, y);
          y += 6;
          dayTasks.forEach((t) => {
            if (y > 280) {
              doc.addPage();
              y = 20;
            }
            doc.setFontSize(10);
            let line = `- [${t.tile}] ${t.label}`;
            if (t.owner) line += ` (Owner: ${t.owner})`;
            if (t.prio) line += ' [Prio]';
            doc.text(line, 12, y);
            y += 5;
          });
          y += 4;
        }
      }
      doc.save('weekly-summary.pdf');
    } catch (err) {
      console.error('Failed to generate PDF', err);
    }
  };

  // Export data to JSON (including tiles, meetings and settings)
  const handleExport = () => {
    const data = { tiles, meetings, settings };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    saveAs(blob, 'work-checklist.json');
  };

  // Import from JSON (legacy CSV still supported)
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      // Try JSON first
      try {
        const data = JSON.parse(text);
        if (data && data.tiles && data.meetings && data.settings) {
          // Ensure owner field on tasks
          const importedTiles = data.tiles.map((tile) => ({
            ...tile,
            tasks: (tile.tasks || []).map((t) => ({ owner: t.owner || '', ...t })),
          }));
          setTiles(importedTiles);
          setMeetings(data.meetings);
          setSettings({ ...defaultSettings, ...data.settings });
          return;
        }
      } catch (jsonErr) {
        // Not JSON, fallback to CSV parsing
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dataRows = results.data;
            const newTiles = {};
            const newMeetings = {};
            dataRows.forEach((row) => {
              const hasMeeting = row.meeting_id || row.entity === 'meeting';
              if (hasMeeting) {
                const meetingId = row.meeting_id || generateId('meeting');
                const meetingTitle = row.meeting_title || 'Untitled Meeting';
                if (!newMeetings[meetingId]) {
                  newMeetings[meetingId] = { id: meetingId, title: meetingTitle, notes: [] };
                }
                if (row.note_id) {
                  newMeetings[meetingId].notes.push({
                    id: row.note_id,
                    date: row.note_date || null,
                    attendance: row.attendance || '',
                    summary: row.summary || '',
                    actions: row.actions || '',
                  });
                }
              } else {
                const tileId = row.tile_id || generateId('tile');
                const tileTitle = row.tile_title || 'Untitled';
                if (!newTiles[tileId]) {
                  newTiles[tileId] = { id: tileId, title: tileTitle, tasks: [] };
                }
                if (row.task_id) {
                  newTiles[tileId].tasks.push({
                    id: row.task_id,
                    label: row.label,
                    done: row.done === 'true',
                    prio: row.prio === 'true',
                    date: row.date || null,
                    owner: row.owner || '',
                  });
                }
              }
            });
            setTiles(Object.values(newTiles));
            setMeetings(Object.values(newMeetings));
          },
        });
      }
    };
    reader.readAsText(file);
  };

  // Handler to trigger file input click
  const triggerImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Compute chart data for a tile
  const buildChartData = (tasks) => {
    // Filter tasks with a date
    const datedTasks = tasks.filter((task) => task.date);
    if (datedTasks.length === 0) return [];
    // Determine min and max weeks across tasks
    let minDate = null;
    let maxDate = null;
    datedTasks.forEach((task) => {
      const d = parseISO(task.date);
      if (!minDate || isBefore(d, minDate)) minDate = d;
      if (!maxDate || isAfter(d, maxDate)) maxDate = d;
    });
    // Include current date to ensure current week appears
    const today = new Date();
    if (!minDate || isBefore(today, minDate)) minDate = today;
    if (!maxDate || isAfter(today, maxDate)) maxDate = today;
    // Determine first Monday of minDate's week and last Sunday of maxDate's week
    const start = startOfWeek(minDate, { weekStartsOn: 1 });
    const end = endOfWeek(maxDate, { weekStartsOn: 1 });
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    const data = weeks.map((weekStart) => {
      const key = getWeekKey(weekStart);
      return { key, past: 0, nonPrio: 0, prio: 0 };
    });
    // Fill counts
    datedTasks.forEach((task) => {
      const key = getWeekKey(task.date);
      const entry = data.find((d) => d.key === key);
      if (entry) {
        if (isWeekInPast(key)) {
          entry.past += 1;
        } else {
          if (task.prio) entry.prio += 1;
          else entry.nonPrio += 1;
        }
      }
    });
    return data;
  };

  // Renders the chart for a tile
  const TileChart = ({ tasks, settings }) => {
    const data = buildChartData(tasks);
    if (data.length === 0) {
      return (
        <div className="text-sm text-gray-400 mt-2">No dated tasks</div>
      );
    }
    return (
      <div className="w-full h-40 mt-2">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="key"
              tickFormatter={(k) => k.split('-W')[1]}
              fontSize={10}
            />
            <YAxis allowDecimals={false} hide />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="p-2 bg-white rounded shadow text-xs">
                      <div className="font-semibold mb-1">Week {label.split('-W')[1]}</div>
                      {payload.map((p) => (
                        <div key={p.dataKey} className="flex items-center space-x-1">
                          <span
                            className="inline-block w-3 h-3 rounded"
                            style={{ backgroundColor: p.color }}
                          ></span>
                          <span>{p.name}: {p.value}</span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              height={24}
              formatter={(value) => {
                if (value === 'past') return 'Past/Done';
                if (value === 'nonPrio') return 'Future Non-Prio';
                if (value === 'prio') return 'Future Prio';
                return value;
              }}
            />
            {/* Draw grey dotted line for current week */}
            {data.some((d) => d.key === todayWeekKey) && (
              <ReferenceLine
                x={todayWeekKey}
                stroke="#A0AEC0"
                strokeDasharray="4 3"
              />
            )}
            <Bar dataKey="past" stackId="a" fill={settings.colorPast} name="Past/Done" />
            <Bar dataKey="nonPrio" stackId="a" fill={settings.colorNonPrio} name="Future Non-Prio" />
            <Bar dataKey="prio" stackId="a" fill={settings.colorPrio} name="Future Prio" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Meeting modal component for viewing and editing meeting details and notes
  const MeetingModal = ({ meeting, onClose }) => {
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [noteForm, setNoteForm] = useState({ date: '', attendance: '', summary: '', actions: '' });
    // When meeting or editingNote changes, prefill form
    useEffect(() => {
      if (!meeting) return;
      if (editingNoteId) {
        const note = meeting.notes.find((n) => n.id === editingNoteId);
        if (note) {
          setNoteForm({
            date: note.date || '',
            attendance: note.attendance || '',
            summary: note.summary || '',
            actions: note.actions || '',
          });
        }
      } else {
        setNoteForm({ date: '', attendance: '', summary: '', actions: '' });
      }
    }, [meeting, editingNoteId]);

    if (!meeting) return null;

    const copyNote = (note) => {
      // Strip HTML tags and insert blank lines between fields for readability
      const plainSummary = note.summary ? note.summary.replace(/<[^>]+>/g, '') : '';
      const plainActions = note.actions ? note.actions.replace(/<[^>]+>/g, '') : '';
      const text = `${meeting.title}\n\nDate: ${note.date || ''}\n\nAttendance: ${note.attendance || ''}\n\nSummary: ${plainSummary}\n\nActions: ${plainActions}`;
      navigator.clipboard.writeText(text);
    };

    const handleSave = () => {
      if (editingNoteId) {
        // update existing note
        updateNote(meeting.id, editingNoteId, {
          date: noteForm.date || null,
          attendance: noteForm.attendance || '',
          summary: noteForm.summary || '',
          actions: noteForm.actions || '',
        });
      } else {
        // add new note
        if (noteForm.date || noteForm.attendance || noteForm.summary || noteForm.actions) {
          const newNote = {
            id: generateId('note'),
            date: noteForm.date || null,
            attendance: noteForm.attendance || '',
            summary: noteForm.summary || '',
            actions: noteForm.actions || '',
          };
          addNote(meeting.id, newNote);
        }
      }
      // Reset
      setEditingNoteId(null);
      setNoteForm({ date: '', attendance: '', summary: '', actions: '' });
    };

    const handleClose = () => {
      setEditingNoteId(null);
      setNoteForm({ date: '', attendance: '', summary: '', actions: '' });
      onClose();
    };

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-40 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Modal header */}
          <div className="flex items-center justify-between p-4 border-b">
            <input
              type="text"
              value={meeting.title}
              onChange={(e) => renameMeeting(meeting.id, e.target.value)}
              className="font-semibold text-lg flex-1 bg-transparent focus:outline-none"
            />
            <button onClick={handleClose} className="p-1 rounded hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Modal content */}
          <div className="p-4 space-y-4 text-sm">
            {/* Notes list */}
            {meeting.notes.length === 0 && <div className="text-gray-500">No notes yet.</div>}
            {meeting.notes.map((note) => (
              <div key={note.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <div className="font-semibold">{note.date || 'No date'}</div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => copyNote(note)}
                      className="p-0.5 text-gray-500 hover:bg-gray-50 rounded"
                      title="Copy Note"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingNoteId(note.id);
                      }}
                      className="p-0.5 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit Note"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeNote(meeting.id, note.id)}
                      className="p-0.5 text-red-500 hover:bg-red-50 rounded"
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {note.attendance && <div className="mt-1"><strong>Attendance:</strong> {note.attendance}</div>}
                {note.summary && <div className="mt-1"><strong>Summary:</strong> <div dangerouslySetInnerHTML={{ __html: note.summary }} /></div>}
                {note.actions && <div className="mt-1"><strong>Actions:</strong> <div dangerouslySetInnerHTML={{ __html: note.actions }} /></div>}
              </div>
            ))}
            {/* Edit/Add Note form */}
            <div className="border-t pt-4">
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="date"
                  value={noteForm.date}
                  onChange={(e) => setNoteForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="border border-gray-300 rounded px-1 py-0.5 flex-1"
                />
                <input
                  type="text"
                  placeholder="Attendance"
                  value={noteForm.attendance}
                  onChange={(e) => setNoteForm((prev) => ({ ...prev, attendance: e.target.value }))}
                  className="border border-gray-300 rounded px-1 py-0.5 flex-1"
                />
              </div>
              <div className="mb-2">
                <div className="font-semibold mb-1">Summary</div>
                <ReactQuill
                  theme="snow"
                  value={noteForm.summary}
                  onChange={(val) => setNoteForm((prev) => ({ ...prev, summary: val }))}
                  modules={{ toolbar: [
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ list: 'bullet' }, { list: 'ordered' }],
                    [{ size: [] }],
                    ['link']
                  ] }}
                />
              </div>
              <div className="mb-2">
                <div className="font-semibold mb-1">Actions</div>
                <ReactQuill
                  theme="snow"
                  value={noteForm.actions}
                  onChange={(val) => setNoteForm((prev) => ({ ...prev, actions: val }))}
                  modules={{ toolbar: [
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ list: 'bullet' }, { list: 'ordered' }],
                    [{ size: [] }],
                    ['link']
                  ] }}
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  className="flex-1 p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingNoteId ? 'Save Note' : 'Add Note'}
                </button>
                {editingNoteId && (
                  <button
                    onClick={() => {
                      setEditingNoteId(null);
                      setNoteForm({ date: '', attendance: '', summary: '', actions: '' });
                    }}
                    className="flex-1 p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Task modal for editing task details (owner, label, date, priority)
  const TaskModal = ({ tileId, taskId, onClose }) => {
    const tile = tiles.find((t) => t.id === tileId);
    if (!tile) return null;
    const task = tile.tasks.find((t) => t.id === taskId);
    if (!task) return null;
    const [taskForm, setTaskForm] = useState({
      label: task.label,
      owner: task.owner || '',
      date: task.date || '',
      prio: task.prio || false,
      done: task.done || false,
    });

    const handleSave = () => {
      updateTask(tileId, taskId, {
        label: taskForm.label,
        owner: taskForm.owner,
        date: taskForm.date || null,
        prio: taskForm.prio,
        done: taskForm.done,
      });
      onClose();
    };

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-40 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4 space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="font-semibold text-lg">Edit Task</h2>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Label</label>
              <input
                type="text"
                value={taskForm.label}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, label: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Owner</label>
              <input
                type="text"
                value={taskForm.owner}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, owner: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Date</label>
              <input
                type="date"
                value={taskForm.date || ''}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1"
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={taskForm.prio}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, prio: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm">High Priority</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={taskForm.done}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, done: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm">Done</span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2 pt-2 border-t">
            <button
              onClick={handleSave}
              className="flex-1 p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={onClose}
              className="flex-1 p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Settings page component for updating app name, logo and colors
  const SettingsPage = () => {
    const fileInputRefLogo = useRef(null);
    const handleLogoChange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        setSettings((prev) => ({ ...prev, logo: dataUrl }));
      };
      reader.readAsDataURL(file);
    };
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-6 space-y-6">
        <h2 className="text-xl font-semibold">Settings</h2>
        <div className="space-y-4">
          {/* App name */}
          <div>
            <label className="block text-sm font-medium mb-1">Application Name</label>
            <input
              type="text"
              value={settings.appName}
              onChange={(e) => setSettings((prev) => ({ ...prev, appName: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-1.5"
            />
          </div>
          {/* Logo upload */}
          <div>
            <label className="block text-sm font-medium mb-1">Logo</label>
            <div className="flex items-center space-x-4">
              {settings.logo && (
                <img src={settings.logo} alt="Logo preview" className="w-16 h-16 object-contain border rounded" />
              )}
              <button
                onClick={() => fileInputRefLogo.current && fileInputRefLogo.current.click()}
                className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 text-sm"
              >
                Change Logo
              </button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRefLogo}
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>
          </div>
          {/* Color pickers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Past/Done Color</label>
              <input
                type="color"
                value={settings.colorPast}
                onChange={(e) => setSettings((prev) => ({ ...prev, colorPast: e.target.value }))}
                className="w-full h-10 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Non‑Prio Color</label>
              <input
                type="color"
                value={settings.colorNonPrio}
                onChange={(e) => setSettings((prev) => ({ ...prev, colorNonPrio: e.target.value }))}
                className="w-full h-10 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Prio Color</label>
              <input
                type="color"
                value={settings.colorPrio}
                onChange={(e) => setSettings((prev) => ({ ...prev, colorPrio: e.target.value }))}
                className="w-full h-10 border border-gray-300 rounded"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Meeting helpers
  const addMeeting = (title) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const now = Date.now();
    const newMeeting = {
      id: generateId('meeting'),
      title: trimmed,
      notes: [],
      updatedAt: now,
    };
    setMeetings((prev) => [...prev, newMeeting]);
  };

  const renameMeeting = (meetingId, newTitle) => {
    const now = Date.now();
    setMeetings((prev) =>
      prev.map((m) =>
        m.id === meetingId ? { ...m, title: newTitle, updatedAt: now } : m
      )
    );
  };

  const removeMeeting = (meetingId) => {
    setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
  };

  const addNote = (meetingId, note) => {
    const now = Date.now();
    setMeetings((prev) =>
      prev.map((m) =>
        m.id === meetingId
          ? { ...m, notes: [...m.notes, note], updatedAt: now }
          : m
      )
    );
  };

  const removeNote = (meetingId, noteId) => {
    const now = Date.now();
    setMeetings((prev) =>
      prev.map((m) =>
        m.id === meetingId
          ? { ...m, notes: m.notes.filter((n) => n.id !== noteId), updatedAt: now }
          : m
      )
    );
  };

  const updateNote = (meetingId, noteId, updatedFields) => {
    const now = Date.now();
    setMeetings((prev) =>
      prev.map((m) => {
        if (m.id !== meetingId) return m;
        return {
          ...m,
          notes: m.notes.map((n) => (n.id === noteId ? { ...n, ...updatedFields } : n)),
          updatedAt: now,
        };
      })
    );
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="rounded-2xl mb-6 p-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white flex flex-wrap items-center justify-between space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <img src={settings.logo || 'https://upload.wikimedia.org/wikipedia/commons/6/61/Oral-B_Logo_2024.svg'} alt="Logo" className="w-24 h-24 object-contain" />
          <h1 className="text-3xl font-extrabold">{settings.appName}</h1>
          {/* Page selector */}
          <div className="flex ml-6 bg-white/20 rounded-lg overflow-hidden text-sm">
            <button
              onClick={() => setActivePage('tasks')}
              className={`px-4 py-2 ${activePage === 'tasks' ? 'bg-white text-blue-600 font-semibold' : 'text-white hover:bg-white/10'}`}
            >
              Tasks
            </button>
            <button
              onClick={() => setActivePage('meetings')}
              className={`px-4 py-2 ${activePage === 'meetings' ? 'bg-white text-blue-600 font-semibold' : 'text-white hover:bg-white/10'}`}
            >
              Meetings
            </button>
            <button
              onClick={() => setActivePage('settings')}
              className={`px-4 py-2 ${activePage === 'settings' ? 'bg-white text-blue-600 font-semibold' : 'text-white hover:bg-white/10'}`}
            >
              Settings
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Search input (only on tasks page) */}
          {activePage === 'tasks' && (
            <input
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg bg-white/20 border border-transparent placeholder-white text-white focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          )}

          {/* Priority Filter */}
          <div className="relative">
            <button
              onClick={() => setFilterMenuOpen((open) => !open)}
              className="flex items-center px-3 py-2 text-sm rounded-lg bg-white/20 border border-transparent hover:bg-white/30"
            >
              <Flag className={`w-4 h-4 mr-1 ${priorityFilter === 'prio' ? 'text-prio' : priorityFilter === 'nonPrio' ? 'text-nonPrio' : 'text-white'}`} />
              {priorityFilter === 'all' ? 'All Tasks' : priorityFilter === 'prio' ? 'Prio' : 'Non-Prio'}
              <ChevronDown className="w-4 h-4 ml-1 text-white" />
            </button>
            {filterMenuOpen && (
              <div className="absolute right-0 mt-1 w-32 bg-white rounded shadow border border-gray-200 z-10">
                <button
                  onClick={() => {
                    setPriorityFilter('all');
                    setFilterMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1 text-sm hover:bg-gray-100 flex items-center space-x-2"
                >
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400"></span>
                  <span>All</span>
                </button>
                <button
                  onClick={() => {
                    setPriorityFilter('prio');
                    setFilterMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1 text-sm hover:bg-gray-100 flex items-center space-x-2"
                >
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: settings.colorPrio }}></span>
                  <span>Prio</span>
                </button>
                <button
                  onClick={() => {
                    setPriorityFilter('nonPrio');
                    setFilterMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1 text-sm hover:bg-gray-100 flex items-center space-x-2"
                >
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: settings.colorNonPrio }}></span>
                  <span>Non-Prio</span>
                </button>
              </div>
            )}
          </div>

          {/* Owner Filter */}
          <div className="relative">
            <button
              onClick={() => setOwnerMenuOpen((open) => !open)}
              className="flex items-center px-3 py-1.5 bg-gray-100 text-sm rounded-lg border border-gray-300 hover:bg-gray-200"
            >
              <span className="mr-1">
                {ownerFilter === 'all' ? 'All Owners' : ownerFilter || 'Unassigned'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            {ownerMenuOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-white rounded shadow border border-gray-200 z-10 max-h-48 overflow-y-auto text-sm">
                <button
                  onClick={() => {
                    setOwnerFilter('all');
                    setOwnerMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-gray-100"
                >
                  All Owners
                </button>
                <button
                  onClick={() => {
                    setOwnerFilter('');
                    setOwnerMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-gray-100"
                >
                  Unassigned
                </button>
                {Array.from(new Set(tiles.flatMap((t) => t.tasks.map((task) => task.owner || '').filter((o) => o)))).map((owner) => (
                  <button
                    key={owner}
                    onClick={() => {
                      setOwnerFilter(owner);
                      setOwnerMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1 hover:bg-gray-100"
                  >
                    {owner}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hide completed toggle */}
          <button
            onClick={() => setHideCompleted((prev) => !prev)}
            className="flex items-center px-3 py-1.5 bg-gray-100 text-sm rounded-lg border border-gray-300 hover:bg-gray-200"
          >
            {hideCompleted ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            {hideCompleted ? 'Show Done' : 'Hide Done'}
          </button>

          {/* Export/Import */}
          <button
            onClick={handleExport}
            className="flex items-center px-3 py-1.5 bg-gray-100 text-sm rounded-lg border border-gray-300 hover:bg-gray-200"
          >
            <Download className="w-4 h-4 mr-1" /> Export
          </button>
          <button
            onClick={triggerImport}
            className="flex items-center px-3 py-1.5 bg-gray-100 text-sm rounded-lg border border-gray-300 hover:bg-gray-200"
          >
            <Upload className="w-4 h-4 mr-1" /> Import
          </button>
          <button
            onClick={handleGeneratePDF}
            className="flex items-center px-3 py-1.5 bg-gray-100 text-sm rounded-lg border border-gray-300 hover:bg-gray-200"
          >
            <FileText className="w-4 h-4 mr-1" /> PDF
          </button>
          <input
            type="file"
            accept=".csv,.json"
            ref={fileInputRef}
            className="hidden"
            onChange={handleImport}
          />

          {/* Calendar dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCalendar((prev) => !prev)}
              className="flex items-center px-3 py-1.5 bg-gray-100 text-sm rounded-lg border border-gray-300 hover:bg-gray-200"
            >
              <CalendarIcon className="w-4 h-4 mr-1" /> Calendar
            </button>
            {showCalendar && (
              <MiniCalendar
                month={calendarMonth}
                year={calendarYear}
                onClose={() => setShowCalendar(false)}
                onPrev={() => {
                  const prevDate = new Date(calendarYear, calendarMonth - 1, 1);
                  setCalendarYear(prevDate.getFullYear());
                  setCalendarMonth(prevDate.getMonth());
                }}
                onNext={() => {
                  const nextDate = new Date(calendarYear, calendarMonth + 1, 1);
                  setCalendarYear(nextDate.getFullYear());
                  setCalendarMonth(nextDate.getMonth());
                }}
              />
            )}
          </div>
        </div>
      </div>

      {activePage === 'tasks' && (
        <>
          {/* Tiles grid */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {tiles.map((tile) => {
              // compute visible tasks after filter and hide
              const visibleTasks = tile.tasks.filter((task) => {
                if (hideCompleted && task.done) return false;
                if (priorityFilter === 'prio' && !task.prio) return false;
                if (priorityFilter === 'nonPrio' && task.prio) return false;
                if (ownerFilter !== 'all' && (task.owner || '') !== ownerFilter) return false;
                if (searchQuery) {
                  const q = searchQuery.toLowerCase();
                  const inLabel = task.label.toLowerCase().includes(q);
                  const inOwner = (task.owner || '').toLowerCase().includes(q);
                  if (!inLabel && !inOwner) return false;
                }
                return true;
              });
              return (
                <div key={tile.id} className="bg-white rounded-2xl shadow p-4 flex flex-col">
                  {/* Tile header with title and delete button */}
                  <div className="flex items-start justify-between mb-2">
                    <input
                      type="text"
                      value={tile.title}
                      onChange={(e) => renameTile(tile.id, e.target.value)}
                      className="font-semibold text-lg flex-1 bg-transparent focus:outline-none border-b border-gray-200 pb-1"
                    />
                    <button
                      onClick={() => removeTile(tile.id)}
                      className="p-1 rounded hover:bg-red-50 text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Tasks list */}
                  <div className="flex-1 overflow-y-auto space-y-2">
                    <AnimatePresence initial={false}>
                      {visibleTasks.map((task, idx) => (
                          <motion.div
                          key={task.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.15 }}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', idx.toString());
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
                            const to = idx;
                            if (from !== to) {
                              reorderTasks(tile.id, from, to);
                            }
                          }}
                            onDoubleClick={() => {
                              setSelectedTaskInfo({ tileId: tile.id, taskId: task.id });
                              setShowTaskModal(true);
                            }}
                          className="border rounded-lg p-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 cursor-move"
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <input
                              type="checkbox"
                              checked={task.done}
                              onChange={() => toggleDone(tile.id, task.id)}
                              className="accent-blue-600 w-4 h-4"
                            />
                            <span className={`flex-1 text-sm ${task.done ? 'line-through text-gray-400' : ''}`}>{task.label}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* Priority toggle */}
                            <button
                              onClick={() => togglePrio(tile.id, task.id)}
                              className={"w-7 h-7 rounded-full flex items-center justify-center border text-white"}
                              style={{ backgroundColor: task.prio ? settings.colorPrio : settings.colorNonPrio }}
                              title={task.prio ? 'High Priority' : 'Non Priority'}
                            >
                              <Flag className="w-3 h-3" />
                            </button>
                            {/* Date picker */}
                            <input
                              type="date"
                              value={task.date || ''}
                              onChange={(e) => updateDate(tile.id, task.id, e.target.value)}
                              className="text-xs border border-gray-300 rounded px-1 py-0.5"
                            />
                            {/* Delete task */}
                            <button
                              onClick={() => removeTask(tile.id, task.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  {/* Chart */}
                  <TileChart tasks={tile.tasks} settings={settings} />
                  {/* Add new task input */}
                  <div className="flex items-center mt-3">
                    <input
                      type="text"
                      placeholder="Add a task…"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addTask(tile.id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <button
                      onClick={(e) => {
                        const input = e.currentTarget.previousSibling;
                        if (input && input.value) {
                          addTask(tile.id, input.value);
                          input.value = '';
                        }
                      }}
                      className="ml-2 p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {/* Add tile card */}
            <button
              onClick={addTile}
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl p-6 text-gray-500 hover:bg-gray-50"
            >
              <Plus className="w-6 h-6" />
              <span className="mt-2 text-sm">Add Tile</span>
            </button>
          </div>
        </>
      )}

      {activePage === 'meetings' && (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-4">
          {sortedFilteredMeetings.map((meeting) => (
            <div key={meeting.id} className="bg-white rounded-2xl shadow p-4 flex flex-col">
              {/* Meeting header with title, delete and expand/hide */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 flex-1">
                  <input
                    type="text"
                    value={meeting.title}
                    onChange={(e) => renameMeeting(meeting.id, e.target.value)}
                    className="font-semibold text-lg flex-1 bg-transparent focus:outline-none border-b border-gray-200 pb-1"
                  />
                  {/* Show last updated date */}
                  {meeting.updatedAt && (
                    <span className="text-xs text-gray-400">{format(new Date(meeting.updatedAt), 'MMM d')}</span>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  {/* Toggle show/hide notes */}
                  <button
                    onClick={() => setExpandedMeetings((prev) => ({ ...prev, [meeting.id]: !prev[meeting.id] }))}
                    className="p-1 rounded hover:bg-gray-100 text-gray-500"
                    title={expandedMeetings[meeting.id] ? 'Hide Notes' : 'Show Notes'}
                  >
                    {expandedMeetings[meeting.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {/* Open modal for full details */}
                  <button
                    onClick={() => {
                      setSelectedMeetingId(meeting.id);
                      setShowMeetingModal(true);
                    }}
                    className="p-1 rounded hover:bg-gray-100 text-blue-600"
                    title="Open Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeMeeting(meeting.id)}
                    className="p-1 rounded hover:bg-red-50 text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* Notes list (collapsed by default) */}
              {expandedMeetings[meeting.id] && (
                <>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {/* Group notes by month using the note's own date */}
                    {(() => {
                      const groups = {};
                      (meeting.notes || []).forEach((n) => {
                        if (n.date) {
                          const d = parseISO(n.date);
                          const key = format(d, 'MMM yyyy');
                          const numeric = d.getFullYear() * 12 + d.getMonth();
                          if (!groups[key]) groups[key] = { notes: [], numeric };
                          groups[key].notes.push(n);
                        } else {
                          const key = 'No Date';
                          if (!groups[key]) groups[key] = { notes: [], numeric: -Infinity };
                          groups[key].notes.push(n);
                        }
                      });
                      return Object.keys(groups)
                        .sort((a, b) => groups[b].numeric - groups[a].numeric)
                        .map((monthKey) => (
                          <div key={monthKey} className="space-y-1">
                            <div className="text-xs font-semibold text-gray-500 mt-2">{monthKey}</div>
                            {groups[monthKey].notes.map((note) => (
                              <div key={note.id} className="border border-gray-200 rounded-lg p-2 text-xs">
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold text-sm">{note.date || 'No date'}</span>
                                  <div className="flex items-center space-x-1">
                                    {/* Copy note */}
                                    <button
                                      onClick={() => {
                                        const plainSummary = note.summary ? note.summary.replace(/<[^>]+>/g, '') : '';
                                        const plainActions = note.actions ? note.actions.replace(/<[^>]+>/g, '') : '';
                                        const text = `${meeting.title}\n\nDate: ${note.date || ''}\n\nAttendance: ${note.attendance || ''}\n\nSummary: ${plainSummary}\n\nActions: ${plainActions}`;
                                        navigator.clipboard.writeText(text);
                                      }}
                                      className="p-0.5 text-gray-500 hover:bg-gray-50 rounded"
                                      title="Copy Note"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                    {/* Edit note - open modal */}
                                    <button
                                      onClick={() => {
                                        setSelectedMeetingId(meeting.id);
                                        setShowMeetingModal(true);
                                      }}
                                      className="p-0.5 text-blue-600 hover:bg-blue-50 rounded"
                                      title="View/Edit Note"
                                    >
                                      <Eye className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => removeNote(meeting.id, note.id)}
                                      className="p-0.5 text-red-500 hover:bg-red-50 rounded"
                                      title="Delete Note"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                {note.attendance && <div className="mt-1">Att: {note.attendance}</div>}
                                {note.summary && (
                                  <div className="mt-1 line-clamp-2">Summary: <span dangerouslySetInnerHTML={{ __html: note.summary }} /></div>
                                )}
                                {note.actions && (
                                  <div className="mt-1 line-clamp-2">Actions: <span dangerouslySetInnerHTML={{ __html: note.actions }} /></div>
                                )}
                              </div>
                            ))}
                          </div>
                        ));
                    })()}
                  </div>
                  {/* Add note form hidden here; use modal instead to add */}
                </>
              )}
              {/* Capture notes button always visible */}
              <div className="mt-2">
                <button
                  onClick={() => {
                    setSelectedMeetingId(meeting.id);
                    setShowMeetingModal(true);
                  }}
                  className="text-blue-600 hover:underline text-sm"
                >
                  + Capture Notes
                </button>
              </div>
            </div>
          ))}
          {/* Add meeting card */}
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl p-6 text-gray-500 hover:bg-gray-50">
            <input
              type="text"
              placeholder="Add meeting…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addMeeting(e.target.value);
                  e.target.value = '';
                }
              }}
              className="flex-1 w-full border border-gray-300 rounded px-2 py-1 text-sm mb-2"
            />
            <button
              onClick={(e) => {
                const input = e.currentTarget.previousSibling;
                if (input && input.value) {
                  addMeeting(input.value);
                  input.value = '';
                }
              }}
              className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Meeting
            </button>
          </div>
        </div>
      )}

      {activePage === 'settings' && (
        <SettingsPage />
      )}

      {/* Meeting modal overlay */}
      {showMeetingModal && selectedMeetingId && (
        <MeetingModal
          meeting={meetings.find((m) => m.id === selectedMeetingId)}
          onClose={() => setShowMeetingModal(false)}
        />
      )}

      {/* Task modal overlay */}
      {showTaskModal && selectedTaskInfo && (
        <TaskModal
          tileId={selectedTaskInfo.tileId}
          taskId={selectedTaskInfo.taskId}
          onClose={() => setShowTaskModal(false)}
        />
      )}

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Khaled Senan. All rights reserved.
      </div>
    </div>
  );
}