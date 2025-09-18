import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Sparkles, Shuffle, UploadCloud } from 'lucide-react';

const LANGUAGES = [
  { code: 'EN', label: 'English' },
  { code: 'EN-GB', label: 'English (UK)' },
  { code: 'EN-US', label: 'English (US)' },
  { code: 'DE', label: 'German' },
  { code: 'FR', label: 'French' },
  { code: 'ES', label: 'Spanish' },
  { code: 'IT', label: 'Italian' },
  { code: 'JA', label: 'Japanese' },
  { code: 'KO', label: 'Korean' },
  { code: 'PT-BR', label: 'Portuguese (BR)' },
  { code: 'PT-PT', label: 'Portuguese (EU)' },
  { code: 'ZH', label: 'Chinese (simplified)' },
];

const FORMALITY_OPTIONS = [
  { value: 'default', label: 'Balanced' },
  { value: 'less', label: 'More casual' },
  { value: 'more', label: 'More formal' },
];

const DeepLPage = ({ settings }) => {
  const [mode, setMode] = useState('translate');
  const [sourceLang, setSourceLang] = useState('EN');
  const [targetLang, setTargetLang] = useState('DE');
  const [formality, setFormality] = useState('default');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toneHint, setToneHint] = useState('');

  const apiKey = settings?.deeplApiKey?.trim();
  const canCallApi = Boolean(apiKey);

  const requestHeaders = useMemo(
    () => ({
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    }),
    [apiKey]
  );

  const handleSwap = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText(outputText);
    setOutputText(inputText);
  };

  const buildBody = () => {
    const params = new URLSearchParams();
    const text = toneHint ? `${toneHint}\n\n${inputText}` : inputText;
    params.append('text', text);
    params.append('target_lang', targetLang);
    if (mode === 'translate' && sourceLang) {
      params.append('source_lang', sourceLang);
    }
    if (formality !== 'default') {
      params.append('formality', formality);
    }
    if (mode === 'write') {
      // Rewriting in the same language using DeepL translate endpoint.
      params.set('target_lang', sourceLang || 'EN');
      params.set('source_lang', sourceLang || 'EN');
    }
    return params;
  };

  const handleSubmit = async () => {
    if (!canCallApi) {
      setError('Add a DeepL API key in Settings to use this workspace.');
      return;
    }
    if (!inputText.trim()) {
      setError('Enter some text to get started.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: requestHeaders,
        body: buildBody().toString(),
      });
      if (!response.ok) {
        throw new Error(`DeepL error ${response.status}`);
      }
      const data = await response.json();
      const text = data?.translations?.[0]?.text || '';
      setOutputText(text);
    } catch (err) {
      console.error(err);
      setError('Unable to reach DeepL. Confirm your API key and network access.');
    } finally {
      setLoading(false);
    }
  };

  const helperMessage = useMemo(() => {
    if (!canCallApi) {
      return 'Add a DeepL API key in Settings → AI Integration to enable translation and writing.';
    }
    if (mode === 'write') {
      return 'DeepL Write uses translation under the hood. Provide tone hints to steer the rewriting.';
    }
    return 'Choose source and target languages, then translate instantly with DeepL.';
  }, [canCallApi, mode]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">DeepL Workspace</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">High-quality translations and AI writing guidance directly inside your task manager.</p>
        </div>
        <div className="flex items-center rounded-full bg-gray-100 px-1 py-1 dark:bg-[#1A1D24]">
          {['translate', 'write'].map((value) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={`flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-medium transition ${
                mode === value
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-[#232734] dark:text-indigo-200'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
              }`}
            >
              {value === 'translate' ? <UploadCloud className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {value === 'translate' ? 'Translate' : 'Write'}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0F1115]">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-400">
          <span>{helperMessage}</span>
          {mode === 'write' && (
            <div className="flex items-center gap-2">
              <span>Tone hint:</span>
              <input
                value={toneHint}
                onChange={(e) => setToneHint(e.target.value)}
                placeholder="e.g., Friendly, concise, persuasive..."
                className="w-60 rounded-lg border border-gray-300 px-3 py-1 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-[#1A1D24] dark:text-gray-100 dark:focus:ring-indigo-500/40"
              />
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <label className="font-semibold uppercase tracking-wide">Source</label>
              {mode === 'translate' && (
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-[#1A1D24] dark:text-gray-100 dark:focus:ring-indigo-500/40"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={mode === 'translate' ? 'Paste text to translate…' : 'Paste text to rewrite with DeepL Write…'}
              className="h-60 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-800 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-[#10131A] dark:text-gray-100 dark:focus:ring-indigo-500/40"
            />
          </div>

          <div className="flex flex-col items-center justify-center gap-3">
            <button
              onClick={handleSwap}
              disabled={mode === 'write'}
              className="rounded-full border border-gray-300 p-2 text-gray-500 transition hover:text-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {loading ? 'Processing…' : mode === 'translate' ? 'Translate' : 'Rewrite'}
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <label className="font-semibold uppercase tracking-wide">Output</label>
              <div className="flex items-center gap-2">
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-[#1A1D24] dark:text-gray-100 dark:focus:ring-indigo-500/40"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
                <select
                  value={formality}
                  onChange={(e) => setFormality(e.target.value)}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-[#1A1D24] dark:text-gray-100 dark:focus:ring-indigo-500/40"
                >
                  {FORMALITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <textarea
              value={outputText}
              onChange={(e) => setOutputText(e.target.value)}
              placeholder="Your DeepL output will appear here…"
              className="h-60 w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-[#10131A] dark:text-gray-100 dark:focus:ring-indigo-500/40"
            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-rose-500">{error}</p>}
      </div>
    </div>
  );
};

DeepLPage.propTypes = {
  settings: PropTypes.object.isRequired,
};

export default DeepLPage;
