// Application constants
export const APP_NAME = 'Work Checklist App';

// Default settings
export const DEFAULT_SETTINGS = {
  logo: null,
  attachmentMaxMB: 25,
  apiKey: '',
  aiPlay: true,
  aiPdf: true,
  aiFreeText: false,
  aiActionPlan: false,
  tokenPerCharText: 1,
  tokenPerCharAudio: 2,
  cloudSyncEnabled: false,
  theme: 'dark', // 'light' | 'dark'
  phases: ['Conceptual', 'Design', 'Validation', 'Startup'],
  attachmentDirectoryName: '',
  deeplApiKey: '',
  storageProvider: 'localStorage', // future: 'cloud'
  // Supabase configuration (client-side only)
  supabaseUrl: '',
  supabaseAnonKey: '',
  supabaseWorkspaceId: '',
  supabaseEnabled: false,
};

// Token management
export const DEFAULT_TOKEN_INFO = {
  total: 10000,
  used: 0,
};

// Meeting icon options
export const MEETING_ICON_OPTIONS = [
  { key: 'briefcase', label: 'Briefcase', Icon: 'Briefcase' },
  { key: 'users', label: 'Users', Icon: 'Users' },
  { key: 'calendar', label: 'Calendar', Icon: 'Calendar' },
  { key: 'clipboard', label: 'Clipboard', Icon: 'ClipboardList' },
  { key: 'code', label: 'Code', Icon: 'Code' },
  { key: 'share', label: 'Share', Icon: 'Share' },
  { key: 'headphones', label: 'Headphones', Icon: 'Headphones' },
  { key: 'tag', label: 'Tag', Icon: 'Tag' },
  { key: 'life', label: 'LifeBuoy', Icon: 'LifeBuoy' },
  { key: 'pie', label: 'PieChart', Icon: 'PieChart' },
];

// Project colors
export const PROJECT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
];

// Time ranges
export const TIME_RANGES = ['week', 'month', 'quarter', 'year'];

// Storage keys
export const STORAGE_KEYS = {
  WORK_CHECKLIST: 'workChecklist',
  TOKENS: 'workChecklistTokens',
  AGENT_CHAT: 'workChecklistAgentChat',
};
