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
  X,
  Pencil,
  Copy,
  FileText,
  List,
  Settings
  ,Bot
  ,Maximize2
  ,Users
  ,Briefcase
  ,CalendarCheck
  ,ClipboardList
  ,Code
  ,Share
  ,Headphones
  ,Tag
  ,LifeBuoy
  ,PieChart
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

// Generate unique IDs for tiles, tasks, meetings and notes
const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

// Compute ISO week key for a given date (YYYY-Www)
const getWeekKey = (date) => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const week = getISOWeek(d);
  const year = getISOWeekYear(d);
  return `${year}-W${week.toString().padStart(2, '0')}`;
};

// Current week key for today
const todayWeekKey = getWeekKey(new Date());

// Determine if a given week key is in the past (including current week)
const isWeekInPast = (weekKey) => {
  const [yearStr, weekStr] = weekKey.split('-W');
  const week = parseInt(weekStr, 10);
  const year = parseInt(yearStr, 10);
  const [curYearStr, curWeekStr] = todayWeekKey.split('-W');
  const curWeek = parseInt(curWeekStr, 10);
  const curYear = parseInt(curYearStr, 10);
  if (year < curYear) return true;
  if (year > curYear) return false;
  return week <= curWeek;
};

// MiniCalendar renders a small month view with calendar week labels
function MiniCalendar({ month, year, onClose, onPrev, onNext }) {
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
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2">
          <button onClick={onPrev} className="p-1 rounded hover:bg-gray-100">
            <ChevronDown className="transform rotate-90" size={16} />
          </button>
          <span className="font-semibold">{format(new Date(year, month, 1), 'MMMM yyyy')}</span>
          <button onClick={onNext} className="p-1 rounded hover:bg-gray-100">
            <ChevronDown className="transform -rotate-90" size={16} />
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
                  className={`w-8 text-center rounded ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'bg-purple-100 text-purple-700 font-semibold' : ''}`}
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

// Build chart data for a tile's tasks
function buildChartData(tasks) {
  const datedTasks = tasks.filter((task) => task.date);
  if (datedTasks.length === 0) return [];
  // Determine min and max dates among tasks and include today to ensure current week is shown
  let minDate = null;
  let maxDate = null;
  datedTasks.forEach((task) => {
    const d = parseISO(task.date);
    if (!minDate || isBefore(d, minDate)) minDate = d;
    if (!maxDate || isAfter(d, maxDate)) maxDate = d;
  });
  const today = new Date();
  if (!minDate || isBefore(today, minDate)) minDate = today;
  if (!maxDate || isAfter(today, maxDate)) maxDate = today;
  const start = startOfWeek(minDate, { weekStartsOn: 1 });
  const end = endOfWeek(maxDate, { weekStartsOn: 1 });
  const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
  // Initialise data array with categories
  const data = weeks.map((weekStart) => {
    const key = getWeekKey(weekStart);
    return { key, done: 0, nonPrio: 0, prio: 0, overdue: 0 };
  });
  datedTasks.forEach((task) => {
    const key = getWeekKey(task.date);
    const entry = data.find((d) => d.key === key);
    if (entry) {
      const taskDate = parseISO(task.date);
      const isPast = isBefore(taskDate, new Date());
      if (task.done) {
        entry.done += 1;
      } else if (isPast) {
        // Overdue tasks: not done and date is before today
        entry.overdue += 1;
      } else {
        if (task.prio) entry.prio += 1;
        else entry.nonPrio += 1;
      }
    }
  });
  return data;
}

// Tile chart component (stacked bar chart)
const TileChart = ({ tasks, settings }) => {
  const data = buildChartData(tasks);
  if (data.length === 0) {
    return <div className="text-sm text-gray-400 mt-2">No dated tasks</div>;
  }
  return (
    <div className="w-full h-40 mt-2">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="key" tickFormatter={(k) => k.split('-W')[1]} fontSize={10} />
          <YAxis allowDecimals={false} hide />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="p-2 bg-white rounded shadow text-xs">
                    <div className="font-semibold mb-1">Week {label.split('-W')[1]}</div>
                    {payload.map((p) => (
                      <div key={p.dataKey} className="flex items-center space-x-1">
                        <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: p.color }}></span>
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
              if (value === 'done') return 'Done';
              if (value === 'overdue') return 'Overdue';
              if (value === 'nonPrio') return 'Non-Prio';
              if (value === 'prio') return 'Prio';
              return value;
            }}
          />
          {data.some((d) => d.key === todayWeekKey) && (
            <ReferenceLine x={todayWeekKey} stroke="#A0AEC0" strokeDasharray="4 3" />
          )}
          <Bar dataKey="done" stackId="a" fill={settings.colorDone} name="Done" />
          <Bar dataKey="overdue" stackId="a" fill={settings.colorOverdue} name="Overdue" />
          <Bar dataKey="nonPrio" stackId="a" fill={settings.colorNonPrio} name="Non-Prio" />
          <Bar dataKey="prio" stackId="a" fill={settings.colorPrio} name="Prio" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Meeting icon options. Each entry maps a key to a Lucide icon component. "none" represents no icon.
const meetingIconOptions = [
  { key: 'none', label: 'None', Icon: null },
  { key: 'users', label: 'Users', Icon: Users },
  { key: 'briefcase', label: 'Briefcase', Icon: Briefcase },
  { key: 'calendar', label: 'Calendar', Icon: CalendarCheck },
  { key: 'clipboard', label: 'Clipboard', Icon: ClipboardList },
  { key: 'code', label: 'Code', Icon: Code },
  { key: 'share', label: 'Share', Icon: Share },
  { key: 'headphones', label: 'Headphones', Icon: Headphones },
  { key: 'tag', label: 'Tag', Icon: Tag },
  { key: 'life', label: 'LifeBuoy', Icon: LifeBuoy },
  { key: 'pie', label: 'PieChart', Icon: PieChart },
];

// Task modal for editing a single task
const TaskModal = ({ tileId, taskId, tiles, updateTask, onClose }) => {
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

// Meeting modal for editing meeting title and managing notes (list view). Double clicking a note opens NoteModal.
const MeetingModal = ({ meeting, renameMeeting, updateMeetingIcon, setShowNoteModal, setCurrentNoteInfo, removeAttachment, addMeetingAttachment, settings, onClose }) => {
  if (!meeting) return null;
  // Group notes by month of their date (e.g., "September 2025"). Notes without a date go to "No Date" group.
  const notesByMonth = {};
  meeting.notes.forEach((note) => {
    const monthKey = note.date ? format(parseISO(note.date), 'MMMM yyyy') : 'No Date';
    if (!notesByMonth[monthKey]) notesByMonth[monthKey] = [];
    notesByMonth[monthKey].push(note);
  });
  const monthKeys = Object.keys(notesByMonth).sort((a, b) => {
    if (a === 'No Date') return 1;
    if (b === 'No Date') return -1;
    const ad = parseISO(`${a.split(' ')[1]}-${new Date(Date.parse(a.split(' ')[0] + ' 1, 2000')).getMonth() + 1}-01`);
    const bd = parseISO(`${b.split(' ')[1]}-${new Date(Date.parse(b.split(' ')[0] + ' 1, 2000')).getMonth() + 1}-01`);
    return bd - ad;
  });
  // Collect all attachments across notes and the meeting-level attachments. Each entry stores noteId (null for meeting) and index to allow removal.
  const allAttachments = [];
  // Meeting-level attachments first
  (meeting.attachments || []).forEach((att, idx) => {
    allAttachments.push({ ...att, noteId: null, index: idx });
  });
  meeting.notes.forEach((n) => {
    (n.attachments || []).forEach((att, idx) => {
      allAttachments.push({ ...att, noteId: n.id, index: idx });
    });
  });

  // Handler for adding meeting-level attachments. Reads files and converts to Data URLs before calling addMeetingAttachment.
  const handleAddMeetingFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const maxBytes = ((settings && settings.attachmentMaxMB) ? settings.attachmentMaxMB : 25) * 1024 * 1024;
    const attachmentsToAdd = [];
    for (const file of files) {
      if (file.size > maxBytes) {
        alert(`File ${file.name} exceeds ${settings && settings.attachmentMaxMB ? settings.attachmentMaxMB : 25}MB and will not be added.`);
        continue;
      }
      const data = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(new Error('File read error'));
        fr.readAsDataURL(file);
      });
      attachmentsToAdd.push({ name: file.name, size: file.size, data, addedAt: Date.now() });
    }
    if (attachmentsToAdd.length > 0) {
      addMeetingAttachment(meeting.id, attachmentsToAdd);
    }
    e.target.value = '';
  };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          {/* Meeting title and icon picker */}
          <div className="flex items-center flex-1 space-x-3">
            <input
              type="text"
              value={meeting.title}
              onChange={(e) => renameMeeting(meeting.id, e.target.value)}
              className="font-semibold text-lg flex-1 bg-transparent focus:outline-none"
            />
            {/* Icon picker trigger */}
            <IconPicker meeting={meeting} updateMeetingIcon={updateMeetingIcon} />
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4 text-sm">
          {meeting.notes.length === 0 && <div className="text-gray-500">No notes yet.</div>}
          {/* Attachments section: includes meeting-level and note-level attachments */}
          <div className="space-y-2">
            <div className="text-gray-600 font-semibold">Attachments</div>
            {allAttachments.length === 0 ? (
              <p className="text-sm text-gray-500">No attachments</p>
            ) : (
              allAttachments.map((att, idx) => (
                <div key={idx} className="flex items-center justify-between border border-gray-200 rounded-lg p-2 bg-gray-50">
                  <a
                    href={att.data}
                    download={att.name}
                    className="text-purple-700 hover:underline truncate mr-2"
                    title={att.name}
                  >
                    {att.name} ({(att.size / 1024 / 1024).toFixed(1)} MB)
                  </a>
                  <button
                    onClick={() => removeAttachment(meeting.id, att.noteId, att.index)}
                    className="text-red-600 hover:underline text-xs"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
            {/* File input for adding new attachments to this meeting */}
            <div className="mt-2">
              <input
                type="file"
                multiple
                onChange={handleAddMeetingFiles}
                className="text-sm"
              />
            </div>
          </div>
          {monthKeys.map((month) => (
            <div key={month} className="space-y-2">
              <div className="text-gray-600 font-semibold mt-2">{month}</div>
              {notesByMonth[month].map((note) => (
                <div
                  key={note.id}
                  className="border border-gray-200 rounded-lg p-3 bg-purple-50 hover:bg-purple-200 hover:text-purple-800 cursor-pointer"
                  onDoubleClick={() => {
                    setCurrentNoteInfo({ meetingId: meeting.id, noteId: note.id });
                    setShowNoteModal(true);
                  }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <div className="font-semibold">{note.date || 'No date'}</div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const plainSummary = note.summary ? note.summary.replace(/<[^>]+>/g, '') : '';
                          const plainActions = note.actions ? note.actions.replace(/<[^>]+>/g, '') : '';
                          const text = `${meeting.title}\n\nDate: ${note.date || ''}\n\nAttendance: ${note.attendance || ''}\n\nSummary: ${plainSummary}\n\nActions: ${plainActions}`;
                          navigator.clipboard.writeText(text);
                        }}
                        className="p-0.5 text-gray-500 hover:bg-gray-50 rounded"
                        title="Copy Note"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentNoteInfo({ meetingId: meeting.id, noteId: note.id });
                          setShowNoteModal(true);
                        }}
                        className="p-0.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit Note"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {note.attendance && <div className="mt-1"><strong>Attendance:</strong> {note.attendance}</div>}
                  {note.summary && <div className="mt-1"><strong>Summary:</strong> <div dangerouslySetInnerHTML={{ __html: note.summary }} /></div>}
                  {note.actions && <div className="mt-1"><strong>Actions:</strong> <div dangerouslySetInnerHTML={{ __html: note.actions }} /></div>}
                </div>
              ))}
            </div>
          ))}
          {/* Add new note button */}
          <button
            onClick={() => {
              setCurrentNoteInfo({ meetingId: meeting.id, noteId: null });
              setShowNoteModal(true);
            }}
            className="mt-4 flex items-center justify-center border border-gray-300 rounded-md py-1 text-sm hover:bg-gray-50"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Note
          </button>
        </div>
      </div>
    </div>
  );
};

// Note modal for viewing/editing a single note or creating a new one
const NoteModal = ({ meeting, note, addNote, updateNote, removeNote, onClose, settings }) => {
  const isEdit = !!note;
  const [form, setForm] = useState({
    date: note?.date || '',
    attendance: note?.attendance || '',
    summary: note?.summary || '',
    actions: note?.actions || '',
    // attachments are stored as an array of objects { name, data, size }
    attachments: note?.attachments ? [...note.attachments] : [],
  });
  const handleSave = () => {
    if (isEdit) {
      updateNote(meeting.id, note.id, {
        date: form.date || null,
        attendance: form.attendance || '',
        summary: form.summary || '',
        actions: form.actions || '',
        attachments: form.attachments,
      });
    } else {
      // Only save if at least one field is filled or attachments exist
      if (form.date || form.attendance || form.summary || form.actions || (form.attachments && form.attachments.length > 0)) {
        const newNote = {
          id: generateId('note'),
          date: form.date || null,
          attendance: form.attendance || '',
          summary: form.summary || '',
          actions: form.actions || '',
          attachments: form.attachments,
        };
        addNote(meeting.id, newNote);
      }
    }
    onClose();
  };

  // Handle uploading attachments. Converts files to base64 strings and stores name and size.
  const handleAttachmentUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      // Limit file size based on settings.attachmentMaxMB (default 25 MB if undefined)
      const maxBytes = ((settings && settings.attachmentMaxMB) || 25) * 1024 * 1024;
      if (file.size > maxBytes) {
        alert(`File ${file.name} exceeds ${settings && settings.attachmentMaxMB ? settings.attachmentMaxMB : 25}MB and will not be added.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setForm((prev) => ({
          ...prev,
          attachments: [...prev.attachments, { name: file.name, data: reader.result, size: file.size }],
        }));
      };
      reader.readAsDataURL(file);
    });
    // Reset file input so same file can be added again if needed
    e.target.value = '';
  };

  // Download attachment helper
  const downloadAttachment = (att) => {
    const arr = att.data.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    saveAs(blob, att.name);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">{isEdit ? 'Edit Note' : 'Add Note'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4 text-sm">
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              className="border border-gray-300 rounded px-2 py-1 flex-1"
            />
            <input
              type="text"
              placeholder="Attendance"
              value={form.attendance}
              onChange={(e) => setForm((prev) => ({ ...prev, attendance: e.target.value }))}
              className="border border-gray-300 rounded px-2 py-1 flex-1"
            />
          </div>
          <div>
            <div className="font-semibold mb-1">Summary</div>
            <ReactQuill
              theme="snow"
              value={form.summary}
              onChange={(val) => setForm((prev) => ({ ...prev, summary: val }))}
              modules={{ toolbar: [['bold', 'italic', 'underline', 'strike'], [{ list: 'bullet' }, { list: 'ordered' }], [{ size: [] }], ['link']] }}
            />
          </div>
          <div>
            <div className="font-semibold mb-1">Actions</div>
            <ReactQuill
              theme="snow"
              value={form.actions}
              onChange={(val) => setForm((prev) => ({ ...prev, actions: val }))}
              modules={{ toolbar: [['bold', 'italic', 'underline', 'strike'], [{ list: 'bullet' }, { list: 'ordered' }], [{ size: [] }], ['link']] }}
            />
          </div>

        {/* Attachments section */}
        <div>
          <div className="font-semibold mb-1 mt-2">Attachments</div>
          {form.attachments && form.attachments.length > 0 && (
            <div className="space-y-2 mb-2">
              {form.attachments.map((att, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-100 rounded p-2 text-xs">
                  <span className="truncate flex-1 mr-2" title={att.name}>{att.name} ({(att.size / (1024 * 1024)).toFixed(2)} MB)</span>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => downloadAttachment(att)}
                      className="p-1 rounded hover:bg-purple-50 hover:text-purple-700"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }))}
                      className="p-1 rounded hover:bg-red-50 text-red-500"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-1">
            <input
              type="file"
              multiple
              onChange={handleAttachmentUpload}
              className="border border-gray-300 rounded px-2 py-1 w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Max {settings && settings.attachmentMaxMB ? settings.attachmentMaxMB : 25}MB per file. Attachments are stored locally and not included in AI summaries.</p>
          </div>
        </div>
          <div className="flex space-x-2">
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
            {isEdit && (
              <button
                onClick={() => {
                  removeNote(meeting.id, note.id);
                  onClose();
                }}
                className="flex-1 p-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Icon picker for meetings. Allows selecting an icon from predefined options or none. Appears as a small grid dropdown.
const IconPicker = ({ meeting, updateMeetingIcon }) => {
  const [open, setOpen] = useState(false);
  // Determine current icon component
  const currentOpt = meetingIconOptions.find((o) => o.key === meeting.icon);
  const CurrentIcon = currentOpt && currentOpt.Icon;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="p-1 border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center"
        title="Choose meeting icon"
      >
        {CurrentIcon ? <CurrentIcon className="w-4 h-4 text-purple-600" /> : <Tag className="w-4 h-4 text-gray-500" />}
      </button>
      {open && (
        <div className="absolute left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg p-3 z-50 grid grid-cols-5 gap-3 w-72 max-h-64 overflow-y-auto">
          {meetingIconOptions.map((opt) => {
            const { key, label, Icon } = opt;
            return (
              <button
                key={key}
                onClick={() => {
                  updateMeetingIcon(meeting.id, key);
                  setOpen(false);
                }}
                className="flex items-center justify-center p-2 hover:bg-gray-100 rounded"
                title={label}
              >
                {Icon ? <Icon className="w-5 h-5 text-purple-600" /> : <X className="w-5 h-5 text-gray-500" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Modal for expanding a tile to focus on its tasks
const ExpandedTileModal = ({ tile, renameTile, reorderTasks, updateTask, addTask, removeTask, togglePrio, toggleDone, updateDate, onClose }) => {
  if (!tile) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <input
            type="text"
            value={tile.title}
            onChange={(e) => renameTile(tile.id, e.target.value)}
            className="font-semibold text-lg flex-1 bg-transparent focus:outline-none"
          />
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2">
          {tile.tasks.map((task, idx) => (
            <div
              key={task.id}
              className="border border-gray-200 rounded-lg p-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.setData('expanded-task-index', idx.toString());
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const from = parseInt(e.dataTransfer.getData('expanded-task-index'), 10);
                const to = idx;
                if (!isNaN(from) && from !== to) {
                  reorderTasks(tile.id, from, to);
                }
              }}
            >
              <div className="flex items-center space-x-3 flex-1">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleDone(tile.id, task.id)}
                  className="accent-purple-600 w-4 h-4"
                />
                <input
                  type="text"
                  value={task.label}
                  onChange={(e) => updateTask(tile.id, task.id, { label: e.target.value })}
                  className={`flex-1 text-sm bg-transparent focus:outline-none ${task.done ? 'line-through text-gray-400' : ''}`}
                />
              </div>
              <div className="flex items-center space-x-2">
                {/* Owner inline editing */}
                <input
                  type="text"
                  placeholder="Owner"
                  value={task.owner || ''}
                  onChange={(e) => updateTask(tile.id, task.id, { owner: e.target.value })}
                  className="w-20 border border-gray-300 rounded px-1 py-0.5 text-xs"
                />
                <button
                  onClick={() => togglePrio(tile.id, task.id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center border text-white"
                  style={{ backgroundColor: task.prio ? '#8B0000' : '#007BFF' }}
                  title={task.prio ? 'High Priority' : 'Non Priority'}
                >
                  <Flag className="w-3 h-3" />
                </button>
                <input
                  type="date"
                  value={task.date || ''}
                  onChange={(e) => updateDate(tile.id, task.id, e.target.value)}
                  className="text-xs border border-gray-300 rounded px-1 py-0.5"
                />
                <button
                  onClick={() => removeTask(tile.id, task.id)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        {/* Add task input */}
        <ExpandedAddTaskInput tileId={tile.id} addTask={addTask} />
      </div>
    </div>
  );
};

// Input component for adding a task within the expanded tile modal
const ExpandedAddTaskInput = ({ tileId, addTask }) => {
  const [value, setValue] = useState('');
  const handleAdd = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    addTask(tileId, trimmed);
    setValue('');
  };
  return (
    <div className="flex items-center mt-3">
      <input
        type="text"
        placeholder="Add a task…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAdd();
        }}
        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
      />
      <button
        onClick={handleAdd}
        className="ml-2 p-2 rounded bg-purple-600 text-white hover:bg-purple-700"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};

// Settings page component
const SettingsPage = ({
  settings,
  setSettings,
  dirHandle,
  chooseDataFolder,
  clearDataFolder,
  handleExport,
  triggerImport,
  fileInputRef,
  handleImport,
  cloudSyncEnabled,
  setCloudSyncEnabled,
  pushToDrive,
  pullFromDrive,
  tokenInfo,
  setTokenInfo,
}) => {
  const fileInputRefLogo = useRef(null);
  // Local state to control whether token management fields are unlocked. By default
  // the user must enter a password to modify token counts. Once unlocked, the
  // controls remain visible until the Settings dialog is closed or the page is refreshed.
  const [tokenControlsUnlocked, setTokenControlsUnlocked] = useState(false);
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
        <div>
          <label className="block text-sm font-medium mb-1">Application Name</label>
          <input
            type="text"
            value={settings.appName}
            onChange={(e) => setSettings((prev) => ({ ...prev, appName: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-1.5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Logo</label>
          <div className="flex items-center space-x-4">
            {settings.logo && <img src={settings.logo} alt="Logo preview" className="w-16 h-16 object-contain border rounded" />}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Done Color</label>
            <input
              type="color"
              value={settings.colorDone}
              onChange={(e) => setSettings((prev) => ({ ...prev, colorDone: e.target.value }))}
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
          <div>
            <label className="block text-sm font-medium mb-1">Overdue Color</label>
            <input
              type="color"
              value={settings.colorOverdue}
              onChange={(e) => setSettings((prev) => ({ ...prev, colorOverdue: e.target.value }))}
              className="w-full h-10 border border-gray-300 rounded"
            />
          </div>
        </div>
        {/* OpenAI API Key */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">OpenAI API Key</label>
          <input
            type="password"
            placeholder="Enter API key"
            value={settings.apiKey || ''}
            onChange={(e) => setSettings((prev) => ({ ...prev, apiKey: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-1.5"
          />
          <p className="text-xs text-gray-500 mt-1">Your API key is stored locally and hidden. It is not included in export files.</p>
        </div>

        {/* AI feature toggles */}
        <div className="mt-4 border-t pt-4 space-y-2">
          <h3 className="text-md font-semibold">AI Options</h3>
          <p className="text-sm text-gray-600">Configure which AI features are available in the assistant.</p>
          <div className="space-y-1">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.aiPlay}
                onChange={(e) => setSettings((prev) => ({ ...prev, aiPlay: e.target.checked }))}
                className="w-4 h-4 accent-purple-600"
              />
              <span className="text-sm">Enable Play Summary</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.aiPdf}
                onChange={(e) => setSettings((prev) => ({ ...prev, aiPdf: e.target.checked }))}
                className="w-4 h-4 accent-purple-600"
              />
              <span className="text-sm">Enable PDF Summary</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.aiFreeText}
                onChange={(e) => setSettings((prev) => ({ ...prev, aiFreeText: e.target.checked }))}
                className="w-4 h-4 accent-purple-600"
              />
              <span className="text-sm">Enable Free‑Text Instructions</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.aiActionPlan}
                onChange={(e) => setSettings((prev) => ({ ...prev, aiActionPlan: e.target.checked }))}
                className="w-4 h-4 accent-purple-600"
              />
              <span className="text-sm">Enable Action Plan</span>
            </label>
          </div>
        </div>
        {/* Data folder section */}
        <div className="mt-4 border-t pt-4 space-y-2">
          <h3 className="text-md font-semibold">Data Storage</h3>
          <p className="text-sm text-gray-600">Choose a local folder to store your data (db.json). When selected, changes are saved automatically.</p>
          {dirHandle ? (
            <div className="space-y-2">
              <div className="text-sm text-green-600">A folder is selected.</div>
              <div className="flex space-x-2">
                <button
                  onClick={chooseDataFolder}
                  className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 text-sm"
                >
                  Change Folder
                </button>
                <button
                  onClick={clearDataFolder}
                  className="px-3 py-1.5 bg-red-100 border border-red-300 text-red-700 rounded hover:bg-red-200 text-sm"
                >
                  Clear Folder
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={chooseDataFolder}
              className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 text-sm"
            >
              Choose Data Folder
            </button>
          )}

          {/* Export / Import controls */}
          <div className="pt-4 border-t mt-4 space-y-2">
            <h4 className="text-md font-semibold">Export & Import</h4>
            <p className="text-sm text-gray-600">Export your data to a JSON file or import from a previously saved file.</p>
            <div className="flex space-x-2">
              <button
                onClick={handleExport}
                className="flex items-center px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-gray-50 hover:bg-gray-100"
              >
                <Download className="w-4 h-4 mr-1 text-gray-600" /> Export
              </button>
              <button
                onClick={triggerImport}
                className="flex items-center px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-gray-50 hover:bg-gray-100"
              >
                <Upload className="w-4 h-4 mr-1 text-gray-600" /> Import
              </button>
            </div>
            <input
              type="file"
              accept=".csv,.json"
              ref={fileInputRef}
              className="hidden"
              onChange={handleImport}
            />
          </div>

          {/* Attachment settings */}
          <div className="pt-4 border-t mt-4 space-y-2">
            <h4 className="text-md font-semibold">Attachments</h4>
            <p className="text-sm text-gray-600">Specify the maximum file size for attachments (in MB). Files larger than this will not be added to meeting notes.</p>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={1}
                max={200}
                value={settings.attachmentMaxMB}
                onChange={(e) => setSettings((prev) => ({ ...prev, attachmentMaxMB: Number(e.target.value || 1) }))}
                className="w-24 px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white"
              />
              <span className="text-sm">MB</span>
            </div>
          </div>

          {/* Token management */}
          <div className="pt-4 border-t mt-4 space-y-2">
            <h4 className="text-md font-semibold">Token Management</h4>
            <p className="text-sm text-gray-600">Manage your AI token allowance. Unlock controls to reset or change your total tokens. Each character generated counts as one token. Audio playback uses two tokens per character.</p>
            {!tokenControlsUnlocked ? (
              <button
                onClick={() => {
                  const pwd = prompt('Enter password to unlock token controls');
                  if (pwd === '97840') {
                    setTokenControlsUnlocked(true);
                  } else {
                    alert('Incorrect password');
                  }
                }}
                className="px-3 py-1.5 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
              >
                Unlock Token Controls
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col md:flex-row md:space-x-4 space-y-3 md:space-y-0">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Total Tokens</label>
                    <input
                      type="number"
                      min={1}
                      value={tokenInfo.total}
                      onChange={(e) => {
                        const v = Number(e.target.value || 0);
                        setTokenInfo((prev) => ({ ...prev, total: v }));
                      }}
                      className="w-full border border-gray-300 rounded px-3 py-1.5"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Used Tokens</label>
                    <input
                      type="number"
                      min={0}
                      value={tokenInfo.used}
                      onChange={(e) => {
                        const v = Number(e.target.value || 0);
                        setTokenInfo((prev) => ({ ...prev, used: v }));
                      }}
                      className="w-full border border-gray-300 rounded px-3 py-1.5"
                    />
                  </div>
                </div>
                {/* Token cost settings per character */}
                <div className="flex flex-col md:flex-row md:space-x-4 space-y-3 md:space-y-0">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Tokens per Text Character</label>
                    <input
                      type="number"
                      min={1}
                      value={settings.tokenPerCharText}
                      onChange={(e) => {
                        const v = Number(e.target.value || 1);
                        setSettings((prev) => ({ ...prev, tokenPerCharText: v }));
                      }}
                      className="w-full border border-gray-300 rounded px-3 py-1.5"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Tokens per Audio Character</label>
                    <input
                      type="number"
                      min={1}
                      value={settings.tokenPerCharAudio}
                      onChange={(e) => {
                        const v = Number(e.target.value || 1);
                        setSettings((prev) => ({ ...prev, tokenPerCharAudio: v }));
                      }}
                      className="w-full border border-gray-300 rounded px-3 py-1.5"
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setTokenInfo((prev) => ({ ...prev, used: 0 }))}
                    className="px-3 py-1.5 text-sm bg-red-100 border border-red-300 text-red-700 rounded hover:bg-red-200"
                  >
                    Reset Used
                  </button>
                  <button
                    onClick={() => setTokenInfo((prev) => ({ ...prev, total: prev.total + 10000 }))}
                    className="px-3 py-1.5 text-sm bg-green-100 border border-green-300 text-green-700 rounded hover:bg-green-200"
                  >
                    +10k Tokens
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cloud sync controls */}
          <div className="pt-4 border-t mt-4 space-y-2">
            <h4 className="text-md font-semibold">Cloud Sync (Inactive)</h4>
            <p className="text-sm text-gray-600">Optionally sync your data to Google Drive. Local files remain the source of truth. Enable to show push/pull controls.</p>
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cloudSyncEnabled}
                  onChange={(e) => setCloudSyncEnabled(e.target.checked)}
                  className="w-4 h-4 accent-purple-600"
                />
                <span className="text-sm">Enable Cloud Sync</span>
              </label>
              {cloudSyncEnabled && (
                <div className="flex space-x-2">
                  <button
                    onClick={pushToDrive}
                    className="flex items-center px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-gray-50 hover:bg-gray-100"
                  >
                    <Upload className="w-4 h-4 mr-1 text-gray-600" /> Push
                  </button>
                  <button
                    onClick={pullFromDrive}
                    className="flex items-center px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-gray-50 hover:bg-gray-100"
                  >
                    <Download className="w-4 h-4 mr-1 text-gray-600" /> Pull
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  // Load state from localStorage or use defaults
  const [tiles, setTiles] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workChecklist');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.tiles)) return parsed.tiles;
        } catch {}
      }
    }
    return [
      { id: generateId('tile'), title: 'New Tile', tasks: [] },
    ];
  });
  const [meetings, setMeetings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workChecklist');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.meetings)) return parsed.meetings;
        } catch {}
      }
    }
    return [];
  });

  // -------------------------------------------------------------------------
  // Token tracking state for AI usage. Each character generated counts as one
  // token. A default allowance of 10,000 tokens is provided. Users can
  // increase or reset this allowance via the Settings page. The token state
  // persists to localStorage.
  const [tokenInfo, setTokenInfo] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workChecklistTokens');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return { used: 0, total: 10000 };
  });

  // Persist token information whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('workChecklistTokens', JSON.stringify(tokenInfo));
    }
  }, [tokenInfo]);

  // Add token usage. Each character counts as one token by default. Set
  // multiplier=2 when playing audio (each character uses two tokens).
  const addTokenUsage = (chars, multiplier = 1) => {
    setTokenInfo((prev) => ({ ...prev, used: prev.used + chars * multiplier }));
  };
const defaultSettings = {
    // Default application name shown in the header. Users can customise this in Settings.
    appName: 'Task Manager',
    logo: null,
    // Default colours for the stacked bar chart. Users can customise these in Settings.
    colorDone: '#D3D3D3',
    colorNonPrio: '#007BFF',
    colorPrio: '#8B0000',
    colorOverdue: '#FF8000',
    // API key for OpenAI integration (optional). Not exported to your data file for security by default.
    apiKey: '',
    // AI feature toggles. Users can disable individual AI capabilities via Settings.
    aiPlay: true,
    aiPdf: true,
    aiFreeText: false,
    // Whether to enable the Action Plan generator in the AI Assistant. When enabled, users can generate a day‑by‑day plan.
    aiActionPlan: false,
    // Token cost per character for generating written summaries. Adjust in Settings to reflect your billing scheme. 1 token per character by default.
    tokenPerCharText: 1,
    // Token cost per character when using the text‑to‑speech playback. Audio generation is typically more expensive so defaults to 2 tokens per character.
    tokenPerCharAudio: 2,
    // Maximum attachment size in MB. Attachments larger than this will be rejected when adding notes or meeting‑level attachments.
    attachmentMaxMB: 25,
  };

// --- File System Access helpers for persistent storage ---
// IndexedDB helpers to save and load the directory handle. The handle can be stored via structured cloning.
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('workChecklistDB', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('handles');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveDirHandle(handle) {
  const db = await openDB();
  const tx = db.transaction('handles', 'readwrite');
  tx.objectStore('handles').put(handle, 'dirHandle');
  return tx.complete;
}

async function loadDirHandle() {
  const db = await openDB();
  const tx = db.transaction('handles');
  const handle = await tx.objectStore('handles').get('dirHandle');
  return handle;
}

async function clearDirHandle() {
  const db = await openDB();
  const tx = db.transaction('handles', 'readwrite');
  tx.objectStore('handles').delete('dirHandle');
  return tx.complete;
}

// Save state to db.json in the selected directory
async function saveToFile(dirHandle, data) {
  try {
    // ensure we have permission
    const permission = await dirHandle.queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      const reqPerm = await dirHandle.requestPermission({ mode: 'readwrite' });
      if (reqPerm !== 'granted') {
        console.warn('Permission to write to directory denied');
        return;
      }
    }
    const fileHandle = await dirHandle.getFileHandle('db.json', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    await writable.close();
  } catch (e) {
    console.error('Error saving to file', e);
  }
}
  const [settings, setSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workChecklist');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.settings) return { ...defaultSettings, ...parsed.settings };
        } catch {}
      }
    }
    return defaultSettings;
  });
  // Persist to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('workChecklist', JSON.stringify({ tiles, meetings, settings }));
    }
  }, [tiles, meetings, settings]);

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
  // Note modal state
  const [showNoteModal, setShowNoteModal] = useState(false);
  // currentNoteInfo holds { meetingId, noteId } or null
  const [currentNoteInfo, setCurrentNoteInfo] = useState(null);
  // Expanded tile modal state
  const [showExpandedTileModal, setShowExpandedTileModal] = useState(false);
  const [expandedTileId, setExpandedTileId] = useState(null);
  const fileInputRef = useRef(null);

  // Cloud sync toggle. When enabled, show push/pull controls in Settings. This state is not persisted to file.
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);

  // Stub functions for cloud sync. These can be replaced with real Google Drive integration later.
  const pushToDrive = async () => {
    if (!cloudSyncEnabled) return;
    try {
      // In a real implementation, authenticate with Google and upload the db.json file
      console.log('Push to drive: Not implemented');
      alert('Push to Google Drive is not implemented in this demo.');
    } catch (e) {
      console.error('Error pushing to drive', e);
    }
  };
  const pullFromDrive = async () => {
    if (!cloudSyncEnabled) return;
    try {
      // In a real implementation, download the db.json file from Google Drive and update state
      console.log('Pull from drive: Not implemented');
      alert('Pull from Google Drive is not implemented in this demo.');
    } catch (e) {
      console.error('Error pulling from drive', e);
    }
  };

  // Call OpenAI to generate analysis of selected tasks and meeting notes
  const analyzeAI = async () => {
    // Require at least one tile or meeting selection
    if (analysisTileIds.length === 0 && analysisMeetingIds.length === 0) {
      alert('Please select one or more tiles or meetings to analyze.');
      return;
    }
    if (!settings.apiKey) {
      alert('Please enter your OpenAI API key in Settings.');
      return;
    }
    setAnalysisLoading(true);
    setAnalysisResult('');
    setAnalysisAudioUrl(null);
    try {
      // Gather selected tiles and meetings
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
      let prompt =
        'You are an AI assistant that provides concise, structured summaries of tasks and meeting notes. Highlight key points, issues, and next steps in bullet form.\n\n' +
        (tasksText ? 'Tasks:\n' + tasksText + '\n\n' : '') +
        (notesText ? 'Meeting Notes:\n' + notesText + '\n\n' : '');
      if (analysisInstructions && analysisInstructions.trim()) {
        prompt += 'Instructions:\n' + analysisInstructions.trim() + '\n\n';
      }
      const body = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'ou are an assistant summarizing tasks and meeting notes. Some notes reference multiple projects. Always include a reference to the specific task or meeting. If multiple items relate to the same project, infer and group them by context.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      };
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      const result = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      // Trim whitespace from the returned summary
      let trimmed = result ? result.trim() : '';
      // Limit the result based on remaining tokens and per-character cost. Each character consumes
      // settings.tokenPerCharText tokens. If the user has fewer tokens than needed, truncate
      // the summary and append an ellipsis.  If no tokens are left, do not set a summary.
      const available = tokenInfo.total - tokenInfo.used;
      const maxChars = settings.tokenPerCharText > 0 ? Math.floor(available / settings.tokenPerCharText) : 0;
      if (maxChars <= 0) {
        trimmed = '';
      } else if (trimmed.length > maxChars) {
        trimmed = trimmed.slice(0, maxChars) + '…';
      }
      setAnalysisResult(trimmed);
      // Update token usage based on the number of characters displayed and the configured per-character cost
      if (trimmed) addTokenUsage(trimmed.length, settings.tokenPerCharText);
    } catch (e) {
      console.error('OpenAI analysis error', e);
      alert('Failed to call OpenAI API. Check console for details.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Generate speech for analysis result via OpenAI TTS
  const playAudio = async () => {
    if (!analysisResult) return;
    if (!settings.aiPlay) return;
    if (!settings.apiKey) {
      alert('Please enter your OpenAI API key in Settings.');
      return;
    }
    setAnalysisLoading(true);
    try {
      const ttsBody = {
        model: 'tts-1',
        input: analysisResult,
        voice: 'alloy',
      };
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify(ttsBody),
      });
      // Expect a stream of audio bytes
      const reader = res.body.getReader();
      const chunks = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const blob = new Blob(chunks, { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      setAnalysisAudioUrl(url);
      // Playing the audio consumes tokens based on the configured cost per character for audio.
      if (analysisResult) addTokenUsage(analysisResult.length, settings.tokenPerCharAudio);
    } catch (e) {
      console.error('OpenAI TTS error', e);
      alert('Failed to generate audio. Check console.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Generate an action plan for the current week based on selected tasks and meetings
  const generateActionPlan = async () => {
    // For action plans we allow generating without any selections; if no specific tiles or meetings
    // are selected then all tasks and meeting notes are used. This may consume many tokens.
    if (!settings.apiKey) {
      alert('Please enter your OpenAI API key in Settings.');
      return;
    }
    setActionPlanLoading(true);
    setActionPlanResult('');
    setActionPlanAudioUrl(null);
    try {
      // Action plan uses all tasks and all meeting notes regardless of current selections. This ensures
      // a holistic plan across all projects. Selected tiles/meetings are ignored here.
      const selectedTasks = tiles.flatMap((tile) => tile.tasks);
      const selectedNotes = meetings.flatMap((m) => m.notes);
      // Build textual representations
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
      // Determine current date and remaining days of week (Mon-Fri). If today is Friday or beyond, generate a one-day plan.
      const today = new Date();
      const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayIndex = today.getDay();
      // Generate list of day names from today through Friday (index 5)
      const daysForPlan = [];
      for (let d = todayIndex; d <= 5; d++) {
        daysForPlan.push(weekDays[d]);
      }
      // Build the plan prompt as a template literal to avoid stray backslash escapes.  Using a single
      // multiline string here prevents syntax errors that can occur when using backslashes for line
      // continuations.  This prompt instructs the AI to create a proactive, creative action plan for
      // the remainder of the current work week.  It includes the current date and day name, asks
      // the assistant to assess the situation, lay out day‑by‑day actions, highlight blockers,
      // and finish with a "Next steps:" section.  A blank line at the end separates the prompt
      // from the appended task and meeting note data.
      const planPrompt = `You are an AI assistant tasked with drafting a proactive, creative action plan for the remainder of the work week.
Today is ${format(today, 'yyyy-MM-dd')} (${weekDays[todayIndex]}).
Use the following tasks and meeting notes to assess the situation, define priorities, and lay out a day‑by‑day plan.
Provide a brief introduction assessing the current status, then outline each remaining day separately with recommended actions and priorities.
Highlight any blockers or dependencies.
End with a section called "Next steps:" summarising key actions.

`;
      const promptBody =
        planPrompt +
        (tasksText ? 'Tasks:\n' + tasksText + '\n\n' : '') +
        (notesText ? 'Meeting Notes:\n' + notesText + '\n\n' : '');
      const body = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an assistant creating an action plan for the work week.' },
          { role: 'user', content: promptBody },
        ],
        temperature: 0.3,
      };
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      const result = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      // Trim whitespace from the returned plan
      let trimmed = result ? result.trim() : '';
      // Limit output based on available tokens and configured cost per character
      const available = tokenInfo.total - tokenInfo.used;
      const maxChars = settings.tokenPerCharText > 0 ? Math.floor(available / settings.tokenPerCharText) : 0;
      if (maxChars <= 0) {
        trimmed = '';
      } else if (trimmed.length > maxChars) {
        trimmed = trimmed.slice(0, maxChars) + '…';
      }
      setActionPlanResult(trimmed);
      // Update tokens based on the number of characters shown in the plan
      if (trimmed) addTokenUsage(trimmed.length, settings.tokenPerCharText);
    } catch (e) {
      console.error('OpenAI action plan error', e);
      alert('Failed to generate action plan. Check console for details.');
    } finally {
      setActionPlanLoading(false);
    }
  };

  // Play the action plan via OpenAI TTS
  const playActionPlanAudio = async () => {
    if (!actionPlanResult) return;
    if (!settings.aiPlay) return;
    if (!settings.apiKey) {
      alert('Please enter your OpenAI API key in Settings.');
      return;
    }
    setActionPlanLoading(true);
    try {
      const ttsBody = {
        model: 'tts-1',
        input: actionPlanResult,
        voice: 'alloy',
      };
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify(ttsBody),
      });
      const reader = res.body.getReader();
      const chunks = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const blob = new Blob(chunks, { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      setActionPlanAudioUrl(url);
      // Playing the action plan consumes tokens based on the configured cost per character for audio
      if (actionPlanResult) addTokenUsage(actionPlanResult.length, settings.tokenPerCharAudio);
    } catch (e) {
      console.error('OpenAI TTS plan error', e);
      alert('Failed to generate audio for action plan.');
    } finally {
      setActionPlanLoading(false);
    }
  };

  // Generate a PDF of the AI action plan result. Includes the application logo and a header.
  const generateActionPlanPdf = async () => {
    if (!actionPlanResult) return;
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      let y = 40;
      if (settings.logo) {
        try {
          const imgSize = 40;
          doc.addImage(settings.logo, 'PNG', 40, y - 30, imgSize, imgSize);
        } catch (e) {
          // ignore
        }
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text(settings.appName || 'Action Plan', settings.logo ? 90 : 40, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.text('AI Action Plan', settings.logo ? 90 : 40, y + 20);
      y += 60;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(actionPlanResult, 520);
      doc.text(lines, 40, y);
      doc.save('ai-action-plan.pdf');
    } catch (err) {
      console.error('Failed to generate action plan PDF', err);
    }
  };

  // Format the AI analysis result for display. Highlights the "Next steps:" header in purple and bold.
  const formatAnalysisResult = (text) => {
    if (!text) return '';
    // Replace any variation of "Next steps:" with bold purple styling
    return text.replace(/Next steps:/i, '<strong style="color:#6B21A8">Next steps:</strong>');
  };

  // Persistent directory handle for saving data
  const [dirHandle, setDirHandle] = useState(null);

  // AI analysis states
  // Allow selecting multiple tiles and meetings for analysis
  const [analysisTileIds, setAnalysisTileIds] = useState([]);
  const [analysisMeetingIds, setAnalysisMeetingIds] = useState([]);
  const [analysisInstructions, setAnalysisInstructions] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [analysisAudioUrl, setAnalysisAudioUrl] = useState(null);

  // Action plan AI states
  const [actionPlanLoading, setActionPlanLoading] = useState(false);
  const [actionPlanResult, setActionPlanResult] = useState('');
  const [actionPlanAudioUrl, setActionPlanAudioUrl] = useState(null);

  // Update document title and favicon when the app name or logo changes
  useEffect(() => {
    // Update document title to reflect the current app name
    if (settings && settings.appName) {
      document.title = settings.appName;
    }
    // Update favicon dynamically if a logo is provided
    const link = document.querySelector("link[rel='icon']");
    if (link) {
      if (settings.logo) {
        link.href = settings.logo;
      } else {
        // fallback to default favicon (if any)
        link.href = '/favicon.ico';
      }
    }
  }, [settings.appName, settings.logo]);

  // On mount, load stored directory handle from IndexedDB
  useEffect(() => {
    (async () => {
      try {
        const handle = await loadDirHandle();
        if (handle) {
          // request permission lazily
          setDirHandle(handle);
        }
      } catch (e) {
        console.error('Failed to load directory handle', e);
      }
    })();
  }, []);

  // Persist changes to db.json whenever tiles, meetings or settings change and dirHandle is available
  useEffect(() => {
    if (dirHandle) {
      saveToFile(dirHandle, { tiles, meetings, settings });
    }
  }, [tiles, meetings, settings, dirHandle]);

  // Task operations
  const addTile = () => {
    const newTile = { id: generateId('tile'), title: 'New Tile', tasks: [] };
    setTiles((prev) => [...prev, newTile]);
  };
  const removeTile = (tileId) => {
    setTiles((prev) => prev.filter((t) => t.id !== tileId));
  };
  const renameTile = (tileId, newTitle) => {
    setTiles((prev) => prev.map((t) => (t.id === tileId ? { ...t, title: newTitle } : t)));
  };
  const addTask = (tileId, label) => {
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
    setTiles((prev) => prev.map((t) => (t.id === tileId ? { ...t, tasks: [...t.tasks, newTask] } : t)));
    // Clear newTask field
    setTiles((prev) => prev.map((t) => (t.id === tileId ? { ...t, newTask: '' } : t)));
  };
  const removeTask = (tileId, taskId) => {
    setTiles((prev) => prev.map((t) => (t.id === tileId ? { ...t, tasks: t.tasks.filter((task) => task.id !== taskId) } : t)));
  };
  const toggleDone = (tileId, taskId) => {
    setTiles((prev) => prev.map((t) => (
      t.id === tileId ? { ...t, tasks: t.tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)) } : t
    )));
  };
  const togglePrio = (tileId, taskId) => {
    setTiles((prev) => prev.map((t) => (
      t.id === tileId ? { ...t, tasks: t.tasks.map((task) => (task.id === taskId ? { ...task, prio: !task.prio } : task)) } : t
    )));
  };
  const updateDate = (tileId, taskId, date) => {
    setTiles((prev) => prev.map((t) => (
      t.id === tileId ? { ...t, tasks: t.tasks.map((task) => (task.id === taskId ? { ...task, date } : task)) } : t
    )));
  };
  const reorderTasks = (tileId, fromIndex, toIndex) => {
    setTiles((prev) => prev.map((tile) => {
      if (tile.id !== tileId) return tile;
      const tasksCopy = [...tile.tasks];
      const [moved] = tasksCopy.splice(fromIndex, 1);
      tasksCopy.splice(toIndex, 0, moved);
      return { ...tile, tasks: tasksCopy };
    }));
  };

  // Reorder tiles
  const reorderTiles = (fromIndex, toIndex) => {
    setTiles((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return arr;
    });
  };

  // Reorder meetings by dragging. Moves an element from one index to another.
  const reorderMeetings = (fromIndex, toIndex) => {
    setMeetings((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return arr;
    });
  };
  const updateTask = (tileId, taskId, updatedFields) => {
    setTiles((prev) => prev.map((tile) => (
      tile.id !== tileId ? tile : { ...tile, tasks: tile.tasks.map((task) => (task.id === taskId ? { ...task, ...updatedFields } : task)) }
    )));
  };

  // Meeting operations
  const addMeeting = (title) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const now = Date.now();
    // Create a new meeting with an empty attachments array. Attachments can be added from the meeting modal.
    const newMeeting = { id: generateId('meeting'), title: trimmed, notes: [], attachments: [], updatedAt: now, icon: null };
    setMeetings((prev) => [...prev, newMeeting]);
  };
  const renameMeeting = (meetingId, newTitle) => {
    const now = Date.now();
    setMeetings((prev) => prev.map((m) => (m.id === meetingId ? { ...m, title: newTitle, updatedAt: now } : m)));
  };

  // Update meeting icon
  const updateMeetingIcon = (meetingId, iconKey) => {
    const now = Date.now();
    setMeetings((prev) => prev.map((m) => {
      if (m.id !== meetingId) return m;
      return { ...m, icon: iconKey === 'none' ? null : iconKey, updatedAt: now };
    }));
  };
  const removeMeeting = (meetingId) => {
    setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
  };
  const addNote = (meetingId, note) => {
    const now = Date.now();
    setMeetings((prev) => prev.map((m) => (
      m.id === meetingId ? { ...m, notes: [...m.notes, note], updatedAt: now } : m
    )));
  };
  const removeNote = (meetingId, noteId) => {
    const now = Date.now();
    setMeetings((prev) => prev.map((m) => (
      m.id === meetingId ? { ...m, notes: m.notes.filter((n) => n.id !== noteId), updatedAt: now } : m
    )));
  };

  // Remove a single attachment. If noteId is null or undefined, remove from meeting-level attachments;
  // otherwise remove from the specified note's attachments. Identified by meetingId, noteId and attachment index.
  const removeAttachment = (meetingId, noteId, attIndex) => {
    setMeetings((prev) => prev.map((m) => {
      if (m.id !== meetingId) return m;
      // If no noteId, remove from meeting-level attachments
      if (!noteId) {
        const newAtts = (m.attachments || []).filter((_, idx) => idx !== attIndex);
        return { ...m, attachments: newAtts };
      }
      // Otherwise remove from a specific note
      return {
        ...m,
        notes: m.notes.map((n) => {
          if (n.id !== noteId) return n;
          const newAtts = (n.attachments || []).filter((_, idx) => idx !== attIndex);
          return { ...n, attachments: newAtts };
        }),
      };
    }));
  };

  // Add attachments to a meeting-level attachment list. Takes an array of attachment objects.
  const addMeetingAttachment = (meetingId, attachments) => {
    setMeetings((prev) => prev.map((m) => {
      if (m.id !== meetingId) return m;
      return { ...m, attachments: [...(m.attachments || []), ...attachments] };
    }));
  };
  const updateNote = (meetingId, noteId, updatedFields) => {
    const now = Date.now();
    setMeetings((prev) => prev.map((m) => {
      if (m.id !== meetingId) return m;
      return {
        ...m,
        notes: m.notes.map((n) => (n.id === noteId ? { ...n, ...updatedFields } : n)),
        updatedAt: now,
      };
    }));
  };

  // Export to JSON
  const handleExport = () => {
    // Exclude apiKey from exported settings for security
    const { apiKey, ...exportSettings } = settings;
    const data = { tiles, meetings, settings: exportSettings };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    saveAs(blob, 'work-checklist.json');
  };
  // Import from JSON or CSV
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      // Try JSON
      try {
        const data = JSON.parse(text);
        if (data && data.tiles && data.meetings && data.settings) {
          const importedTiles = data.tiles.map((tile) => ({
            ...tile,
            tasks: (tile.tasks || []).map((t) => ({ owner: t.owner || '', ...t })),
          }));
          setTiles(importedTiles);
          setMeetings(data.meetings);
          // Preserve existing apiKey when importing settings
          setSettings((prev) => {
            const imported = { ...defaultSettings, ...data.settings };
            return { ...imported, apiKey: prev.apiKey };
          });
          return;
        }
      } catch {}
      // Fallback to CSV
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
    };
    reader.readAsText(file);
  };
  const triggerImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  // Generate weekly PDF summary
  const handleGeneratePDF = () => {
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      let y = 40;
      // Add logo if available
      if (settings.logo) {
        try {
          const imgSize = 40;
          doc.addImage(settings.logo, 'PNG', 40, y - 30, imgSize, imgSize);
        } catch (e) {
          // ignore image errors
        }
      }
      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text(settings.appName, settings.logo ? 90 : 40, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      doc.text(`Weekly To‑Do Summary`, settings.logo ? 90 : 40, y + 20);
      doc.setFontSize(10);
      doc.text(`${format(weekStart, 'MMM d, yyyy')} – ${format(weekEnd, 'MMM d, yyyy')}`, settings.logo ? 90 : 40, y + 35);
      y += 60;
      // Build tasks grouped by day and tile
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
          if (y > 750) {
            doc.addPage();
            y = 40;
          }
          // Day header
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.text(format(day, 'EEEE, MMM d'), 40, y);
          y += 16;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          // Group tasks by tile
          const tasksByTile = {};
          dayTasks.forEach((t) => {
            if (!tasksByTile[t.tile]) tasksByTile[t.tile] = [];
            tasksByTile[t.tile].push(t);
          });
          Object.keys(tasksByTile).forEach((tileName) => {
            if (y > 780) {
              doc.addPage();
              y = 40;
            }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text(tileName, 50, y);
            y += 12;
            tasksByTile[tileName].forEach((t) => {
              if (y > 790) {
                doc.addPage();
                y = 40;
              }
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(10);
              let line = `• ${t.label}`;
              if (t.owner) line += ` (Owner: ${t.owner})`;
              if (t.prio) line += ' [Prio]';
              doc.text(line, 60, y);
              y += 12;
            });
            y += 8;
          });
          y += 4;
        }
      }
      doc.save('weekly-summary.pdf');
    } catch (err) {
      console.error('Failed to generate PDF', err);
    }
  };

  // Generate a PDF of the AI analysis result. Includes the application logo and a header.
  const generateAIPdf = async () => {
    if (!analysisResult) return;
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      let y = 40;
      // Add logo if available
      if (settings.logo) {
        try {
          const imgSize = 40;
          doc.addImage(settings.logo, 'PNG', 40, y - 30, imgSize, imgSize);
        } catch (e) {
          // ignore image errors
        }
      }
      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text(settings.appName || 'AI Summary', settings.logo ? 90 : 40, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.text('AI Analysis Summary', settings.logo ? 90 : 40, y + 20);
      y += 60;
      // Body text: wrap to width
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(analysisResult, 520);
      doc.text(lines, 40, y);
      doc.save('ai-summary.pdf');
    } catch (err) {
      console.error('Failed to generate AI PDF', err);
    }
  };

  // Compute distinct owners for owner filter (case-insensitive). Store first occurrence of each lowercased name.
  const ownersMap = {};
  tiles.forEach((tile) => {
    tile.tasks.forEach((task) => {
      const name = task.owner || '';
      if (!name) return;
      const key = name.toLowerCase();
      if (!ownersMap[key]) ownersMap[key] = name;
    });
  });
  const distinctOwners = Object.values(ownersMap);

  // Choose a data folder and persist handle
  const chooseDataFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      await saveDirHandle(handle);
      setDirHandle(handle);
      // Immediately save current data to the selected folder
      await saveToFile(handle, { tiles, meetings, settings });
    } catch (e) {
      console.error('Error choosing data folder', e);
    }
  };

  // Clear the persistent data folder
  const clearDataFolder = async () => {
    await clearDirHandle();
    setDirHandle(null);
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      {/* Sidebar */}
      <nav className="w-24 bg-white border-r border-gray-200 flex flex-col items-center py-6">
        {/* Logo */}
        <div className="mb-8">
          {settings.logo ? (
            <img src={settings.logo} alt="Logo" className="h-16 w-16 object-contain" />
          ) : (
            <div className="h-16 w-16 bg-gray-200 flex items-center justify-center rounded">
              <span className="text-2xl font-bold">{settings.appName.charAt(0)}</span>
            </div>
          )}
        </div>
        {/* Top navigation items */}
        <div className="flex flex-col space-y-8 flex-1">
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
            onClick={() => setActivePage('ai')}
            className={`flex flex-col items-center ${activePage === 'ai' ? 'text-purple-700' : 'text-gray-500 hover:text-purple-600'}`}
          >
            <Bot className="w-6 h-6" />
            <span className="text-xs mt-1">AI</span>
          </button>
        </div>
        {/* Bottom navigation item for Settings */}
        <div className="mt-auto pt-8">
          <button
            onClick={() => setActivePage('settings')}
            className={`flex flex-col items-center ${activePage === 'settings' ? 'text-purple-700' : 'text-gray-500 hover:text-purple-600'}`}
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs mt-1">Settings</span>
          </button>
        </div>
      </nav>
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          {activePage === 'tasks' && (
            <div className="space-y-6">
              {/* Task controls */}
              <div className="bg-white rounded-xl shadow-md p-4 flex flex-wrap items-center justify-center space-y-2 md:space-y-0 md:space-x-3">
                <input
                  type="text"
                  placeholder="Search tasks…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-40 md:w-48 lg:w-64 px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {/* Priority filter */}
                <div className="relative">
                  <button
                    onClick={() => setFilterMenuOpen((open) => !open)}
                    className="flex items-center px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-gray-50 hover:bg-purple-50 hover:text-purple-700"
                  >
                    <Flag className={`w-4 h-4 mr-1 ${priorityFilter === 'prio' ? 'text-red-600' : priorityFilter === 'nonPrio' ? 'text-blue-600' : 'text-gray-600'}`} />
                    {priorityFilter === 'all' ? 'All' : priorityFilter === 'prio' ? 'Prio' : 'Non-Prio'}
                    <ChevronDown className="w-4 h-4 ml-1 text-gray-500" />
                  </button>
                  {filterMenuOpen && (
                    <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                      <button
                        onClick={() => {
                          setPriorityFilter('all');
                          setFilterMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-purple-50 hover:text-purple-700 flex items-center space-x-2"
                      >
                        <span className="inline-block w-2 h-2 rounded-full bg-gray-400"></span>
                        <span>All</span>
                      </button>
                      <button
                        onClick={() => {
                          setPriorityFilter('prio');
                          setFilterMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-purple-50 hover:text-purple-700 flex items-center space-x-2"
                      >
                        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: settings.colorPrio }}></span>
                        <span>Prio</span>
                      </button>
                      <button
                        onClick={() => {
                          setPriorityFilter('nonPrio');
                          setFilterMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-purple-50 hover:text-purple-700 flex items-center space-x-2"
                      >
                        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: settings.colorNonPrio }}></span>
                        <span>Non-Prio</span>
                      </button>
                    </div>
                  )}
                </div>
                {/* Owner filter */}
                <div className="relative">
                  <button
                    onClick={() => setOwnerMenuOpen((open) => !open)}
                    className="flex items-center px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-gray-50 hover:bg-purple-50 hover:text-purple-700"
                  >
                    <span className="mr-1">{ownerFilter === 'all' ? 'All Owners' : ownerFilter || 'Unassigned'}</span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                  {ownerMenuOpen && (
                    <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-10 max-h-48 overflow-y-auto text-sm">
                      <button
                        onClick={() => {
                          setOwnerFilter('all');
                          setOwnerMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-purple-50 hover:text-purple-700"
                      >
                        All Owners
                      </button>
                      <button
                        onClick={() => {
                          setOwnerFilter('');
                          setOwnerMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-purple-50 hover:text-purple-700"
                      >
                        Unassigned
                      </button>
                      {distinctOwners.map((owner) => (
                        <button
                          key={owner}
                          onClick={() => {
                            setOwnerFilter(owner);
                            setOwnerMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-purple-50 hover:text-purple-700"
                        >
                          {owner}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setHideCompleted((prev) => !prev)}
                  className="flex items-center px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-gray-50 hover:bg-purple-50 hover:text-purple-700"
                >
                  {hideCompleted ? <EyeOff className="w-4 h-4 mr-1 text-gray-600" /> : <Eye className="w-4 h-4 mr-1 text-gray-600" />}
                  {hideCompleted ? 'Show Done' : 'Hide Done'}
                </button>
                {/* Export and Import buttons moved to Settings */}
                <button
                  onClick={handleGeneratePDF}
                  className="flex items-center px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-gray-50 hover:bg-purple-50 hover:text-purple-700"
                >
                  <FileText className="w-4 h-4 mr-1 text-gray-600" /> PDF
                </button>
                {/* File input moved to Settings */}
                <div className="relative">
                  <button
                    onClick={() => setShowCalendar((prev) => !prev)}
                    className="flex items-center px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-gray-50 hover:bg-purple-50 hover:text-purple-700"
                  >
                    <CalendarIcon className="w-4 h-4 mr-1 text-gray-600" /> Calendar
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
              {/* Tasks grid */}
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {tiles.map((tile) => {
                  const visibleTasks = tile.tasks.filter((task) => {
                    if (hideCompleted && task.done) return false;
                    if (priorityFilter === 'prio' && !task.prio) return false;
                    if (priorityFilter === 'nonPrio' && task.prio) return false;
                    if (ownerFilter !== 'all' && (task.owner || '').toLowerCase() !== ownerFilter.toLowerCase()) return false;
                    if (searchQuery) {
                      const q = searchQuery.toLowerCase();
                      const inLabel = task.label.toLowerCase().includes(q);
                      const inOwner = (task.owner || '').toLowerCase().includes(q);
                      if (!inLabel && !inOwner) return false;
                    }
                    return true;
                  });
                  return (
                      <div
                        key={tile.id}
                        className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex flex-col"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('tile-index', tiles.findIndex((t) => t.id === tile.id));
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const from = parseInt(e.dataTransfer.getData('tile-index'), 10);
                          const to = tiles.findIndex((t) => t.id === tile.id);
                          if (!isNaN(from) && from !== to) reorderTiles(from, to);
                        }}
                      >
                      <div className="flex items-start justify-between mb-2">
                        <input
                          type="text"
                          value={tile.title}
                          onChange={(e) => renameTile(tile.id, e.target.value)}
                          className="font-semibold text-base flex-1 bg-transparent focus:outline-none border-b border-transparent focus:border-gray-300 pb-1"
                        />
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setExpandedTileId(tile.id);
                              setShowExpandedTileModal(true);
                            }}
                            className="p-1 rounded hover:bg-gray-100 text-gray-600"
                            title="Expand"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeTile(tile.id)}
                            className="p-1 rounded hover:bg-red-50 text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
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
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
                                const to = idx;
                                if (from !== to) reorderTasks(tile.id, from, to);
                              }}
                              onDoubleClick={() => {
                                setSelectedTaskInfo({ tileId: tile.id, taskId: task.id });
                                setShowTaskModal(true);
                              }}
                              className="border border-gray-200 rounded-lg p-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 cursor-move"
                            >
                              <div className="flex items-center space-x-3 flex-1">
                                <input
                                  type="checkbox"
                                  checked={task.done}
                                  onChange={() => toggleDone(tile.id, task.id)}
                                  className="accent-purple-600 w-4 h-4"
                                />
                                <span className={`flex-1 text-sm ${task.done ? 'line-through text-gray-400' : ''}`}>{task.label}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => togglePrio(tile.id, task.id)}
                                  className="w-7 h-7 rounded-full flex items-center justify-center border text-white"
                                  style={{ backgroundColor: task.prio ? settings.colorPrio : settings.colorNonPrio }}
                                  title={task.prio ? 'High Priority' : 'Non Priority'}
                                >
                                  <Flag className="w-3 h-3" />
                                </button>
                                <input
                                  type="date"
                                  value={task.date || ''}
                                  onChange={(e) => updateDate(tile.id, task.id, e.target.value)}
                                  className="text-xs border border-gray-300 rounded px-1 py-0.5"
                                />
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
                      <TileChart tasks={tile.tasks} settings={settings} />
                      <div className="flex items-center mt-3">
                        <input
                          type="text"
                          placeholder="Add a task…"
                          value={tile.newTask || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setTiles((prev) => prev.map((t) => (t.id === tile.id ? { ...t, newTask: value } : t)));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addTask(tile.id, tile.newTask || '');
                          }}
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => addTask(tile.id, tile.newTask || '')}
                          className="ml-2 p-2 rounded bg-purple-600 text-white hover:bg-purple-700"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div
                  onClick={addTile}
                  className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-4 text-gray-500 hover:bg-gray-50 cursor-pointer"
                >
                  <Plus className="w-6 h-6 mb-1" />
                  Add Tile
                </div>
              </div>
            </div>
          )}
          {activePage === 'meetings' && (
            <div className="space-y-4">
              {/* Meetings grid */}
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {meetings.map((meeting) => {
                  // Determine display date: use most recent note date or updatedAt
                  let displayDate = '';
                  if (meeting.notes && meeting.notes.length > 0) {
                    const dates = meeting.notes
                      .filter((n) => n.date)
                      .map((n) => n.date);
                    if (dates.length > 0) {
                      displayDate = dates.sort().pop();
                    }
                  }
                  return (
                    <div
                      key={meeting.id}
                      className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex flex-col relative cursor-move"
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData('meeting-index', meetings.findIndex((m) => m.id === meeting.id).toString());
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const from = parseInt(e.dataTransfer.getData('meeting-index'), 10);
                        const to = meetings.findIndex((m) => m.id === meeting.id);
                        if (!isNaN(from) && from !== to) reorderMeetings(from, to);
                      }}
                      onDoubleClick={() => {
                        setSelectedMeetingId(meeting.id);
                        setShowMeetingModal(true);
                      }}
                    >
                      {/* Remove meeting button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this meeting?')) removeMeeting(meeting.id);
                        }}
                        className="absolute top-2 right-2 p-0.5 text-red-500 hover:bg-red-50 rounded"
                        title="Delete meeting"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {/* Meeting header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1 truncate pr-2">
                          {/* Meeting icon */}
                          {(() => {
                            const opt = meetingIconOptions.find((o) => o.key === meeting.icon);
                            const IconComp = opt && opt.Icon;
                            return IconComp ? <IconComp className="w-4 h-4 text-purple-600" /> : null;
                          })()}
                          <div className="font-semibold text-base truncate" title={meeting.title}>{meeting.title || 'Untitled'}</div>
                        </div>
                      </div>
                      {displayDate && <div className="text-xs text-gray-500 mb-2">{displayDate}</div>}
                      {/* Notes preview */}
                      <div className="flex-1 space-y-1 overflow-y-auto mt-1">
                        {meeting.notes.slice(0, 3).map((note) => (
                          <div
                            key={note.id}
                            className="text-xs border-b pb-1 truncate text-gray-600 hover:bg-purple-50 hover:text-purple-700 cursor-pointer"
                            title="Double click to edit"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setCurrentNoteInfo({ meetingId: meeting.id, noteId: note.id });
                              setShowNoteModal(true);
                            }}
                          >
                            {note.date ? `${note.date}: ` : ''}
                            {/* strip html tags from summary */}
                            {note.summary ? note.summary.replace(/<[^>]+>/g, '').slice(0, 40) : 'No summary'}
                          </div>
                        ))}
                        {meeting.notes.length === 0 && <div className="text-xs text-gray-500">No notes yet.</div>}
                      </div>
                      {/* Add note button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentNoteInfo({ meetingId: meeting.id, noteId: null });
                          setShowNoteModal(true);
                        }}
                        className="mt-3 flex items-center justify-center border border-gray-300 rounded-md py-1 text-sm hover:bg-gray-50"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add note
                      </button>
                    </div>
                  );
                })}
                {/* Add meeting tile */}
                <div
                  onClick={() => {
                    const newMeeting = { id: generateId('meeting'), title: 'New Meeting', notes: [], updatedAt: Date.now() };
                    setMeetings((prev) => [...prev, newMeeting]);
                    setSelectedMeetingId(newMeeting.id);
                    setShowMeetingModal(true);
                  }}
                  className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-4 text-gray-500 hover:bg-gray-50 cursor-pointer"
                >
                  <Plus className="w-6 h-6 mb-1" />
                  Add Meeting
                </div>
              </div>
              {showMeetingModal && selectedMeetingId && (
                <MeetingModal
                  meeting={meetings.find((m) => m.id === selectedMeetingId)}
                  renameMeeting={renameMeeting}
                  updateMeetingIcon={updateMeetingIcon}
                  setShowNoteModal={setShowNoteModal}
                  setCurrentNoteInfo={setCurrentNoteInfo}
                  removeAttachment={removeAttachment}
                  addMeetingAttachment={addMeetingAttachment}
                  settings={settings}
                  onClose={() => setShowMeetingModal(false)}
                />
              )}
            </div>
          )}
          {activePage === 'settings' && (
            <SettingsPage
              settings={settings}
              setSettings={setSettings}
              dirHandle={dirHandle}
              chooseDataFolder={chooseDataFolder}
              clearDataFolder={clearDataFolder}
              handleExport={handleExport}
              triggerImport={triggerImport}
              fileInputRef={fileInputRef}
              handleImport={handleImport}
              cloudSyncEnabled={cloudSyncEnabled}
              setCloudSyncEnabled={setCloudSyncEnabled}
              pushToDrive={pushToDrive}
              pullFromDrive={pullFromDrive}
              tokenInfo={tokenInfo}
              setTokenInfo={setTokenInfo}
            />
          )}
          {activePage === 'ai' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <h2 className="text-2xl font-semibold">AI Assistant</h2>
              {/* Token counter showing remaining tokens. Colours change based on remaining percentage. */}
              {(() => {
                const left = tokenInfo.total - tokenInfo.used;
                const ratio = tokenInfo.total > 0 ? left / tokenInfo.total : 0;
                let colour = 'text-green-600';
                if (ratio < 0.15) colour = 'text-red-600';
                else if (ratio < 0.2) colour = 'text-orange-600';
                const percent = Math.round(ratio * 100);
                return (
                  <div className={`text-xs font-medium ${colour}`}>
                    Available tokens {left} / {tokenInfo.total} ({percent}%)
                  </div>
                );
              })()}
              {/* Analyze card */}
              <div className="bg-white rounded-xl border border-purple-300 shadow-[0_0_10px_rgba(147,112,219,0.3)] p-5 space-y-4">
                <h3 className="text-lg font-semibold">Analyze Tasks & Meetings</h3>
                <p className="text-sm text-gray-600">Select one or more task tiles and meetings to analyze. Provide your OpenAI API key in Settings.</p>
                <div className="flex flex-wrap items-start space-y-3 md:space-y-0 md:space-x-3">
                  {/* Tasks selection */}
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-600 mb-1">Tasks</span>
                    <select
                      multiple
                      value={analysisTileIds}
                      onChange={(e) => {
                        const options = Array.from(e.target.selectedOptions).map((o) => o.value);
                        setAnalysisTileIds(options);
                      }}
                      className="border border-gray-300 rounded px-3 py-1 text-sm h-28 overflow-y-auto min-w-[8rem] hover:border-purple-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    >
                      {tiles.map((tile) => (
                        <option
                          key={tile.id}
                          value={tile.id}
                          className="hover:bg-purple-50 hover:text-purple-700"
                        >
                          {tile.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Meetings selection */}
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-600 mb-1">Meetings</span>
                    <select
                      multiple
                      value={analysisMeetingIds}
                      onChange={(e) => {
                        const options = Array.from(e.target.selectedOptions).map((o) => o.value);
                        setAnalysisMeetingIds(options);
                      }}
                      className="border border-gray-300 rounded px-3 py-1 text-sm h-28 overflow-y-auto min-w-[8rem] hover:border-purple-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    >
                      {meetings.map((m) => (
                        <option
                          key={m.id}
                          value={m.id}
                          className="hover:bg-purple-50 hover:text-purple-700"
                        >
                          {m.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Optional free-text instructions for AI, shown when enabled in Settings */}
                  {settings.aiFreeText && (
                    <input
                      type="text"
                      placeholder="Instructions…"
                      value={analysisInstructions}
                      onChange={(e) => setAnalysisInstructions(e.target.value)}
                      className="border border-gray-300 rounded px-3 py-1 text-sm flex-1 hover:border-purple-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 animate-pulse"
                    />
                  )}
                  {/* Analyze button */}
                  <div className="flex flex-col justify-end">
                    <button
                      onClick={analyzeAI}
                      disabled={analysisLoading || (analysisTileIds.length === 0 && analysisMeetingIds.length === 0)}
                      className="px-4 py-1.5 rounded text-sm text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {analysisLoading ? 'Analyzing…' : 'Analyze'}
                    </button>
                    {/* PDF summary button shown when AI result is available and enabled */}
                    {analysisResult && settings.aiPdf && (
                      <button
                        onClick={generateAIPdf}
                        className="mt-2 px-4 py-1.5 rounded text-sm text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                      >
                        PDF Summary
                      </button>
                    )}
                  </div>
                </div>
                {analysisLoading && (
                  <div className="mt-4 p-4 border rounded-md bg-purple-50">
                    <div className="animate-pulse space-y-2">
                      <div className="h-3 bg-purple-200 rounded w-full"></div>
                      <div className="h-3 bg-purple-200 rounded w-4/5"></div>
                      <div className="h-3 bg-purple-200 rounded w-2/3"></div>
                    </div>
                    <p className="mt-3 text-sm text-purple-600">Analyzing with OpenAI…</p>
                  </div>
                )}
                {analysisResult && !analysisLoading && (
                  <div className="mt-4 p-4 border rounded-md bg-gray-50 space-y-3 border-purple-300 shadow-[0_0_10px_rgba(147,112,219,0.5)]">
                    <h3 className="font-semibold">AI Summary</h3>
                    <div
                      className="whitespace-pre-wrap text-sm text-gray-800"
                      dangerouslySetInnerHTML={{ __html: formatAnalysisResult(analysisResult) }}
                    ></div>
                    {/* Play summary button shown only if enabled in settings */}
                    {settings.aiPlay && (
                      <button
                        onClick={playAudio}
                        className="flex items-center space-x-2 px-3 py-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                      >
                        <span>Play Summary</span>
                      </button>
                    )}
                    {analysisAudioUrl && settings.aiPlay && (
                      <audio src={analysisAudioUrl} controls className="mt-2 w-full"></audio>
                    )}
                  </div>
                )}
              </div>
              {/* Action plan generator card */}
              {settings.aiActionPlan && (
                <div className="bg-white rounded-xl border border-purple-300 shadow-[0_0_10px_rgba(147,112,219,0.3)] p-5 space-y-4">
                  <h3 className="text-lg font-semibold">Generate Action Plan for This Week</h3>
                  <p className="text-sm text-gray-600">This action plan uses all available tasks and meeting notes and may consume a large number of tokens.</p>
                  <div className="flex flex-col md:flex-row md:space-x-4 space-y-2 md:space-y-0">
                    <button
                      onClick={generateActionPlan}
                      disabled={actionPlanLoading}
                      className="flex-1 px-4 py-1.5 rounded text-sm text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionPlanLoading ? 'Planning…' : 'Generate Action Plan for This Week'}
                    </button>
                    {settings.aiPdf && actionPlanResult && !actionPlanLoading && (
                      <button
                        onClick={generateActionPlanPdf}
                        className="flex-1 px-4 py-1.5 rounded text-sm text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                      >
                        PDF Plan
                      </button>
                    )}
                    {settings.aiPlay && actionPlanResult && !actionPlanLoading && (
                      <button
                        onClick={playActionPlanAudio}
                        className="flex-1 px-4 py-1.5 rounded text-sm text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                      >
                        Play Plan
                      </button>
                    )}
                  </div>
                  {actionPlanLoading && (
                    <div className="mt-4 p-4 border rounded-md bg-purple-50">
                      <div className="animate-pulse space-y-2">
                        <div className="h-3 bg-purple-200 rounded w-full"></div>
                        <div className="h-3 bg-purple-200 rounded w-4/5"></div>
                        <div className="h-3 bg-purple-200 rounded w-2/3"></div>
                      </div>
                      <p className="mt-3 text-sm text-purple-600">Generating action plan…</p>
                    </div>
                  )}
                  {actionPlanResult && !actionPlanLoading && (
                    <div className="mt-4 p-4 border rounded-md bg-gray-50 space-y-3 border-purple-300 shadow-[0_0_10px_rgba(147,112,219,0.5)]">
                      <h3 className="font-semibold">Action Plan</h3>
                      <div
                        className="whitespace-pre-wrap text-sm text-gray-800"
                        dangerouslySetInnerHTML={{ __html: formatAnalysisResult(actionPlanResult) }}
                      ></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {showTaskModal && selectedTaskInfo && (
          <TaskModal
            tileId={selectedTaskInfo.tileId}
            taskId={selectedTaskInfo.taskId}
            tiles={tiles}
            updateTask={updateTask}
            onClose={() => setShowTaskModal(false)}
          />
        )}

        {/* Expanded tile modal */}
        {showExpandedTileModal && expandedTileId && (
          <ExpandedTileModal
            tile={tiles.find((t) => t.id === expandedTileId)}
            renameTile={renameTile}
            reorderTasks={reorderTasks}
            updateTask={updateTask}
            addTask={addTask}
            removeTask={removeTask}
            togglePrio={togglePrio}
            toggleDone={toggleDone}
            updateDate={updateDate}
            onClose={() => setShowExpandedTileModal(false)}
          />
        )}
        {showMeetingModal && selectedMeetingId && activePage !== 'meetings' && (
          // When not on the Meetings page we still need the modal overlay to view/edit notes
          <MeetingModal
            meeting={meetings.find((m) => m.id === selectedMeetingId)}
            renameMeeting={renameMeeting}
            updateMeetingIcon={updateMeetingIcon}
            setShowNoteModal={setShowNoteModal}
            setCurrentNoteInfo={setCurrentNoteInfo}
            removeAttachment={removeAttachment}
            addMeetingAttachment={addMeetingAttachment}
            settings={settings}
            onClose={() => setShowMeetingModal(false)}
          />
        )}
        {showNoteModal && currentNoteInfo && (
          <NoteModal
            meeting={meetings.find((m) => m.id === currentNoteInfo.meetingId)}
            note={(() => {
              const meeting = meetings.find((m) => m.id === currentNoteInfo.meetingId);
              if (!meeting) return null;
              return meeting.notes.find((n) => n.id === currentNoteInfo.noteId);
            })()}
            addNote={addNote}
            updateNote={updateNote}
            removeNote={removeNote}
            onClose={() => setShowNoteModal(false)}
            settings={settings}
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