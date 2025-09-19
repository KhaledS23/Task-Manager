import React, { useMemo, useRef, useState } from 'react';
import {
  Sun,
  Moon,
  Plus,
  Trash2,
  ArrowLeft,
  UploadCloud,
  DownloadCloud,
  FolderOpen,
  RefreshCw,
  Palette,
} from 'lucide-react';
import { StorageService } from '../../shared/services';
import { STORAGE_KEYS } from '../../shared/utils';

const DEFAULT_PHASES = ['Conceptual', 'Design', 'Validation', 'Startup'];

const SettingsPage = ({
  settings,
  setSettings,
  onNavigateBack,
  attachmentDirStatus,
  attachmentDirName,
  onChooseAttachmentDirectory,
  onClearAttachmentDirectory,
  onRetryAttachmentPermission,
}) => {
  const fileInputRef = useRef(null);
  const restoreInputRef = useRef(null);
  const [logoPreview, setLogoPreview] = useState(settings.logo || null);
  const [phaseDraft, setPhaseDraft] = useState('');

  const phases = useMemo(() => {
    const list = Array.isArray(settings?.phases) ? settings.phases.filter(Boolean) : [];
    return list.length ? list : DEFAULT_PHASES;
  }, [settings?.phases]);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setLogoPreview(dataUrl);
      setSettings((prev) => ({ ...prev, logo: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleThemeChange = (theme) => {
    setSettings((prev) => ({ ...prev, theme }));
  };

  const handleBackup = () => {
    const payload = StorageService.get(STORAGE_KEYS.WORK_CHECKLIST, {
      tiles: [],
      meetings: [],
      projects: [],
      settings,
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'work-checklist-backup.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        StorageService.set(STORAGE_KEYS.WORK_CHECKLIST, data);
        if (confirm('Backup restored. Reload app to apply?')) {
          window.location.reload();
        }
      } catch (err) {
        alert('Invalid backup file');
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if (!confirm('This clears all app data from local storage. Continue?')) return;
    StorageService.remove(STORAGE_KEYS.WORK_CHECKLIST);
    StorageService.remove(STORAGE_KEYS.TOKENS);
    window.location.reload();
  };

  const handlePhaseAdd = () => {
    const value = phaseDraft.trim();
    if (!value) return;
    if (phases.some((phase) => phase.toLowerCase() === value.toLowerCase())) {
      alert('Phase already exists.');
      return;
    }
    setSettings((prev) => ({
      ...prev,
      phases: [...phases, value],
    }));
    setPhaseDraft('');
  };

  const handlePhaseRemove = (phase) => {
    if (phases.length <= 1) {
      alert('Keep at least one phase.');
      return;
    }
    if (!confirm(`Remove phase "${phase}"? Existing tasks keep their current value.`)) return;
    setSettings((prev) => ({
      ...prev,
      phases: phases.filter((p) => p !== phase),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Workspace Settings</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Customize the experience for everyone using this app.</p>
        </div>
        <button
          onClick={onNavigateBack}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-[#1A1D24] dark:hover:text-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to timeline
        </button>
      </div>

      <div className="grid gap-6">
        {/* Appearance */}
        <section className="rounded-xl border border-gray-200 bg-white navy-surface p-6 shadow-sm dark:border-gray-800 dark:bg-[#0F1115]">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Switch between light, dark, or evening-friendly comfort mode.</p>
            </div>
            <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-[#1A1D24]">
              <button
                onClick={() => handleThemeChange('light')}
                className={`flex items-center gap-1 rounded-md px-3 py-1 text-sm font-medium transition ${
                  settings.theme === 'light'
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-[#2B2F3A] dark:text-indigo-300'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100'
                }`}
              >
                <Sun className="w-4 h-4" />
                Light
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`ml-1 flex items-center gap-1 rounded-md px-3 py-1 text-sm font-medium transition ${
                  settings.theme === 'dark'
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-[#2B2F3A] dark:text-indigo-300'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100'
                }`}
              >
                <Moon className="w-4 h-4" />
                Dark
              </button>
              <button
                onClick={() => handleThemeChange('navy')}
                className={`ml-1 flex items-center gap-1 rounded-md px-3 py-1 text-sm font-medium transition ${
                  settings.theme === 'navy'
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-[#2B2F3A] dark:text-indigo-300'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100'
                }`}
              >
                <Palette className="w-4 h-4" />
                Comfort
              </button>
            </div>
          </div>
        </section>

        {/* Brand */}
        <section className="rounded-xl border border-gray-200 bg-white navy-surface p-6 shadow-sm dark:border-gray-800 dark:bg-[#0F1115]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Brand</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Upload a logo to personalize the workspace.</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-[#1A1D24]">
              {logoPreview ? (
                <img src={logoPreview} alt="Workspace logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-xs text-gray-400">No Logo</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-[#1A1D24]"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Logo
              </button>
              {logoPreview && (
                <button
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-900/30"
                  onClick={() => {
                    setLogoPreview(null);
                    setSettings((prev) => ({ ...prev, logo: null }));
                  }}
                >
                  Remove
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>
          </div>
        </section>

        {/* Phases */}
        <section className="rounded-xl border border-gray-200 bg-white navy-surface p-6 shadow-sm dark:border-gray-800 dark:bg-[#0F1115]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Task Phases</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Define the phases available when creating or editing tasks.</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {phases.map((phase) => (
              <span
                key={phase}
                className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/30 dark:text-indigo-200"
              >
                {phase}
                <button
                  type="button"
                  className="p-1 text-indigo-500 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-100"
                  onClick={() => handlePhaseRemove(phase)}
                  aria-label={`Remove phase ${phase}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
            {!phases.length && <span className="text-sm text-gray-500">No phases yet</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={phaseDraft}
              onChange={(e) => setPhaseDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handlePhaseAdd();
                }
              }}
              placeholder="Add a phase"
              className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-[#1A1D24] dark:text-gray-100 dark:focus:ring-indigo-500/40"
            />
            <button
              type="button"
              onClick={handlePhaseAdd}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              <Plus className="w-4 h-4" />
              Add phase
            </button>
          </div>
        </section>

        {/* Attachment storage */}
        <section className="rounded-xl border border-gray-200 bg-white navy-surface p-6 shadow-sm dark:border-gray-800 dark:bg-[#0F1115]">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Attachment Storage</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Select a local folder where meeting and project files will be stored.</p>
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                  attachmentDirStatus === 'granted'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800/60'
                    : attachmentDirStatus === 'denied'
                    ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/60'
                    : 'border-gray-300 bg-gray-50 text-gray-600 dark:bg-[#1A1D24] dark:text-gray-300 dark:border-gray-700'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                {attachmentDirStatus === 'granted' && (attachmentDirName || 'Folder linked')}
                {attachmentDirStatus === 'denied' && 'Permission needed'}
                {attachmentDirStatus === 'not-configured' && 'No folder selected'}
                {attachmentDirStatus === 'checking' && 'Checking access…'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-[#1A1D24]"
                onClick={onChooseAttachmentDirectory}
              >
                <FolderOpen className="w-4 h-4" />
                Choose Folder
              </button>
              {attachmentDirStatus === 'denied' && (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-600 transition hover:bg-amber-50 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/30"
                  onClick={onRetryAttachmentPermission}
                >
                  <RefreshCw className="w-4 h-4" />
                  Re-authorize
                </button>
              )}
              {attachmentDirStatus !== 'not-configured' && (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-900/30"
                  onClick={onClearAttachmentDirectory}
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Link
                </button>
              )}
            </div>
          </div>
        </section>

        {/* API Keys */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0F1115] space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Integration</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Store credentials locally for OpenAI actions and DeepL translation.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                OpenAI API Key
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={settings.apiKey || ''}
                  onChange={(e) => setSettings((prev) => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="sk-..."
                  className="flex-1 min-w-[220px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-[#1A1D24] dark:text-gray-100 dark:focus:ring-indigo-500/40"
                />
                <span className="text-[11px] text-gray-500 dark:text-gray-400">Stored locally</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                DeepL API Key
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={settings.deeplApiKey || ''}
                  onChange={(e) => setSettings((prev) => ({ ...prev, deeplApiKey: e.target.value }))}
                  placeholder="deepl-xxxxxxxx"
                  className="flex-1 min-w-[220px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-[#1A1D24] dark:text-gray-100 dark:focus:ring-indigo-500/40"
                />
                <span className="text-[11px] text-gray-500 dark:text-gray-400">Write & Translate</span>
              </div>
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Required to use the DeepL workspace in this app.</p>
            </div>
          </div>
        </section>

        {/* Supabase */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0F1115]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Supabase Sync</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Configure optional cloud backup and sync.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-500">Supabase URL</label>
              <input
                type="text"
                value={settings.supabaseUrl || ''}
                onChange={(e) => setSettings((prev) => ({ ...prev, supabaseUrl: e.target.value }))}
                placeholder="https://xxxxxxxx.supabase.co"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-[#1A1D24] dark:text-gray-100 dark:focus:ring-indigo-500/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-500">Anon Key</label>
              <input
                type="password"
                value={settings.supabaseAnonKey || ''}
                onChange={(e) => setSettings((prev) => ({ ...prev, supabaseAnonKey: e.target.value }))}
                placeholder="eyJhbGciOi..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-[#1A1D24] dark:text-gray-100 dark:focus:ring-indigo-500/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-500">Workspace ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.supabaseWorkspaceId || ''}
                  onChange={(e) => setSettings((prev) => ({ ...prev, supabaseWorkspaceId: e.target.value }))}
                  placeholder="e.g., my-workspace-1"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-[#1A1D24] dark:text-gray-100 dark:focus:ring-indigo-500/40"
                />
                <button
                  onClick={() => setSettings((prev) => ({ ...prev, supabaseWorkspaceId: `ws-${Date.now().toString(36)}` }))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-[#1A1D24]"
                >
                  Generate
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-500">Status</label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={!!settings.supabaseEnabled}
                  onChange={(e) => setSettings((prev) => ({ ...prev, supabaseEnabled: e.target.checked }))}
                />
                Enable cloud sync
              </label>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-[#1A1D24]"
              onClick={async () => {
                try {
                  const saved = StorageService.get(STORAGE_KEYS.WORK_CHECKLIST, {});
                  const mod = await import('../../shared/services/cloud/supabase');
                  await mod.supabasePushState(settings, saved);
                  alert('Pushed to Supabase successfully.');
                } catch (err) {
                  alert('Push failed: ' + err.message);
                }
              }}
            >
              <UploadCloud className="w-4 h-4" /> Push to Supabase
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-[#1A1D24]"
              onClick={async () => {
                try {
                  const mod = await import('../../shared/services/cloud/supabase');
                  const remote = await mod.supabasePullState(settings);
                  if (!remote?.data) {
                    alert('No remote state found.');
                    return;
                  }
                  StorageService.set(STORAGE_KEYS.WORK_CHECKLIST, remote.data);
                  if (confirm('Pulled from Supabase. Reload to apply?')) window.location.reload();
                } catch (err) {
                  alert('Pull failed: ' + err.message);
                }
              }}
            >
              <DownloadCloud className="w-4 h-4" /> Pull from Supabase
            </button>
          </div>
        </section>

        {/* Storage */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0F1115]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Local Storage</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Back up or restore your workspace data.</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-[#1A1D24]"
              onClick={handleBackup}
            >
              <DownloadCloud className="w-4 h-4" /> Download Backup
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-[#1A1D24]"
              onClick={() => restoreInputRef.current?.click()}
            >
              <UploadCloud className="w-4 h-4" /> Restore Backup
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-900/30"
              onClick={handleClear}
            >
              <Trash2 className="w-4 h-4" /> Clear All Data
            </button>
            <input ref={restoreInputRef} type="file" accept="application/json" className="hidden" onChange={handleRestore} />
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
