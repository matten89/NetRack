/**
 * NetRack DCIM - Device Interconnection Topology Map
 * Visual interactive map showing network links, cables, racks, ports, and protocols
 */
import React, { useState, useMemo } from 'react';
import { useDCIM } from '../context/DCIMContext';
import { Cable, Device } from '../types/dcim';
import {
  Network,
  Server,
  Zap,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Search,
  Layers,
  ArrowRight,
  Info,
  Radio,
  ExternalLink,
  Shield,
  Activity,
  CheckCircle2,
} from 'lucide-react';

interface DeviceTopologyMapProps {
  onSelectDevice?: (deviceId: string) => void;
}

export const DeviceTopologyMap: React.FC<DeviceTopologyMapProps> = ({ onSelectDevice }) => {
  const { state, openTerminal } = useDCIM();
  const [selectedRackFilter, setSelectedRackFilter] = useState<string>('ALL');
  const [selectedCableTypeFilter, setSelectedCableTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Filter devices to those with cables or rack assignment (or match search)
  const connectedDeviceIds = useMemo(() => {
    const ids = new Set<string>();
    state.cables.forEach((c) => {
      ids.add(c.pointA.deviceId);
      ids.add(c.pointB.deviceId);
    });
    return ids;
  }, [state.cables]);

  const displayedDevices = useMemo(() => {
    return state.devices.filter((dev) => {
      // Exclude modular sub-items like SFPs or modules from top-level nodes
      if (dev.category === 'MODULE' || dev.category === 'SFP') return false;

      // Filter by rack
      if (selectedRackFilter !== 'ALL' && dev.rackId !== selectedRackFilter) {
        return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesModel = dev.model.toLowerCase().includes(q);
        const matchesSN = dev.serialNumber.toLowerCase().includes(q);
        const matchesIP = dev.ipManagement.toLowerCase().includes(q);
        const matchesUser = dev.user.toLowerCase().includes(q);
        if (!matchesModel && !matchesSN && !matchesIP && !matchesUser) {
          return false;
        }
      }

      return true;
    });
  }, [state.devices, selectedRackFilter, searchQuery]);

  // Filtered cables
  const displayedCables = useMemo(() => {
    return state.cables.filter((cable) => {
      if (selectedCableTypeFilter !== 'ALL' && cable.type !== selectedCableTypeFilter) {
        return false;
      }
      if (selectedRackFilter !== 'ALL') {
        const devA = state.devices.find((d) => d.id === cable.pointA.deviceId);
        const devB = state.devices.find((d) => d.id === cable.pointB.deviceId);
        if (devA?.rackId !== selectedRackFilter && devB?.rackId !== selectedRackFilter) {
          return false;
        }
      }
      return true;
    });
  }, [state.cables, selectedCableTypeFilter, selectedRackFilter]);

  // Calculate rack column bounds for visual grouping
  const rackColumns = useMemo(() => {
    const racksMap: Record<string, { id: string; name: string; x: number; count: number }> = {};
    const rackSpacingX = 400;
    const rackStartX = 80;

    const uniqueRacks: string[] = [];
    displayedDevices.forEach((dev) => {
      const rKey = dev.rackId || 'UNASSIGNED';
      if (!uniqueRacks.includes(rKey)) uniqueRacks.push(rKey);
    });

    uniqueRacks.forEach((rackKey, idx) => {
      const rackObj = state.racks.find((r) => r.id === rackKey);
      const name = rackObj ? rackObj.name : 'Fuori Rack / Magazzino';
      racksMap[rackKey] = {
        id: rackKey,
        name,
        x: rackStartX + idx * rackSpacingX,
        count: displayedDevices.filter((d) => (d.rackId || 'UNASSIGNED') === rackKey).length,
      };
    });

    return racksMap;
  }, [displayedDevices, state.racks]);

  // Generate 2D visual layout coordinates for each device
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number; rackName: string; rackKey: string }> = {};

    const racksMap: Record<string, Device[]> = {};
    displayedDevices.forEach((dev) => {
      const rackKey = dev.rackId || 'UNASSIGNED';
      if (!racksMap[rackKey]) racksMap[rackKey] = [];
      racksMap[rackKey].push(dev);
    });

    const rackKeys = Object.keys(racksMap);
    const rackSpacingX = 400;
    const rackStartX = 80;
    const rackStartY = 90;

    rackKeys.forEach((rackKey, rackIdx) => {
      const rackDevs = racksMap[rackKey];
      rackDevs.sort((a, b) => (b.rackRU || 0) - (a.rackRU || 0));

      const rackObj = state.racks.find((r) => r.id === rackKey);
      const rackName = rackObj ? rackObj.name : 'Fuori Rack / Magazzino';

      rackDevs.forEach((dev, devIdx) => {
        positions[dev.id] = {
          x: rackStartX + rackIdx * rackSpacingX + 20,
          y: rackStartY + devIdx * 120,
          rackName,
          rackKey,
        };
      });
    });

    return positions;
  }, [displayedDevices, state.racks]);

  // Active selected cable or device details
  const activeLink = state.cables.find((c) => c.id === activeLinkId);
  const activeDevice = state.devices.find((d) => d.id === activeNodeId);

  return (
    <div className="space-y-4">
      {/* Top Filter and Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          {/* Rack Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              <span>Rack:</span>
            </span>
            <select
              value={selectedRackFilter}
              onChange={(e) => setSelectedRackFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Tutti i Rack ({state.racks.length})</option>
              {state.racks.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cable Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tipo Cavo:</span>
            </span>
            <select
              value={selectedCableTypeFilter}
              onChange={(e) => setSelectedCableTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Tutti i Cablaggi ({state.cables.length})</option>
              <option value="CAT6A">Rame Cat6A RJ45</option>
              <option value="CAT7">Rame Cat7 Shielded</option>
              <option value="FIBER_OM4">Fibra Multimode OM4</option>
              <option value="FIBER_OS2">Fibra Singlemode OS2</option>
              <option value="DAC_10G">DAC SFP+ 10G</option>
              <option value="DAC_100G">DAC QSFP28 100G</option>
            </select>
          </div>

          {/* Search Device / IP */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cerca apparato, IP o matricola..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 w-56 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              title="Riduci Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-2 text-slate-400">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              title="Aumenta Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 text-slate-400 hover:text-cyan-400 rounded hover:bg-slate-800"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-xs text-slate-400 font-mono hidden md:block">
            <span className="text-emerald-400 font-bold">{displayedDevices.length}</span> nodi &bull;{' '}
            <span className="text-cyan-400 font-bold">{displayedCables.length}</span> link attivi
          </div>
        </div>
      </div>

      {/* Main Interactive Canvas Container */}
      <div className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden min-h-[580px] shadow-2xl flex">
        {/* Topology Canvas Area */}
        <div className="flex-1 overflow-auto relative p-6 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top left',
              transition: 'transform 0.15s ease-out',
              minWidth: '1300px',
              minHeight: '850px',
              position: 'relative',
            }}
          >
            {/* Visual Rack Group Enclosures */}
            {Object.values(rackColumns).map((col) => (
              <div
                key={col.id}
                style={{
                  position: 'absolute',
                  left: `${col.x}px`,
                  top: '40px',
                  width: '320px',
                  height: `${Math.max(col.count * 120 + 90, 400)}px`,
                }}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3 pointer-events-none"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 font-mono text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{col.name}</span>
                  </span>
                  <span className="text-[10px] text-slate-500">{col.count} apparati</span>
                </div>
              </div>
            ))}

            {/* SVG Connecting Cables Layer */}
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ width: '100%', height: '100%' }}
            >
              <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {displayedCables.map((cable) => {
                const posA = nodePositions[cable.pointA.deviceId];
                const posB = nodePositions[cable.pointB.deviceId];

                if (!posA || !posB) return null;

                const isSameColumn = posA.rackKey === posB.rackKey;
                const isHighlighted =
                  activeLinkId === cable.id ||
                  activeNodeId === cable.pointA.deviceId ||
                  activeNodeId === cable.pointB.deviceId;

                let pathData = '';
                let midX = 0;
                let midY = 0;

                if (isSameColumn) {
                  // Intra-rack connection: loop out on the right side
                  const startX = posA.x + 260;
                  const startY = posA.y + 38;
                  const endX = posB.x + 260;
                  const endY = posB.y + 38;
                  const loopArc = Math.abs(endY - startY) * 0.35 + 50;

                  pathData = `M ${startX} ${startY} C ${startX + loopArc} ${startY}, ${
                    endX + loopArc
                  } ${endY}, ${endX} ${endY}`;
                  midX = startX + loopArc * 0.75;
                  midY = (startY + endY) / 2;
                } else {
                  // Inter-rack connection: from right side of left rack to left side of right rack
                  const isAtoLeft = posA.x < posB.x;
                  const startX = isAtoLeft ? posA.x + 260 : posA.x;
                  const startY = posA.y + 38;
                  const endX = isAtoLeft ? posB.x : posB.x + 260;
                  const endY = posB.y + 38;

                  const dx = Math.abs(endX - startX);
                  const curveOffset = Math.max(dx * 0.45, 60);
                  const dirA = isAtoLeft ? 1 : -1;
                  const dirB = isAtoLeft ? -1 : 1;

                  pathData = `M ${startX} ${startY} C ${startX + dirA * curveOffset} ${startY}, ${
                    endX + dirB * curveOffset
                  } ${endY}, ${endX} ${endY}`;
                  midX = (startX + endX) / 2;
                  midY = (startY + endY) / 2;
                }

                return (
                  <g key={cable.id} className="pointer-events-auto cursor-pointer">
                    {/* Invisible wide hit area for hover */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={18}
                      onClick={() => setActiveLinkId(cable.id)}
                      onMouseEnter={() => setActiveLinkId(cable.id)}
                    />

                    {/* Cable Glow effect when hovered */}
                    {isHighlighted && (
                      <path
                        d={pathData}
                        fill="none"
                        stroke={cable.color || '#06b6d4'}
                        strokeWidth={6}
                        strokeOpacity={0.5}
                        filter="url(#glow)"
                      />
                    )}

                    {/* Physical Cable Link Line */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={cable.color || '#3b82f6'}
                      strokeWidth={isHighlighted ? 3.5 : 2}
                      strokeDasharray={cable.type.includes('FIBER') ? '6 3' : 'none'}
                      className="transition-all"
                    />

                    {/* Midpoint Label Tag */}
                    {isHighlighted && (
                      <g
                        transform={`translate(${midX}, ${midY - 12})`}
                      >
                        <rect
                          x={-45}
                          y={-12}
                          width={90}
                          height={20}
                          rx={5}
                          fill="#0f172a"
                          stroke={cable.color || '#38bdf8'}
                          strokeWidth={1.5}
                        />
                        <text
                          x={0}
                          y={2}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize={9}
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {cable.cableNumber}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Device Nodes Layer */}
            {displayedDevices.map((dev) => {
              const pos = nodePositions[dev.id];
              if (!pos) return null;

              const brand = state.brands.find((b) => b.id === dev.brandId);
              const isSelected = activeNodeId === dev.id;
              const hasActiveLink =
                activeLink?.pointA.deviceId === dev.id || activeLink?.pointB.deviceId === dev.id;

              return (
                <div
                  key={dev.id}
                  onClick={() => {
                    setActiveNodeId(dev.id);
                    if (onSelectDevice) onSelectDevice(dev.id);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    width: '260px',
                  }}
                  className={`rounded-xl border p-3 cursor-pointer transition-all shadow-lg backdrop-blur-md ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-400 ring-2 ring-cyan-500/30 shadow-cyan-950/50'
                      : hasActiveLink
                      ? 'bg-slate-900/95 border-amber-400 ring-2 ring-amber-500/20'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  {/* Top Bar: Brand & Model */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow"
                        style={{ backgroundColor: brand?.color || '#049fd9' }}
                      />
                      <span className="font-bold text-xs text-white truncate">{dev.model}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          dev.isPoweredOn === 'SI' ? 'bg-emerald-400 shadow-emerald-500/50' : 'bg-slate-600'
                        }`}
                        title={dev.isPoweredOn === 'SI' ? 'Acceso (ON)' : 'Spento (OFF)'}
                      />
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                        {dev.category === 'PDU' ? 'PDU' : `U${dev.rackRU || '-'}`}
                      </span>
                    </div>
                  </div>

                  {/* Body: Location & IP */}
                  <div className="pt-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-mono">
                        {pos.rackName} {dev.rackFace ? `(${dev.rackFace})` : ''}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">SN: {dev.serialNumber.slice(-6)}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-0.5">
                      <span className="text-cyan-400 font-mono font-medium truncate max-w-[140px]">
                        {dev.ipManagement || 'Nessun IP Mgmt'}
                      </span>
                      {dev.ipManagement && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openTerminal(dev);
                          }}
                          className="px-1.5 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-[10px] font-mono flex items-center gap-1"
                          title="Apri console SSH"
                        >
                          <Zap className="w-2.5 h-2.5" />
                          <span>SSH</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Interfaces count & sub-items indicator */}
                  <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Network className="w-3 h-3 text-slate-500" />
                      <span>{dev.interfaces.length} porte</span>
                    </span>
                    {(dev.modules?.length > 0 || dev.sfps?.length > 0) && (
                      <span className="text-indigo-400 font-medium">
                        {dev.modules?.length ? `${dev.modules.length} mod ` : ''}
                        {dev.sfps?.length ? `${dev.sfps.length} sfp` : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Info Drawer (when device or cable is selected) */}
        {(activeLink || activeDevice) && (
          <div className="w-80 bg-slate-900/95 border-l border-slate-800 p-5 overflow-y-auto space-y-4 backdrop-blur-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>Dettaglio Elemento</span>
              </h3>
              <button
                onClick={() => {
                  setActiveLinkId(null);
                  setActiveNodeId(null);
                }}
                className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-slate-800"
              >
                Chiudi
              </button>
            </div>

            {/* Cable Details */}
            {activeLink && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] uppercase font-mono text-slate-500">Cavo Selezionato</div>
                  <div className="text-base font-bold text-white font-mono mt-0.5 flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: activeLink.color }}
                    />
                    <span>{activeLink.cableNumber}</span>
                  </div>
                  <div className="text-xs text-cyan-400 mt-1 font-medium">{activeLink.type}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Lunghezza: {activeLink.lengthMeters} metri</div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                    <div className="text-[10px] text-emerald-400 font-mono font-bold">ESTREMITÀ A (Origine)</div>
                    <div className="font-semibold text-white mt-0.5">
                      {state.devices.find((d) => d.id === activeLink.pointA.deviceId)?.model}
                    </div>
                    <div className="text-slate-400 font-mono text-[11px]">
                      Porta: <span className="text-emerald-300 font-bold">{activeLink.pointA.portName}</span>
                    </div>
                    <div className="text-slate-500 text-[10px]">
                      {activeLink.pointA.rackName} &bull; RU {activeLink.pointA.ru}
                    </div>
                  </div>

                  <div className="flex justify-center text-slate-500">
                    <ArrowRight className="w-4 h-4" />
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                    <div className="text-[10px] text-cyan-400 font-mono font-bold">ESTREMITÀ B (Destinazione)</div>
                    <div className="font-semibold text-white mt-0.5">
                      {state.devices.find((d) => d.id === activeLink.pointB.deviceId)?.model}
                    </div>
                    <div className="text-slate-400 font-mono text-[11px]">
                      Porta: <span className="text-cyan-300 font-bold">{activeLink.pointB.portName}</span>
                    </div>
                    <div className="text-slate-500 text-[10px]">
                      {activeLink.pointB.rackName} &bull; RU {activeLink.pointB.ru}
                    </div>
                  </div>
                </div>

                {activeLink.notes && (
                  <div className="text-xs text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono">
                    Note: {activeLink.notes}
                  </div>
                )}
              </div>
            )}

            {/* Device Details */}
            {activeDevice && (
              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] uppercase font-mono text-slate-500">Apparato Negoziato</div>
                  <div className="text-sm font-bold text-white mt-0.5">{activeDevice.model}</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">SN: {activeDevice.serialNumber}</div>
                  <div className="text-xs text-cyan-400 font-mono mt-1">{activeDevice.ipManagement}</div>
                </div>

                {/* Sub items attached */}
                {activeDevice.modules?.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-white uppercase tracking-wider mb-1 font-mono">
                      Moduli / Schede ({activeDevice.modules.length})
                    </div>
                    <div className="space-y-1">
                      {activeDevice.modules.map((m) => (
                        <div key={m.id} className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px]">
                          <div className="font-semibold text-slate-200">{m.model}</div>
                          <div className="text-slate-500 font-mono text-[10px]">{m.slotName} &bull; {m.type}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeDevice.sfps?.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-white uppercase tracking-wider mb-1 font-mono">
                      Transceiver SFP ({activeDevice.sfps.length})
                    </div>
                    <div className="space-y-1">
                      {activeDevice.sfps.map((s) => (
                        <div key={s.id} className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px]">
                          <div className="font-semibold text-amber-300">{s.type} ({s.vendor})</div>
                          <div className="text-slate-500 font-mono text-[10px]">{s.interfaceName} &bull; {s.connector}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeDevice.ipManagement && (
                  <button
                    onClick={() => openTerminal(activeDevice)}
                    className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/40"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Lancia Sessione SSH</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold text-slate-300 font-mono">LEGENDA CABLAGGI:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded bg-[#16a34a]" /> Cat6A Rame
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded bg-[#9333ea]" /> Fibra OM4
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded bg-[#eab308]" /> Fibra OS2
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded bg-[#0284c7]" /> DAC 10G
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded bg-[#06b6d4]" /> DAC 100G
          </span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          Fai click su una linea o apparato per consultare il punto A &amp; punto B
        </div>
      </div>
    </div>
  );
};
