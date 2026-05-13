import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectsApi, plantApi, resourcesApi } from '../api/endpoints';
import { formatDate } from '../utils/helpers';
import { PageLoader } from '../components/ui/LoadingSpinner';
import ProgressBar from '../components/ui/ProgressBar';
import { ZoomIn, ZoomOut, Maximize2, X, Layers, Filter, MapPin, Users, Truck, Info } from 'lucide-react';
import type { ZoneEntry, PlantEquipment, SiteResource } from '../types';

/* ── Grid constants ── */
const ZONES_DEFAULT  = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const LEVELS_DEFAULT = ['S5','S4','S3','S2','GR','R+1','R+2','R+3','R+4','R+5'];
const CW = 88;   // cell width
const CH = 56;   // cell height
const LW = 48;   // level label width
const LH = 28;   // zone label height
const PAD = 16;

/* ── Color helpers ── */
function cellFill(p: number) {
  if (p === 0)   return '#0d1428';
  if (p < 25)    return 'rgba(255,77,109,0.18)';
  if (p < 50)    return 'rgba(255,184,0,0.18)';
  if (p < 75)    return 'rgba(0,212,255,0.18)';
  if (p < 100)   return 'rgba(0,214,143,0.18)';
  return 'rgba(0,214,143,0.32)';
}
function cellStroke(p: number) {
  if (p === 0)   return '#1e2d50';
  if (p < 25)    return '#ff4d6d';
  if (p < 50)    return '#ffb800';
  if (p < 75)    return '#00d4ff';
  return '#00d68f';
}
function cellTextColor(p: number) {
  if (p === 0)   return '#4a5f85';
  if (p < 25)    return '#ff4d6d';
  if (p < 50)    return '#ffb800';
  if (p < 75)    return '#00d4ff';
  return '#00d68f';
}

interface GridCell {
  zone: string;
  level: string;
  progress: number;
  description: string;
  surface: string;
  col: number;
  row: number;
}

export default function ProjectMapPage() {
  const { projectId } = useParams<{ projectId: string }>();

  /* ── Data queries ── */
  const { data: project, isLoading: projLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!).then(r => r.data),
    enabled: !!projectId,
  });
  const { data: equipment = [] } = useQuery({
    queryKey: ['plant', projectId],
    queryFn: () => plantApi.list(projectId!).then(r => r.data as PlantEquipment[]),
    enabled: !!projectId,
  });
  const { data: personnel = [] } = useQuery({
    queryKey: ['resources', projectId],
    queryFn: () => resourcesApi.list(projectId!).then(r => r.data as SiteResource[]),
    enabled: !!projectId,
  });

  /* ── Parse presentation zones ── */
  const presZones: ZoneEntry[] = useMemo(() => {
    if (!project?.presentationData) return [];
    try { return JSON.parse(project.presentationData).zones ?? []; }
    catch { return []; }
  }, [project?.presentationData]);

  /* ── Derive zone/level axes ── */
  const zoneLabels = useMemo(() => {
    const fromData = [...new Set(presZones.map(z => z.zone).filter(Boolean))];
    return fromData.length >= 2 ? fromData : ZONES_DEFAULT;
  }, [presZones]);

  const levelLabels = useMemo(() => {
    const fromData = [...new Set(presZones.map(z => z.level).filter(Boolean))];
    return fromData.length >= 1 ? fromData : LEVELS_DEFAULT;
  }, [presZones]);

  /* ── Build grid ── */
  const grid: GridCell[][] = useMemo(() =>
    levelLabels.map((level, row) =>
      zoneLabels.map((zone, col) => {
        const entry = presZones.find(z =>
          z.zone.toLowerCase().includes(zone.toLowerCase()) &&
          z.level.toLowerCase().includes(level.toLowerCase())
        );
        return { zone, level, progress: entry?.progress ?? 0, description: entry?.description ?? '', surface: entry?.surface ?? '', col, row };
      })
    ),
    [zoneLabels, levelLabels, presZones]
  );

  /* ── Filter state ── */
  const [filterZone,     setFilterZone]     = useState('');
  const [filterLevel,    setFilterLevel]    = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterProgress, setFilterProgress] = useState('');
  const [showLegend,     setShowLegend]     = useState(true);

  /* ── Zoom/pan state ── */
  const svgRef   = useRef<SVGSVGElement>(null);
  const [scale, setScale]   = useState(1);
  const [pan,   setPan]     = useState({ x: PAD, y: PAD });
  const dragging  = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  /* ── Selected cell ── */
  const [selected, setSelected] = useState<GridCell | null>(null);

  /* ── Zoom toward cursor ── */
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 0.9;
      setScale(prev => {
        const next = Math.max(0.3, Math.min(4, prev * factor));
        setPan(p => ({
          x: mx - (mx - p.x) * (next / prev),
          y: my - (my - p.y) * (next / prev),
        }));
        return next;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest('[data-cell]')) return;
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as SVGSVGElement).style.cursor = 'grabbing';
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const onMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    dragging.current = false;
    (e.currentTarget as SVGSVGElement).style.cursor = 'grab';
  }, []);

  const resetView = () => { setScale(1); setPan({ x: PAD, y: PAD }); };

  /* ── SVG dimensions ── */
  const svgW = LW + zoneLabels.length * CW + PAD * 2;
  const svgH = LH + levelLabels.length * CH + PAD * 2;

  /* ── Status legend ── */
  const legend = [
    { label: 'Not Started', color: '#4a5f85' },
    { label: '< 25%',       color: '#ff4d6d' },
    { label: '< 50%',       color: '#ffb800' },
    { label: '< 75%',       color: '#00d4ff' },
    { label: 'Completed',   color: '#00d68f' },
  ];

  /* ── Filter helper ── */
  const isVisible = (cell: GridCell) => {
    if (filterZone  && cell.zone  !== filterZone)  return false;
    if (filterLevel && cell.level !== filterLevel)  return false;
    if (filterStatus) {
      if (filterStatus === 'not_started' && cell.progress > 0)    return false;
      if (filterStatus === 'in_progress' && (cell.progress === 0 || cell.progress === 100)) return false;
      if (filterStatus === 'completed'   && cell.progress < 100)   return false;
    }
    if (filterProgress) {
      const p = cell.progress;
      if (filterProgress === '0'    && p !== 0)              return false;
      if (filterProgress === '0-25' && !(p > 0 && p < 25))  return false;
      if (filterProgress === '25-50'&& !(p >= 25 && p < 50))return false;
      if (filterProgress === '50-75'&& !(p >= 50 && p < 75))return false;
      if (filterProgress === '75-99'&& !(p >= 75 && p < 100))return false;
      if (filterProgress === '100'  && p !== 100)            return false;
    }
    return true;
  };

  const hasFilters = !!(filterZone || filterLevel || filterStatus || filterProgress);
  const clearFilters = () => { setFilterZone(''); setFilterLevel(''); setFilterStatus(''); setFilterProgress(''); };

  /* ── Select style (fixes dark-mode invisible options) ── */
  const selStyle: React.CSSProperties = {
    color: 'var(--text-1)',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '5px 10px',
    fontSize: 12,
    outline: 'none',
    cursor: 'pointer',
    minWidth: 140,
  };

  /* ── Overall stats ── */
  const allCells = grid.flat();
  const activeCells = allCells.filter(c => c.progress > 0);
  const avgProg = allCells.length > 0
    ? Math.round(allCells.reduce((s, c) => s + c.progress, 0) / allCells.length)
    : 0;

  if (projLoading) return <PageLoader text="Loading map..." />;

  return (
    <div className="flex flex-col h-full space-y-4 fade-in" style={{ height: 'calc(100vh - 120px)' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="page-title flex items-center gap-2"><MapPin size={20} style={{ color: 'var(--cyan)' }} /> Site Map</h1>
          <p className="page-subtitle">{project?.name} — Interactive works extent</p>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-3)' }}>
          <span><span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{zoneLabels.length}</span> zones</span>
          <span><span style={{ color: 'var(--violet)', fontWeight: 700 }}>{levelLabels.length}</span> levels</span>
          <span><span style={{ color: 'var(--green)', fontWeight: 700 }}>{avgProg}%</span> avg. progress</span>
        </div>
      </div>

      {/* ── Filters + Zoom controls ── */}
      <div className="rounded-xl px-4 py-3 flex gap-3 flex-wrap items-center flex-shrink-0"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <Filter size={13} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
        <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--text-2)' }}>Filters:</span>

        {/* Zone filter */}
        <div className="flex flex-col gap-0.5">
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>Zone</label>
          <select style={selStyle} value={filterZone} onChange={e => setFilterZone(e.target.value)}>
            <option value="">All ({zoneLabels.length})</option>
            {zoneLabels.map(z => <option key={z} value={z}>Block {z}</option>)}
          </select>
        </div>

        {/* Level filter */}
        <div className="flex flex-col gap-0.5">
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>Level</label>
          <select style={selStyle} value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
            <option value="">All ({levelLabels.length})</option>
            {levelLabels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {/* Status filter */}
        <div className="flex flex-col gap-0.5">
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>Status</label>
          <select style={selStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="not_started">Not Started (0%)</option>
            <option value="in_progress">In Progress (1-99%)</option>
            <option value="completed">Completed (100%)</option>
          </select>
        </div>

        {/* Progress range filter */}
        <div className="flex flex-col gap-0.5">
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>Progress</label>
          <select style={selStyle} value={filterProgress} onChange={e => setFilterProgress(e.target.value)}>
            <option value="">All progress</option>
            <option value="0">0% — Not Started</option>
            <option value="0-25">1% – 24% — Starting</option>
            <option value="25-50">25% – 49% — In Progress</option>
            <option value="50-75">50% – 74% — Advanced</option>
            <option value="75-99">75% – 99% — Finishing</option>
            <option value="100">100% — Completed</option>
          </select>
        </div>

        {hasFilters && (
          <button className="btn-secondary btn-sm text-xs flex items-center gap-1 self-end"
            style={{ color: 'var(--pink)', borderColor: 'rgba(255,0,110,0.3)' }}
            onClick={clearFilters}>
            <X size={11} /> Effacer
          </button>
        )}

        <div className="ml-auto flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setShowLegend(s => !s)} title="Afficher/masquer la légende"
            className="btn-secondary btn-sm p-2"
            style={{ color: showLegend ? 'var(--cyan)' : 'var(--text-3)', borderColor: showLegend ? 'rgba(0,212,255,0.3)' : undefined }}>
            <Layers size={13} />
          </button>
          <button onClick={() => setScale(s => Math.min(4, s * 1.2))} title="Zoom +" className="btn-secondary btn-sm p-2"><ZoomIn size={13} /></button>
          <button onClick={() => setScale(s => Math.max(0.3, s * 0.8))} title="Zoom -" className="btn-secondary btn-sm p-2"><ZoomOut size={13} /></button>
          <button onClick={resetView} title="Réinitialiser" className="btn-secondary btn-sm p-2"><Maximize2 size={13} /></button>
          <span className="px-2 text-xs tabular-nums" style={{ color: 'var(--text-3)' }}>{Math.round(scale * 100)}%</span>
        </div>
      </div>

      {/* ── Main area: map + side panel ── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Map container */}
        <div className="flex-1 rounded-xl overflow-hidden relative"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'grab' }}>

          {/* Legend (toggleable) */}
          {showLegend && (
            <div className="absolute top-3 left-3 z-10 rounded-lg px-3 py-2 space-y-1"
              style={{ background: 'rgba(10,14,31,0.92)', border: '1px solid rgba(0,212,255,0.2)', backdropFilter: 'blur(10px)', minWidth: 140 }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Legend</p>
                <button onClick={() => setShowLegend(false)}
                  className="ml-3 opacity-50 hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--text-3)', lineHeight: 1 }}>
                  <X size={11} />
                </button>
              </div>
              {legend.map(({ label, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}66` }} />
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tip */}
          <div className="absolute bottom-3 left-3 z-10 text-xs flex items-center gap-1.5"
            style={{ color: 'var(--text-3)' }}>
            <Info size={11} />
            Cliquer sur une cellule · Molette pour zoomer · Glisser pour déplacer
          </div>

          {/* SVG Map */}
          <svg
            ref={svgRef}
            width="100%" height="100%"
            style={{ display: 'block', userSelect: 'none' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}>

            <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>

              {/* Zone column headers */}
              {zoneLabels.map((zone, col) => {
                const x = LW + col * CW + CW / 2;
                const isFiltered = filterZone && filterZone !== zone;
                return (
                  <g key={zone}>
                    <rect x={LW + col * CW + 2} y={0} width={CW - 4} height={LH - 4} rx={4}
                      fill={isFiltered ? 'rgba(255,255,255,0.02)' : 'rgba(0,212,255,0.1)'}
                      stroke={isFiltered ? '#1e2d50' : 'rgba(0,212,255,0.3)'} strokeWidth={0.5} />
                    <text x={x} y={LH / 2 + 1} textAnchor="middle" dominantBaseline="middle"
                      fontSize={11} fontWeight="700"
                      fill={isFiltered ? '#2a3f6a' : '#00d4ff'}>
                      {zone}
                    </text>
                  </g>
                );
              })}

              {/* Level row headers */}
              {levelLabels.map((level, row) => {
                const y = LH + row * CH + CH / 2;
                const isFiltered = filterLevel && filterLevel !== level;
                return (
                  <g key={level}>
                    <rect x={0} y={LH + row * CH + 2} width={LW - 4} height={CH - 4} rx={4}
                      fill={isFiltered ? 'rgba(255,255,255,0.02)' : 'rgba(140,58,255,0.1)'}
                      stroke={isFiltered ? '#1e2d50' : 'rgba(140,58,255,0.3)'} strokeWidth={0.5} />
                    <text x={LW / 2} y={y} textAnchor="middle" dominantBaseline="middle"
                      fontSize={10} fontWeight="700"
                      fill={isFiltered ? '#2a3f6a' : '#8c3aff'}>
                      {level}
                    </text>
                  </g>
                );
              })}

              {/* Grid cells */}
              {grid.map((row, ri) =>
                row.map((cell, ci) => {
                  const x = LW + ci * CW + 2;
                  const y = LH + ri * CH + 2;
                  const w = CW - 4;
                  const h = CH - 4;
                  const visible = isVisible(cell);
                  const isSelected = selected?.zone === cell.zone && selected?.level === cell.level;
                  const fill   = visible ? cellFill(cell.progress)   : 'rgba(255,255,255,0.01)';
                  const stroke = visible ? cellStroke(cell.progress) : '#1e2d50';
                  const tcolor = visible ? cellTextColor(cell.progress) : '#1e2d50';
                  const sw = isSelected ? 2 : 0.6;

                  return (
                    <g key={`${ri}-${ci}`} data-cell="1"
                      style={{ cursor: visible ? 'pointer' : 'default' }}
                      onClick={() => visible && setSelected(isSelected ? null : cell)}>
                      {/* Cell background */}
                      <rect x={x} y={y} width={w} height={h} rx={5}
                        fill={fill} stroke={stroke} strokeWidth={sw}
                        style={{ transition: 'fill 0.2s, stroke 0.2s' }} />

                      {/* Glow for selected */}
                      {isSelected && (
                        <rect x={x - 1} y={y - 1} width={w + 2} height={h + 2} rx={6}
                          fill="none" stroke={stroke} strokeWidth={1.5} opacity={0.4} />
                      )}

                      {/* Progress bar inside cell */}
                      {visible && cell.progress > 0 && (
                        <rect x={x + 4} y={y + h - 8} width={(w - 8) * cell.progress / 100} height={3} rx={1.5}
                          fill={stroke} opacity={0.8} />
                      )}
                      {visible && (
                        <rect x={x + 4} y={y + h - 8} width={w - 8} height={3} rx={1.5}
                          fill="rgba(255,255,255,0.06)" />
                      )}

                      {/* Zone label */}
                      <text x={x + 7} y={y + 14} fontSize={10} fontWeight="700" fill={tcolor}>
                        {cell.zone}
                      </text>

                      {/* Level label */}
                      <text x={x + 7} y={y + 26} fontSize={8} fill={visible ? 'rgba(232,238,248,0.5)' : '#1e2d50'}>
                        {cell.level}
                      </text>

                      {/* Progress % */}
                      {visible && (
                        <text x={x + w - 5} y={y + 14} fontSize={9} fontWeight="700"
                          textAnchor="end" fill={tcolor}>
                          {cell.progress}%
                        </text>
                      )}
                    </g>
                  );
                })
              )}

              {/* Grid lines */}
              {zoneLabels.map((_, ci) => (
                <line key={`vl-${ci}`}
                  x1={LW + (ci + 1) * CW} y1={LH}
                  x2={LW + (ci + 1) * CW} y2={LH + levelLabels.length * CH}
                  stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
              ))}
              {levelLabels.map((_, ri) => (
                <line key={`hl-${ri}`}
                  x1={LW} y1={LH + (ri + 1) * CH}
                  x2={LW + zoneLabels.length * CW} y2={LH + (ri + 1) * CH}
                  stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
              ))}
            </g>
          </svg>
        </div>

        {/* ── Side Panel ── */}
        <div
          className="flex-shrink-0 rounded-xl overflow-hidden flex flex-col transition-all duration-300"
          style={{
            width: selected ? 320 : 0,
            minWidth: selected ? 320 : 0,
            background: 'var(--bg-card)',
            border: selected ? '1px solid var(--border-neon)' : 'none',
            overflow: 'hidden',
          }}>
          {selected && (
            <div className="flex flex-col h-full overflow-y-auto">
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
                <div>
                  <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>
                    Zone <span style={{ color: 'var(--cyan)' }}>{selected.zone}</span>
                    {' — '}<span style={{ color: 'var(--violet)' }}>{selected.level}</span>
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                    {selected.description || 'No description'}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-3)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Progress */}
                <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Progress</span>
                    <span className="text-xl font-bold" style={{ color: cellTextColor(selected.progress) }}>
                      {selected.progress}%
                    </span>
                  </div>
                  <ProgressBar value={selected.progress} size="lg" />
                  <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--text-3)' }}>
                    <span>Area: {selected.surface || '—'}</span>
                    <span style={{ color: cellTextColor(selected.progress), fontWeight: 600 }}>
                      {selected.progress === 0 ? 'Not Started' :
                       selected.progress < 25 ? 'Starting' :
                       selected.progress < 75 ? 'In Progress' :
                       selected.progress < 100 ? 'Finishing' : 'Completed'}
                    </span>
                  </div>
                </div>

                {/* Equipment section */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Truck size={13} style={{ color: 'var(--amber)' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
                      On-site Equipment ({equipment.filter(e => e.status === 'ON_SITE').length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {equipment.filter(e => e.status === 'ON_SITE').slice(0, 6).map(eq => (
                      <div key={eq.id} className="flex items-center justify-between rounded-lg px-3 py-2"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                        <div>
                          <p className="text-xs font-medium" style={{ color: 'var(--text-1)' }}>{eq.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-3)' }}>{eq.category}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(0,214,143,0.1)', color: 'var(--green)', border: '1px solid rgba(0,214,143,0.2)' }}>
                          Active
                        </span>
                      </div>
                    ))}
                    {equipment.filter(e => e.status === 'ON_SITE').length === 0 && (
                      <p className="text-xs text-center py-3" style={{ color: 'var(--text-3)' }}>No equipment on site</p>
                    )}
                    {equipment.filter(e => e.status === 'ON_SITE').length > 6 && (
                      <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
                        + {equipment.filter(e => e.status === 'ON_SITE').length - 6} more
                      </p>
                    )}
                  </div>
                </div>

                {/* Personnel section */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={13} style={{ color: 'var(--cyan)' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
                      Active Personnel ({personnel.filter(p => p.status === 'ACTIVE').length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {personnel.filter(p => p.status === 'ACTIVE').slice(0, 8).map(p => (
                      <div key={p.id} className="flex items-center gap-3 rounded-lg px-3 py-2"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                          style={{ background: p.type === 'DIRECT' ? 'rgba(0,212,255,0.15)' : 'rgba(255,184,0,0.15)', color: p.type === 'DIRECT' ? 'var(--cyan)' : 'var(--amber)' }}>
                          {p.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: 'var(--text-1)' }}>{p.fullName}</p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{p.trade || p.position || '—'}</p>
                        </div>
                        <span className="text-xs flex-shrink-0"
                          style={{ color: p.type === 'DIRECT' ? 'var(--cyan)' : 'var(--amber)' }}>
                          {p.type === 'DIRECT' ? 'D' : 'I'}
                        </span>
                      </div>
                    ))}
                    {personnel.filter(p => p.status === 'ACTIVE').length === 0 && (
                      <p className="text-xs text-center py-3" style={{ color: 'var(--text-3)' }}>No personnel registered</p>
                    )}
                    {personnel.filter(p => p.status === 'ACTIVE').length > 8 && (
                      <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
                        + {personnel.filter(p => p.status === 'ACTIVE').length - 8} more
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="flex gap-4 flex-shrink-0 text-xs" style={{ color: 'var(--text-3)' }}>
        {[
          { label: 'Not Started',     value: allCells.filter(c => c.progress === 0).length,              color: '#4a5f85' },
          { label: 'In Progress',    value: allCells.filter(c => c.progress > 0 && c.progress < 100).length, color: '#00d4ff' },
          { label: 'Completed',      value: allCells.filter(c => c.progress === 100).length,             color: '#00d68f' },
          { label: 'Equipment',      value: equipment.length,                                            color: '#ffb800' },
          { label: 'Active Personnel',value: personnel.filter(p => p.status === 'ACTIVE').length,       color: '#8c3aff' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
            <span style={{ color: 'var(--text-3)' }}>{label} :</span>
            <span className="font-bold" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
