import React, { useMemo, useState, useEffect } from 'react';
import { Plus, Trash2, Flag, CheckCircle2, Minus, ChevronRight } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { useFinanceProjects } from '../../features/finance/hooks/useFinanceProjects';

const FinancePage = () => {
  const { projects, addProject, updateProject, deleteProject, reorderProjects } = useFinanceProjects();
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || null);
  const [draggingProjectId, setDraggingProjectId] = useState(null);
  const [dragOverProjectId, setDragOverProjectId] = useState(null);
  const [projectsCollapsed, setProjectsCollapsed] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [projectNameDraft, setProjectNameDraft] = useState('');
  const [editingPoId, setEditingPoId] = useState(null);
  const [poFilter, setPoFilter] = useState('all'); // 'all', 'planned', 'committed', 'delivered'
  const [supplierFilter, setSupplierFilter] = useState('all');

  const activeProject = useMemo(() => projects.find((p) => p.id === selectedProjectId) || projects[0] || null, [projects, selectedProjectId]);

  const finance = activeProject?.finance || {};
  const [poForm, setPoForm] = useState({ supplier: '', number: '', value: '', link: '', description: '', committedAt: new Date().toISOString().slice(0,10), deliveryAt: '', planned: false, delivered: false });

  useEffect(() => {
    if (projects.length === 0) {
      setSelectedProjectId(null);
    } else if (!projects.find((p) => p.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);
  
  const handleAddPO = () => {
    const supplier = poForm.supplier.trim();
    const number = poForm.number.trim();
    const value = parseFloat(poForm.value || '0');
    if (!supplier || !number || !value) return;
    const nextPOs = Array.isArray(finance.pos) ? [...finance.pos] : [];
    nextPOs.push({
      id: `po-${Date.now()}`,
      supplier,
      number,
      value,
      link: poForm.link?.trim() || '',
      description: poForm.description?.trim() || '',
      committedAt: poForm.committedAt || null,
      deliveryAt: poForm.deliveryAt || null,
      delivered: !!poForm.delivered,
      planned: !!poForm.planned,
    });
    updateProject(activeProject.id, { finance: { ...finance, pos: nextPOs } });
    setPoForm({ supplier: '', number: '', value: '', link: '', description: '', committedAt: new Date().toISOString().slice(0,10), deliveryAt: '', planned: false, delivered: false });
  };

  const startEditingPO = (po) => {
    setEditingPoId(po.id);
    setPoForm({
      supplier: po.supplier || '',
      number: po.number || '',
      value: po.value || '',
      link: po.link || '',
      description: po.description || '',
      committedAt: po.committedAt || '',
      deliveryAt: po.deliveryAt || '',
      planned: !!po.planned,
      delivered: !!po.delivered,
    });
  };

  const saveEditingPO = () => {
    if (!editingPoId) return;
    const supplier = poForm.supplier.trim();
    const number = poForm.number.trim();
    const value = parseFloat(poForm.value || '0');
    if (!supplier || !number || !value) return;
    
    const nextPOs = (finance.pos || []).map((po) =>
      po.id === editingPoId
        ? {
            ...po,
            supplier,
            number,
            value,
            link: poForm.link?.trim() || '',
            description: poForm.description?.trim() || '',
            committedAt: poForm.committedAt || null,
            deliveryAt: poForm.deliveryAt || null,
            planned: !!poForm.planned,
            delivered: !!poForm.delivered,
          }
        : po
    );
    updateProject(activeProject.id, { finance: { ...finance, pos: nextPOs } });
    setEditingPoId(null);
    setPoForm({ supplier: '', number: '', value: '', link: '', description: '', committedAt: new Date().toISOString().slice(0,10), deliveryAt: '', planned: false, delivered: false });
  };

  const cancelEditingPO = () => {
    setEditingPoId(null);
    setPoForm({ supplier: '', number: '', value: '', link: '', description: '', committedAt: new Date().toISOString().slice(0,10), deliveryAt: '', planned: false, delivered: false });
  };

  const totals = useMemo(() => {
    const limit = parseFloat(finance.limit || '0') || 0;
    const list = Array.isArray(finance.pos) ? finance.pos : [];
    const actual = list.filter(p => p.delivered && !p.planned).reduce((s,p)=> s + (parseFloat(p.value||0)||0),0);
    const committed = list.filter(p => !p.delivered && !p.planned).reduce((s,p)=> s + (parseFloat(p.value||0)||0),0);
    const planned = list.filter(p => p.planned).reduce((s,p)=> s + (parseFloat(p.value||0)||0),0);
    const plannedCount = list.filter(p => p.planned).length;
    const used = committed + actual; // Do NOT include planned in remaining calculation
    const remaining = Math.max(0, limit - used);
    const pct = limit > 0 ? Math.round((used/limit)*100) : 0;
    return { limit, committed, actual, planned, plannedCount, used, remaining, pct };
  }, [finance]);

  const lineData = useMemo(() => {
    const limit = parseFloat(finance.limit || '0') || 0;
    const list = (Array.isArray(finance.pos) ? finance.pos : [])
      .filter((p) => !p.planned)
      .filter(p => p.committedAt)
      .slice()
      .sort((a,b) => new Date(a.committedAt) - new Date(b.committedAt));
    const data = [];
    let running = limit;
    if (list.length === 0) {
      data.push({ date: new Date().toISOString().slice(0,10), remaining: running });
      return data;
    }
    data.push({ date: list[0].committedAt, remaining: running });
    for (const po of list) {
      const val = parseFloat(po.value || 0) || 0;
      running = Math.max(0, running - val);
      data.push({ date: po.committedAt, remaining: running, node: true });
    }
    return data;
  }, [finance]);

  const plannedLineData = useMemo(() => {
    const limit = parseFloat(finance.limit || '0') || 0;
    const actualLine = lineData;
    const list = (Array.isArray(finance.pos) ? finance.pos : [])
      .filter((p) => p.planned)
      .filter((p) => p.committedAt)
      .slice()
      .sort((a, b) => new Date(a.committedAt) - new Date(b.committedAt));
    if (list.length === 0) return [];
    const baseDate = actualLine.length ? actualLine[actualLine.length - 1].date : new Date().toISOString().slice(0, 10);
    let running = actualLine.length ? actualLine[actualLine.length - 1].remaining : limit;
    const data = [{ date: baseDate, remaining: running }];
    list.forEach((po) => {
      const val = parseFloat(po.value || 0) || 0;
      running = Math.max(0, running - val);
      data.push({ date: po.committedAt, remaining: running, node: true });
    });
    return data;
  }, [finance, lineData]);

  // Get unique suppliers for dropdown
  const uniqueSuppliers = useMemo(() => {
    const suppliers = (finance.pos || []).map(po => po.supplier).filter(Boolean);
    return [...new Set(suppliers)].sort();
  }, [finance.pos]);

  // Filter POs based on selected filters
  const filteredPOs = useMemo(() => {
    let filtered = finance.pos || [];
    
    // Apply status filter
    if (poFilter === 'planned') {
      filtered = filtered.filter(po => po.planned);
    } else if (poFilter === 'committed') {
      filtered = filtered.filter(po => !po.planned && !po.delivered);
    } else if (poFilter === 'delivered') {
      filtered = filtered.filter(po => po.delivered);
    }
    
    // Apply supplier filter
    if (supplierFilter !== 'all') {
      filtered = filtered.filter(po => po.supplier === supplierFilter);
    }
    
    return filtered;
  }, [finance.pos, poFilter, supplierFilter]);


  const handleReorderProjects = (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    reorderProjects(sourceId, targetId);
    setDragOverProjectId(null);
    setDraggingProjectId(null);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex">
        {/* Project Sidebar */}
        <div className={`mr-4 overflow-hidden rounded-xl bg-white navy-surface shadow-md dark:bg-[#0F1115] dark:border dark:border-gray-800 ${projectsCollapsed ? 'w-16' : 'w-80'}`}>
          <div className="p-3.5">
            <div className="mb-3 flex items-center justify-between gap-2">
              {!projectsCollapsed && <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Projects</h3>}
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => addProject({})} 
                  className="rounded-full border border-gray-200 p-1.5 text-gray-500 transition hover:text-indigo-500 dark:border-gray-700 dark:text-gray-300" 
                  title="Create project"
                  aria-label="Create new project"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setProjectsCollapsed((v) => !v)} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setProjectsCollapsed((v) => !v);
                    }
                  }}
                  className="rounded-full border border-gray-200 p-1.5 text-gray-500 transition hover:text-indigo-500 dark:border-gray-700 dark:text-gray-300" 
                  title={projectsCollapsed ? 'Expand projects' : 'Collapse projects'}
                  aria-expanded={!projectsCollapsed}
                  aria-controls="projects-list"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${projectsCollapsed ? 'rotate-0' : 'rotate-90'}`} />
                </button>
              </div>
            </div>
            <div id="projects-list" className="space-y-1.5">
              {projects.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  No projects yet. Create one to start.
                </div>
              )}
              {projects.map((project) => {
                const isSelected = project.id === (activeProject?.id || null);
                const isDragOver = dragOverProjectId === project.id;
                return (
                  <div
                    key={project.id}
                    draggable
                    onDragStart={(event) => {
                      setDraggingProjectId(project.id);
                      event.dataTransfer.setData('application/project-id', project.id);
                    }}
                    onDragOver={(event) => {
                      if (!draggingProjectId || draggingProjectId === project.id) return;
                      event.preventDefault();
                      setDragOverProjectId(project.id);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceId = draggingProjectId || event.dataTransfer.getData('application/project-id');
                      handleReorderProjects(sourceId, project.id);
                    }}
                    onDragLeave={() => setDragOverProjectId((prev) => (prev === project.id ? null : prev))}
                    className={`p-2.5 rounded-md border transition ${
                      isSelected
                        ? 'bg-gray-50 border-gray-300 dark:bg-[#1A1D24] dark:border-gray-700'
                        : 'bg-white border-transparent hover:bg-gray-50 dark:bg-[#0F1115] dark:hover:bg-[#1A1D24]'
                    } ${isDragOver ? 'ring-2 ring-indigo-400' : ''}`}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                      <div className="flex-1 min-w-0">
                        {editingProjectId === project.id ? (
                          <input
                            autoFocus
                            value={projectNameDraft}
                            onChange={(e) => setProjectNameDraft(e.target.value)}
                            onBlur={() => { updateProject(project.id, { name: projectNameDraft }); setEditingProjectId(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { updateProject(project.id, { name: projectNameDraft }); setEditingProjectId(null); }}}
                            className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-[#10131A] dark:text-gray-100"
                          />
                        ) : (
                          <h4 onDoubleClick={() => { setEditingProjectId(project.id); setProjectNameDraft(project.name || ''); }} className="font-medium text-sm truncate text-gray-700 dark:text-gray-200 cursor-text" title="Double-click to rename">
                            {project.name}
                          </h4>
                        )}
                        {!projectsCollapsed && (
                          <p className="text-xs text-gray-500 truncate dark:text-gray-400">{project.description}</p>
                        )}
                      </div>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteProject(project.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-400"
                        title="Delete project"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 rounded-xl bg-white navy-surface p-4 shadow-md dark:bg-[#0F1115] dark:border dark:border-gray-800">
          {!activeProject ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">Create a project to start financial planning.</div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Budget ID</div>
                  <input
                    value={finance.budgetId || ''}
                    onChange={(e) => updateProject(activeProject.id, { finance: { ...finance, budgetId: e.target.value } })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#10131A] dark:text-gray-100"
                    placeholder="e.g., BGT-2025-ACME"
                  />
                </div>
                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Budget limit</div>
                  <input
                    type="number"
                    value={finance.limit || ''}
                    onChange={(e) => updateProject(activeProject.id, { finance: { ...finance, limit: e.target.value } })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#10131A] dark:text-gray-100"
                    placeholder="e.g., 50000"
                  />
                </div>
                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expiry</div>
                  <input
                    type="date"
                    value={finance.expiry || ''}
                    onChange={(e) => updateProject(activeProject.id, { finance: { ...finance, expiry: e.target.value } })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#10131A] dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-6">
                {[
                  { label: 'Budget', value: totals.limit },
                  { label: 'Committed', value: totals.committed },
                  { label: 'Actual', value: totals.actual },
                  { 
                    label: 'Remaining', 
                    value: totals.remaining,
                    colorClass: totals.remaining >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                  },
                  { 
                    label: `Planned POs (${totals.plannedCount})`, 
                    value: totals.planned,
                    colorClass: totals.planned <= totals.remaining ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                  },
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</div>
                    <div className={`mt-1 text-lg font-semibold ${kpi.colorClass || 'text-gray-800 dark:text-gray-100'}`}>${(kpi.value||0).toLocaleString()}</div>
                  </div>
                ))}
                <div className={`rounded-xl border p-4 ${totals.pct <= 100 ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700' : 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800'}`}>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Consumed</div>
                  <div className={`mt-1 text-lg font-semibold ${totals.pct <= 100 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>{totals.pct}%</div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <div className="mb-2 flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-200">
                  <span>Remaining over time</span>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="remainStroke" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#8B5CF6" />
                          <stop offset="100%" stopColor="#06B6D4" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <ReferenceLine y={0} stroke="#94a3b8" />
                      {/* Today marker */}
                      <ReferenceLine x={new Date().toISOString().slice(0,10)} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: 'Today', position: 'top', fill: '#64748b', fontSize: 10 }} />
                      <Line type="monotone" dataKey="remaining" stroke="url(#remainStroke)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Left: PO form */}
                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {editingPoId ? 'Edit PO' : 'New PO'}
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    <input
                      value={poForm.supplier}
                      onChange={(e) => setPoForm((p) => ({ ...p, supplier: e.target.value }))}
                      placeholder="Supplier"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#10131A] dark:text-gray-100"
                    />
                    <input
                      value={poForm.number}
                      onChange={(e) => setPoForm((p) => ({ ...p, number: e.target.value }))}
                      placeholder="PO #"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#10131A] dark:text-gray-100"
                    />
                    <input
                      type="number"
                      value={poForm.value}
                      onChange={(e) => setPoForm((p) => ({ ...p, value: e.target.value }))}
                      placeholder="Value"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#10131A] dark:text-gray-100"
                    />
                    <input
                      value={poForm.link}
                      onChange={(e) => setPoForm((p) => ({ ...p, link: e.target.value }))}
                      placeholder="Link to PO file (URL)"
                      className="md:col-span-3 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#10131A] dark:text-gray-100"
                    />
                    <input
                      value={poForm.description}
                      onChange={(e) => setPoForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Description"
                      className="md:col-span-3 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#10131A] dark:text-gray-100"
                    />
                    <div className="grid grid-cols-2 gap-2 md:col-span-3">
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Committed date</label>
                        <input type="date" value={poForm.committedAt} onChange={(e)=> setPoForm((p)=> ({...p, committedAt: e.target.value}))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#10131A] dark:text-gray-100" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Delivery date</label>
                        <input type="date" value={poForm.deliveryAt} onChange={(e)=> setPoForm((p)=> ({...p, deliveryAt: e.target.value}))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#10131A] dark:text-gray-100" />
                      </div>
                    </div>
                    <div className="md:col-span-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="planned-po"
                        checked={poForm.planned}
                        onChange={(e) => setPoForm((p) => ({ 
                          ...p, 
                          planned: e.target.checked,
                          delivered: e.target.checked ? false : p.delivered // If setting planned=true, ensure delivered=false
                        }))}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-700 dark:bg-[#10131A]"
                      />
                      <label htmlFor="planned-po" className="text-xs text-gray-500 dark:text-gray-400">
                        Planned PO (future commitment)
                      </label>
                    </div>
                    <div className="md:col-span-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="delivered-po"
                        checked={poForm.delivered || false}
                        onChange={(e) => setPoForm((p) => ({ 
                          ...p, 
                          delivered: e.target.checked,
                          planned: e.target.checked ? false : p.planned // If setting delivered=true, ensure planned=false
                        }))}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-700 dark:bg-[#10131A]"
                      />
                      <label htmlFor="delivered-po" className="text-xs text-gray-500 dark:text-gray-400">
                        Delivered PO
                      </label>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {editingPoId ? (
                      <>
                        <button onClick={saveEditingPO} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
                          Save Changes
                        </button>
                        <button onClick={cancelEditingPO} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button onClick={handleAddPO} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
                        Add PO
                      </button>
                    )}
                  </div>
                </div>

                {/* Right: PO list with scroll */}
                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="mb-4 space-y-3">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">Purchase Orders</div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={poFilter}
                        onChange={(e) => setPoFilter(e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#10131A] dark:text-gray-100 flex-1 sm:flex-none sm:w-32"
                      >
                        <option value="all">All POs</option>
                        <option value="planned">Planned</option>
                        <option value="committed">Committed</option>
                        <option value="delivered">Delivered</option>
                      </select>
                      <select
                        value={supplierFilter}
                        onChange={(e) => setSupplierFilter(e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#10131A] dark:text-gray-100 flex-1 sm:flex-none sm:w-36"
                      >
                        <option value="all">All Suppliers</option>
                        {uniqueSuppliers.map(supplier => (
                          <option key={supplier} value={supplier}>{supplier}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="max-h-[500px] overflow-y-auto pr-1 space-y-2">
                    {filteredPOs.map((po) => {
                      const overdue = po.deliveryAt && !po.delivered && new Date(po.deliveryAt) < new Date();
                      return (
                        <div key={po.id} className={`rounded-lg border p-4 text-sm ${po.planned ? 'bg-gray-100 border-l-4 border-gray-400 dark:bg-gray-800 dark:border-gray-600' : po.delivered ? 'bg-white border-l-4 border-emerald-500 dark:border-gray-800 dark:bg-[#10131A]' : 'bg-white border-l-4 border-sky-500 dark:border-gray-800 dark:bg-[#10131A]'} ${editingPoId === po.id ? 'ring-2 ring-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                          {/* Header row with supplier, number, and value */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="font-medium text-gray-700 dark:text-gray-100 truncate">{po.supplier}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-600 dark:text-gray-300 truncate">{po.number}</span>
                              {po.planned && <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300 whitespace-nowrap">Planned</span>}
                              {overdue && <Flag className="w-3.5 h-3.5 text-red-500 flex-shrink-0" title="Delivery overdue" />}
                            </div>
                            <div className="font-semibold text-gray-800 dark:text-gray-100 ml-2">${Number(po.value || 0).toLocaleString()}</div>
                          </div>
                          
                          {/* Dates row */}
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            <span>Committed: {po.committedAt || '—'}</span>
                            <span className="mx-2">|</span>
                            <span>Delivery: {po.deliveryAt || '—'}</span>
                            {po.link && (<><span className="mx-2">|</span><a className="underline hover:text-indigo-500" href={po.link} target="_blank" rel="noreferrer">Link</a></>)}
                          </div>
                          
                          {/* Description */}
                          {po.description && (
                            <div className="text-xs text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{po.description}</div>
                          )}
                          
                          {/* Action buttons row */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${po.planned ? 'border-gray-400 text-gray-600 dark:border-gray-600 dark:text-gray-400' : 'border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-300'}`}>
                                <button
                                  onClick={() => {
                                    const next = (finance.pos || []).map((x) => x.id === po.id ? { 
                                      ...x, 
                                      planned: !x.planned,
                                      delivered: !x.planned ? false : x.delivered // If setting planned=true, ensure delivered=false
                                    } : x);
                                    updateProject(activeProject.id, { finance: { ...finance, pos: next } });
                                  }}
                                  title="Toggle planned"
                                  className={`h-3 w-3 rounded-full border ${po.planned ? 'bg-gray-500 border-gray-600' : 'border-gray-400'} flex items-center justify-center`}
                                >
                                  {po.planned && <CheckCircle2 className="w-2 h-2 text-white" />}
                                </button>
                                <span className="whitespace-nowrap">Planned</span>
                              </div>
                              <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${po.delivered ? 'border-emerald-300 text-emerald-600 dark:border-emerald-800 dark:text-emerald-300' : 'border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-300'}`}>
                                <button
                                  onClick={() => {
                                    const next = (finance.pos || []).map((x) => x.id === po.id ? { 
                                      ...x, 
                                      delivered: !x.delivered,
                                      planned: !x.delivered ? false : x.planned // If setting delivered=true, ensure planned=false
                                    } : x);
                                    updateProject(activeProject.id, { finance: { ...finance, pos: next } });
                                  }}
                                  title="Toggle delivered"
                                  className={`h-3 w-3 rounded-full border ${po.delivered ? 'bg-emerald-500 border-emerald-600' : 'border-gray-400'} flex items-center justify-center`}
                                >
                                  {po.delivered && <CheckCircle2 className="w-2 h-2 text-white" />}
                                </button>
                                <span className="whitespace-nowrap">Delivered</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => startEditingPO(po)} className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Edit</button>
                              <button onClick={() => { const next = (finance.pos || []).filter((x)=> x.id !== po.id); updateProject(activeProject.id, { finance: { ...finance, pos: next } }); }} className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-500 hover:text-red-600 dark:border-red-900 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancePage;
