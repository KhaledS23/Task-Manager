// Lightweight Supabase client wrapper + JSON state sync helpers
// Avoids bundling unless configured by dynamically importing from ESM CDN.

export const getSupabaseClient = async (settings) => {
  const url = settings?.supabaseUrl?.trim();
  const key = settings?.supabaseAnonKey?.trim();
  if (!url || !key) return null;
  try {
    // dynamic import to prevent bundling when unused
    const mod = await import(/* @vite-ignore */ 'https://esm.sh/@supabase/supabase-js@2');
    const client = mod.createClient(url, key);
    return client;
  } catch (err) {
    console.error('Supabase client load failed:', err);
    return null;
  }
};

// Upsert whole app state as a single JSON blob under a workspaceId
export const supabasePushState = async (settings, state) => {
  const sb = await getSupabaseClient(settings);
  if (!sb) throw new Error('Supabase not configured');
  const workspaceId = settings.supabaseWorkspaceId || 'default';
  const payload = {
    workspace_id: workspaceId,
    data: state,
    updated_at: new Date().toISOString(),
  };
  const { data: upserted, error } = await sb
    .from('work_state')
    .upsert(payload, { onConflict: 'workspace_id' })
    .select();
  if (error) throw error;
  return upserted?.[0] || null;
};

export const supabasePullState = async (settings) => {
  const sb = await getSupabaseClient(settings);
  if (!sb) throw new Error('Supabase not configured');
  const workspaceId = settings.supabaseWorkspaceId || 'default';
  const { data, error } = await sb
    .from('work_state')
    .select('data, updated_at')
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (error) throw error;
  return data || null; // { data: {...}, updated_at: '...' }
};
