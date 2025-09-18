import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, FolderPlus, CalendarPlus, Send, Check, X } from 'lucide-react';
import { StorageService } from '../../shared/services';
import { STORAGE_KEYS } from '../../shared/utils';
import { buildProjectContext } from '../../shared/utils';

const AGENT_STORE_VERSION = 1;

const AgentPage = ({ projects, tiles, meetings, selectedProjectId, createTask, settings }) => {
  const listRef = useRef(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [contextProjectId, setContextProjectId] = useState(selectedProjectId || 'proj-default');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [includeMeetings, setIncludeMeetings] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedMeetingIds, setSelectedMeetingIds] = useState([]);
  const [transcriptText, setTranscriptText] = useState('');

  // Restore persisted chat
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEYS.AGENT_CHAT);
      const saved = raw ? JSON.parse(raw) : null;
      if (saved && saved.version === AGENT_STORE_VERSION) {
        setMessages(saved.messages || []);
        setContextProjectId(saved.contextProjectId || selectedProjectId || 'proj-default');
        setIncludeMeetings(saved.includeMeetings ?? true);
        setSelectedMeetingIds(saved.selectedMeetingIds || []);
        setTranscriptText(saved.transcriptText || '');
      } else {
        setMessages([{ id: `a-${Date.now()}`, role: 'assistant', text: 'Hi! Ask me to suggest tasks for your current project.' }]);
        setContextProjectId(selectedProjectId || 'proj-default');
        setIncludeMeetings(true);
        setSelectedMeetingIds([]);
        setTranscriptText('');
      }
    } catch {
      setMessages([{ id: `a-${Date.now()}`, role: 'assistant', text: 'Hi! Ask me to suggest tasks for your current project.' }]);
      setContextProjectId(selectedProjectId || 'proj-default');
      setIncludeMeetings(true);
      setSelectedMeetingIds([]);
      setTranscriptText('');
    }
  }, [selectedProjectId]);

  // Persist chat
  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEYS.AGENT_CHAT,
        JSON.stringify({ version: AGENT_STORE_VERSION, messages, contextProjectId, includeMeetings, selectedMeetingIds, transcriptText })
      );
    } catch {}
  }, [messages, contextProjectId, includeMeetings, selectedMeetingIds, transcriptText]);

  // Auto-scroll
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const pushMessage = (msg) => setMessages((prev) => [...prev, msg]);
  const replaceMessage = (id, updater) => setMessages((prev) => prev.map(m => (m.id === id ? updater(m) : m)));

  const askLLM = async (userText) => {
    const apiKey = settings?.apiKey?.trim();
    if (!apiKey) {
      pushMessage({ id: `a-${Date.now()}`, role: 'assistant', text: 'Please add your OpenAI API key in Settings.' });
      return;
    }
    const meetingsForContext = (includeMeetings ? meetings : [])
      .filter(m => m.projectId === contextProjectId)
      .filter(m => selectedMeetingIds.length === 0 ? true : selectedMeetingIds.includes(m.id))
      .map(m => ({ ...m }));
    if (transcriptText.trim()) {
      meetingsForContext.push({ id: `transcript-${Date.now()}`, title: 'Uploaded Transcript', projectId: contextProjectId, notes: [{ date: new Date().toISOString().slice(0,10), attendance: '', summary: transcriptText, actions: '' }] });
    }
    const ctx = buildProjectContext(contextProjectId, tiles, meetingsForContext);
    const system = [
      'You are a concise planning assistant in a dark UI task manager.',
      'When user intent is ambiguous, ask a short follow-up question (one line).',
      'When ready to propose tasks, reply with a JSON block only (no prose) using this schema:',
      '{"tasks":[{"label":"...","description":"...","owner":"","dueDate":"YYYY-MM-DD","priority":"low|normal|high|urgent","status":"todo|in-progress|review|done","category":"","tags":["..."]}]}',
      'Keep labels short. Prefer due dates within the next 2–4 weeks when relevant.'
    ].join(' ');

    const history = messages
      .filter(m => !m.suggestions && m.text)
      .map(m => ({ role: m.role, content: m.text }));

    const user = `Selected Project: ${(projects.find(p => p.id === contextProjectId)?.name) || contextProjectId}\nInclude meetings: ${includeMeetings}\nProject Context JSON:\n${JSON.stringify(ctx)}\n---\nUser: ${userText}\nIf confident, output JSON only. Otherwise, ask one brief question.`;

    const thinkingId = `t-${Date.now()}`;
    pushMessage({ id: thinkingId, role: 'assistant', text: 'Thinking…', thinking: true });
    setLoading(true);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.4,
          messages: [
            { role: 'system', content: system },
            ...history,
            { role: 'user', content: user }
          ]
        })
      });
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || '';
      const json = extractJson(content);
      const tasks = Array.isArray(json?.tasks) ? json.tasks : [];
      if (tasks.length) {
        replaceMessage(thinkingId, () => ({ id: thinkingId, role: 'assistant', text: 'I suggested some tasks below.' }));
        pushMessage({ id: `s-${Date.now()}`, role: 'assistant', suggestions: sanitizeTasks(tasks) });
      } else {
        // Treat as a follow-up question or answer
        replaceMessage(thinkingId, () => ({ id: thinkingId, role: 'assistant', text: content || 'Could you clarify what you need?' }));
      }
    } catch (err) {
      replaceMessage(thinkingId, () => ({ id: thinkingId, role: 'assistant', text: `Error: ${err.message}` }));
    } finally {
      setLoading(false);
    }
  };

  const sanitizeTasks = (arr) => arr.map((t, i) => ({
    id: t.id || `sg-${Date.now()}-${i}`,
    label: (t.label || '').toString().slice(0, 200),
    description: (t.description || '').toString().slice(0, 1000),
    owner: t.owner || '',
    dueDate: t.dueDate || '',
    priority: ['low', 'normal', 'high', 'urgent'].includes(t.priority) ? t.priority : 'normal',
    status: ['todo', 'in-progress', 'review', 'done'].includes(t.status) ? t.status : 'todo',
    category: t.category || '',
    tags: Array.isArray(t.tags) ? t.tags.slice(0, 10) : [],
  }));

  const extractJson = (text) => {
    try { return JSON.parse(text); } catch (_) { /* fallthrough */ }
    const match = text.match(/\{[\s\S]*\}$/m) || text.match(/```json[\s\S]*?```/m);
    if (!match) return null;
    const raw = match[0].startsWith('```') ? match[0].replace(/```json|```/g, '') : match[0];
    try { return JSON.parse(raw); } catch { return null; }
  };

  const onAccept = (messageId, taskId) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId || !m.suggestions) return m;
      const s = m.suggestions.find(x => x.id === taskId);
      if (s) {
        createTask({
          label: s.label,
          description: s.description || '',
          owner: s.owner || '',
          dueDate: s.dueDate || null,
          priority: s.priority || 'normal',
          status: s.status || 'todo',
          category: s.category || '',
          tags: s.tags || [],
          projectId: contextProjectId || selectedProjectId || 'proj-default',
        });
      }
      return { ...m, suggestions: m.suggestions.filter(x => x.id !== taskId) };
    }));
  };

  const onDecline = (messageId, taskId) => {
    setMessages(prev => prev.map(m => (m.id === messageId && m.suggestions)
      ? { ...m, suggestions: m.suggestions.filter(x => x.id !== taskId) }
      : m
    ));
  };

  const send = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    pushMessage({ id: `u-${Date.now()}`, role: 'user', text: trimmed, projectId: contextProjectId });
    setInput('');
    await askLLM(trimmed);
  };

  const currentProject = projects.find(p => p.id === contextProjectId);
  const projectMeetings = meetings.filter(m => m.projectId === contextProjectId);

  const htmlEscape = (s) => (s || '').replace(/[&<>]/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]));
  const mdToHtml = (src) => {
    if (!src) return '';
    let text = src.replace(/```([\s\S]*?)```/g, (m, code) => `<div class="code-wrap"><button class="code-copy" data-code="${htmlEscape(code)}">Copy</button><pre><code>${htmlEscape(code)}</code></pre></div>`);
    text = text.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    text = text.replace(/(?:^|\n)(-\s.+(?:\n-\s.+)*)/g, (block) => {
      const items = block.split(/\n/).filter(l=>l.trim().startsWith('- ')).map(l=>`<li>${htmlEscape(l.trim().slice(2))}</li>`).join('');
      return items ? `\n<ul>${items}</ul>` : block;
    });
    return text.replace(/\n/g, '\n');
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-0 dark:bg-[#0F1115] dark:border dark:border-gray-800">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h2 className="text-sm font-medium tracking-wide text-gray-600 dark:text-gray-300">AI Agent</h2>
      </div>
      <div className="h-[60vh] flex flex-col">
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fafafa] dark:bg-[#1E1E1E]">
          {messages.map((m) => (
            m.suggestions ? (
              <div key={m.id} className="max-w-[80%] self-end p-0.5">
                <div className="rounded-lg p-2 bg-transparent">
                  <div className="text-[11px] mb-2 text-gray-500 dark:text-gray-400">Suggested tasks</div>
                  <div className="space-y-1.5">
                    {m.suggestions.map(s => (
                      <div key={s.id} className="rounded-md p-2 text-[12px] bg-white/5 dark:bg-white/5 border border-white/10">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{s.label}</div>
                          <div className="flex items-center gap-1.5">
                            <button className="px-2 py-1 rounded-full bg-emerald-500/90 text-white hover:bg-emerald-400 shadow-sm ring-0 hover:ring-2 hover:ring-emerald-400/30 transition" onClick={() => onAccept(m.id, s.id)} title="Add">
                              <span className="sr-only">Add</span>
                              <Check className="w-4 h-4" />
                            </button>
                            <button className="px-2 py-1 rounded-full bg-rose-500/90 text-white hover:bg-rose-400 shadow-sm ring-0 hover:ring-2 hover:ring-rose-400/30 transition" onClick={() => onDecline(m.id, s.id)} title="Remove">
                              <span className="sr-only">Remove</span>
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {s.description && <div className="mt-1 text-[11px] text-gray-300">{s.description}</div>}
                        <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-400">
                          {s.owner && <span>Owner: {s.owner}</span>}
                          {s.dueDate && <span>Due: {s.dueDate}</span>}
                          {s.priority && <span className="capitalize">Priority: {s.priority}</span>}
                          {s.category && <span>Phase: {s.category}</span>}
                          {Array.isArray(s.tags) && s.tags.length > 0 && (
                            <span>Tags: {s.tags.join(', ')}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {m.suggestions.length === 0 && (
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">No pending suggestions.</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={m.id}
                className={`max-w-[70%] px-0 py-0 text-[13px] chat-content ${m.thinking ? 'italic text-gray-400 dark:text-gray-300/70 animate-thinking self-end' : m.role === 'assistant' ? 'self-end text-[#F5F5F5]' : 'self-start text-[#E0E0E0]'}`}
                dangerouslySetInnerHTML={{ __html: m.thinking ? (m.text) : mdToHtml(m.text) }}
              />
            )
          ))}
        </div>
        <form onSubmit={send} className="p-3 border-t border-gray-200 dark:border-gray-800 flex gap-2 items-center">
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen(v => !v)}
              className="px-2 py-2 rounded-md border border-gray-300 text-gray-900 bg-white hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:bg-[#1A1D24] dark:hover:bg-[#232734]"
              title="Select project context"
            >
              <Plus className="w-4 h-4" />
            </button>
            {pickerOpen && (
              <div className="absolute left-0 bottom-12 w-80 bg-[#1E1E1E] text-gray-100 border border-gray-700 rounded-lg shadow-xl z-20 p-2 space-y-2 text-sm">
                <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-gray-400">Project</div>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setContextProjectId(p.id); setSelectedMeetingIds([]); }}
                    className={`w-full text-left px-2 py-1 rounded-md hover:bg-[#23262d] ${contextProjectId === p.id ? 'bg-[#23262d]' : ''}`}
                  >
                    <span className="inline-flex items-center gap-2"><FolderPlus className="w-3.5 h-3.5" /> {p.name}</span>
                  </button>
                ))}

                <div className="px-2 pt-2 mt-2 border-t border-gray-700 text-[11px] uppercase tracking-wide text-gray-400">Meetings</div>
                <div className="max-h-44 overflow-auto space-y-1">
                  {projectMeetings.length === 0 && (
                    <div className="px-2 py-1 text-gray-500">No meetings in this project</div>
                  )}
                  {projectMeetings.map(m => {
                    const active = selectedMeetingIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMeetingIds(prev => active ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                        className={`w-full text-left px-2 py-1 rounded-md hover:bg-[#23262d] ${active ? 'bg-[#23262d]' : ''}`}
                      >
                        {m.title}
                      </button>
                    );
                  })}
                </div>

                <div className="px-2 pt-2 mt-2 border-t border-gray-700 text-[11px] uppercase tracking-wide text-gray-400">Upload Transcript</div>
                <div className="flex items-center gap-2 px-2 pb-1">
                  <input type="file" accept="text/plain" className="hidden" id="agent-transcript-input" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = () => setTranscriptText(String(reader.result || ''));
                    reader.readAsText(f);
                  }} />
                  <button type="button" onClick={() => document.getElementById('agent-transcript-input').click()} className="px-2 py-1 rounded-md bg-[#23262d] hover:bg-[#2b2f37]">Choose .txt</button>
                  {transcriptText && <span className="text-[11px] text-emerald-400">Attached</span>}
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setPickerOpen(false)} className="px-2 py-1 rounded-md bg-[#23262d] hover:bg-[#2b2f37]">Done</button>
                </div>
              </div>
            )}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }}
            rows={1}
            className="flex-1 rounded-2xl border border-gray-700 px-4 py-2 text-sm bg-[#1E1E1E] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
            placeholder={`Type a message… (${currentProject ? currentProject.name : 'No project selected'})`}
          />
          <button disabled={loading} type="submit" className="p-2 rounded-full bg-emerald-500/90 text-white hover:bg-emerald-400 shadow-sm transition">
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="px-3 pb-3 text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-300 dark:border-gray-700">Auto</span>
          {currentProject && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-300 dark:border-gray-700">Project: {currentProject.name}</span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-300 dark:border-gray-700">Meetings: {includeMeetings ? 'On' : 'Off'}</span>
        </div>
      </div>
    </div>
  );
};

export default AgentPage;
