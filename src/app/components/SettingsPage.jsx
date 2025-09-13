import React, { useRef, useState } from 'react';
import { StorageService } from '../../shared/services';
import { STORAGE_KEYS } from '../../shared/utils';

const SettingsPage = ({ settings, setSettings, tokenInfo, setTokenInfo, onClose }) => {
  const fileInputRef = useRef(null);
  const restoreInputRef = useRef(null);
  const [logoPreview, setLogoPreview] = useState(settings.logo || null);

  const handleLogoChange = async (e) => {
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
    const a = document.createElement('a');
    a.href = url;
    a.download = 'work-checklist-backup.json';
    a.click();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-2xl shadow-2xl bg-white text-gray-900 p-6 dark:bg-[#0F1115] dark:text-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button onClick={onClose} className="px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-[#1A1D24] dark:hover:bg-[#232734]">Close</button>
        </div>

        <div className="space-y-8 text-sm">
          {/* OpenAI API Key */}
          <section>
            <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">OpenAI API Key</h3>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={settings.apiKey || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="sk-..."
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 bg-white dark:bg-[#0F1115] dark:border-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">Stored locally</span>
            </div>
          </section>
          {/* Logo */}
          <section>
            <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Brand</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden dark:bg-[#1A1D24]">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="object-contain max-w-full max-h-full" />
                ) : (
                  <span className="text-gray-400">No Logo</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-[#1A1D24] dark:hover:bg-[#232734]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select Logo
                </button>
                {logoPreview && (
                  <button
                    className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-[#1A1D24] dark:hover:bg-[#232734]"
                    onClick={() => { setLogoPreview(null); setSettings(prev => ({ ...prev, logo: null })); }}
                  >
                    Remove
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </div>
            </div>
          </section>

          {/* Theme removed: dark-only UI as per requirements */}

          {/* Supabase Sync */}
          <section>
            <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Supabase Sync</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="block text-xs text-gray-600 dark:text-gray-400">Supabase URL</label>
                <input
                  type="text"
                  value={settings.supabaseUrl || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, supabaseUrl: e.target.value }))}
                  placeholder="https://xxxxxxxx.supabase.co"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white dark:bg-[#0F1115] dark:border-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-gray-600 dark:text-gray-400">Anon (Public) Key</label>
                <input
                  type="password"
                  value={settings.supabaseAnonKey || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, supabaseAnonKey: e.target.value }))}
                  placeholder="eyJhbGciOi..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white dark:bg-[#0F1115] dark:border-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-gray-600 dark:text-gray-400">Workspace ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.supabaseWorkspaceId || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, supabaseWorkspaceId: e.target.value }))}
                    placeholder="e.g., my-workspace-1"
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 bg-white dark:bg-[#0F1115] dark:border-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                  <button
                    className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-[#1A1D24] dark:hover:bg-[#232734]"
                    onClick={() => setSettings(prev => ({ ...prev, supabaseWorkspaceId: `ws-${Date.now().toString(36)}` }))}
                  >
                    Generate
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-gray-600 dark:text-gray-400">Enable</label>
                <div>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!settings.supabaseEnabled} onChange={(e) => setSettings(prev => ({ ...prev, supabaseEnabled: e.target.checked }))} />
                    <span>Enable cloud sync</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700"
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
                Push to Supabase
              </button>
              <button
                className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700"
                onClick={async () => {
                  try {
                    const mod = await import('../../shared/services/cloud/supabase');
                    const remote = await mod.supabasePullState(settings);
                    if (!remote?.data) { alert('No remote state found.'); return; }
                    StorageService.set(STORAGE_KEYS.WORK_CHECKLIST, remote.data);
                    if (confirm('Pulled from Supabase. Reload to apply?')) window.location.reload();
                  } catch (err) {
                    alert('Pull failed: ' + err.message);
                  }
                }}
              >
                Pull from Supabase
              </button>
            </div>
          </section>

          {/* Storage */}
          <section>
            <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Storage</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Currently using Local Storage. You can back up or restore all app data as a JSON file.</p>
            <div className="flex flex-wrap items-center gap-2">
              <button className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-[#1A1D24] dark:hover:bg-[#232734]" onClick={handleBackup}>
                Download Backup
              </button>
              <button className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-[#1A1D24] dark:hover:bg-[#232734]" onClick={() => restoreInputRef.current?.click()}>
                Restore Backup
              </button>
              <input ref={restoreInputRef} type="file" accept="application/json" className="hidden" onChange={handleRestore} />
              <button className="px-3 py-2 rounded-md bg-red-600/90 text-white hover:bg-red-600" onClick={handleClear}>
                Clear All Data
              </button>
            </div>
          </section>

          {/* Tokens (future AI usage) */}
          <section>
            <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">AI Usage</h3>
            <div className="text-xs text-gray-600 dark:text-gray-400">Tokens used: {tokenInfo.used} / {tokenInfo.total}</div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
