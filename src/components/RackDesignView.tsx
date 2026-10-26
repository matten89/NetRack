/**
 * NetRack DCIM - Rack Design & Interactive Elevation
 * Supports Front & Rear Management, Dual Side-by-Side View, Shelves, and Power Strips (PDUs: Schuko / Bipasso)
 */
import React, { useState } from 'react';
import { useDCIM } from '../context/DCIMContext';
import { RackFace, Device, SocketType, RackInstalledItem } from '../types/dcim';
import { getOccupiedRUs, canInstallItem, getFreeRUs } from '../utils/rackEngine';
import { getSiteHierarchyBreadcrumb } from '../utils/validation';
import {
  Server,
  Plus,
  Trash2,
  Layers,
  HardDrive,
  Eye,
  CheckCircle2,
  X,
  ExternalLink,
  Shield,
  Zap,
  Box,
  SplitSquareVertical,
  Columns2,
  Sliders,
  Plug,
} from 'lucide-react';

export const RackDesignView: React.FC = () => {
  const {
    state,
    selectedRackId,
    setSelectedRackId,
    addRack,
    deleteRack,
    mountDeviceToRack,
    installPDUToRack,
    addShelfToRack,
    mountDeviceToShelf,
    unmountRackItem,
    openTerminal,
  } = useDCIM();

  // View mode: 'FRONT' | 'REAR' | 'BOTH' (Affiancato Fronte + Retro)
  const [viewMode, setViewMode] = useState<'FRONT' | 'REAR' | 'BOTH'>('BOTH');
  const [showNewRackModal, setShowNewRackModal] = useState(false);
  
  // Standard Device or Shelf mount modal
  const [showMountModal, setShowMountModal] = useState<{
    targetRU: number;
    face: RackFace;
    isShelfMount?: boolean;
    shelfItemId?: string;
    shelfSlotIndex?: number;
  } | null>(null);

  // Dedicated PDU Installation modal
  const [showPduModal, setShowPduModal] = useState<{
    targetRU?: number;
    face?: RackFace;
  } | null>(null);

  // New Rack Form state
  const [newRackName, setNewRackName] = useState('');
  const [newRackRU, setNewRackRU] = useState<number>(42);
  const [newRackSiteId, setNewRackSiteId] = useState(state.sites[0]?.id || '');
  const [newRackPower, setNewRackPower] = useState<number>(8000);
  const [newRackNotes, setNewRackNotes] = useState('');

  // New PDU Form state
  const [pduModel, setPduModel] = useState('PDU Rack 19" 8x Bipasso');
  const [pduBrandId, setPduBrandId] = useState(state.brands.find((b) => b.id === 'bticino')?.id || state.brands[0]?.id || '');
  const [pduSerialNumber, setPduSerialNumber] = useState(`PDU-${Date.now().toString().slice(-6)}`);
  const [pduSocketCount, setPduSocketCount] = useState<number>(8);
  const [pduSocketType, setPduSocketType] = useState<SocketType>('ITALIAN_BIPASSO');
  const [pduTargetRU, setPduTargetRU] = useState<number>(1);
  const [pduTargetFace, setPduTargetFace] = useState<RackFace>('REAR');
  const [pduBreakerAmps, setPduBreakerAmps] = useState<number>(16);
  const [pduUser, setPduUser] = useState('Facility & Power Management');
  const [pduNotes, setPduNotes] = useState('');

  // Find active rack
  const currentRack = state.racks.find((r) => r.id === selectedRackId) || state.racks[0];

  if (!currentRack) {
    return (
      <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800">
        <Server className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-white">Nessun Rack Censito</h3>
        <p className="text-xs text-slate-400 mb-4">Crea il tuo primo rack per iniziare a posizionare gli apparati e le ciabatte.</p>
        <button
          onClick={() => setShowNewRackModal(true)}
          className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-semibold"
        >
          Crea Rack
        </button>
      </div>
    );
  }

  // Calculate occupied and free RUs for FRONT and REAR
  const frontOccupiedMap = getOccupiedRUs(currentRack.id, state.rackItems, 'FRONT');
  const rearOccupiedMap = getOccupiedRUs(currentRack.id, state.rackItems, 'REAR');

  const frontUsedRUCount = frontOccupiedMap.size;
  const rearUsedRUCount = rearOccupiedMap.size;
  const frontFreeRUCount = currentRack.totalRU - frontUsedRUCount;
  const rearFreeRUCount = currentRack.totalRU - rearUsedRUCount;

  // Unmounted devices in inventory that can be installed directly
  const unmountedStandardDevices = state.devices.filter(
    (d) => !d.rackId && !d.isNonRackable && d.category !== 'MODULE' && d.category !== 'SFP'
  );

  // Non-rackable devices for shelf installation
  const unmountedShelfDevices = state.devices.filter(
    (d) => !d.rackId && d.isNonRackable
  );

  const handleCreateRack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRackName.trim()) return;

    addRack({
      name: newRackName.trim(),
      totalRU: newRackRU,
      siteNodeId: newRackSiteId,
      maxPowerWatts: newRackPower,
      notes: newRackNotes.trim(),
    });

    setShowNewRackModal(false);
    setNewRackName('');
  };

  const handleQuickAddShelf = (startRU: number, face: RackFace) => {
    const res = addShelfToRack(currentRack.id, startRU, 1, face);
    if (!res.success) {
      alert(res.error || 'Impossibile installare la mensola in questo RU.');
    }
  };

  const handleOpenPduModal = (targetRU?: number, face?: RackFace) => {
    const ru = targetRU || 1;
    const f = face || 'REAR';
    setPduTargetRU(ru);
    setPduTargetFace(f);
    setPduSerialNumber(`PDU-${Date.now().toString().slice(-6)}`);
    setShowPduModal({ targetRU: ru, face: f });
  };

  const handleInstallPDU = (e: React.FormEvent) => {
    e.preventDefault();
    const res = installPDUToRack(currentRack.id, pduTargetRU, pduTargetFace, {
      model: pduModel.trim(),
      brandId: pduBrandId,
      serialNumber: pduSerialNumber.trim(),
      socketCount: pduSocketCount,
      socketType: pduSocketType,
      circuitBreakerAmps: pduBreakerAmps,
      user: pduUser.trim(),
      notes: pduNotes.trim(),
    });

    if (res.success) {
      setShowPduModal(null);
    } else {
      alert(res.error || 'Impossibile installare la ciabatta di alimentazione');
    }
  };

  /**
   * Helper to render realistic PDU socket shapes:
   * - Schuko: circular outlet with brass earth clips and 2 pin holes
   * - Italian Bipasso: characteristic 3 double-gauge aligned holes (P17/11 10/16A)
   */
  const renderSocketIcon = (type: SocketType, index: number, isUsed = false) => {
    const actualType =
      type === 'MIXED' ? (index % 2 === 0 ? 'SCHUKO' : 'ITALIAN_BIPASSO') : type;

    if (actualType === 'SCHUKO') {
      return (
        <div
          key={index}
          className={`relative w-6 h-6 rounded-full bg-slate-950 border ${
            isUsed ? 'border-amber-400' : 'border-slate-700'
          } flex items-center justify-center shadow-inner group/sock shrink-0`}
          title={`Presa Schuko 16A #${index + 1} (${isUsed ? 'Connessa' : 'Libera'})`}
        >
          {/* Ground clips top & bottom */}
          <span className="absolute top-0.5 w-1 h-0.5 bg-amber-400/90 rounded-xs" />
          <span className="absolute bottom-0.5 w-1 h-0.5 bg-amber-400/90 rounded-xs" />
          {/* 2 pin holes */}
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-slate-800 border border-slate-900" />
            <span className="w-1 h-1 rounded-full bg-slate-800 border border-slate-900" />
          </div>
        </div>
      );
    }

    if (actualType === 'ITALIAN_BIPASSO') {
      return (
        <div
          key={index}
          className={`relative w-4 h-6 rounded bg-slate-950 border ${
            isUsed ? 'border-cyan-400' : 'border-slate-700'
          } flex flex-col items-center justify-between py-1 shadow-inner group/sock shrink-0`}
          title={`Presa Italiana Bipasso 10/16A #${index + 1} (${isUsed ? 'Connessa' : 'Libera'})`}
        >
          {/* Fase (Bipasso double-slot) */}
          <div className="w-2 h-0.5 bg-slate-800 rounded-full" />
          {/* Terra centrale */}
          <div className="w-1 h-1 bg-slate-800 rounded-full" />
          {/* Neutro (Bipasso double-slot) */}
          <div className="w-2 h-0.5 bg-slate-800 rounded-full" />
        </div>
      );
    }

    // Default IEC C13
    return (
      <div
        key={index}
        className="w-4 h-6 rounded bg-slate-950 border border-slate-700 flex flex-col items-center justify-center gap-0.5 shrink-0"
        title={`Presa IEC C13 #${index + 1}`}
      >
        <span className="w-2 h-0.5 bg-slate-700 rounded-xs" />
        <span className="w-2 h-0.5 bg-slate-700 rounded-xs" />
        <span className="w-1.5 h-0.5 bg-slate-700 rounded-xs" />
      </div>
    );
  };

  /**
   * Render single elevation column for a specific face (FRONT or REAR)
   */
  const renderRackElevationColumn = (face: RackFace) => {
    const occupiedMap = face === 'FRONT' ? frontOccupiedMap : rearOccupiedMap;
    const isFront = face === 'FRONT';

    return (
      <div className="flex-1 bg-slate-950 border-4 border-slate-800 rounded-2xl p-3 shadow-2xl relative min-w-[340px]">
        {/* Top Header Panel */}
        <div className="bg-slate-900 border-b-2 border-slate-800 py-2 px-4 mb-2.5 rounded-t-xl flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isFront ? 'bg-cyan-400 shadow-cyan-400/50' : 'bg-indigo-400 shadow-indigo-400/50'
              } shadow`}
            />
            <span className="text-white font-bold tracking-wider">
              {isFront ? 'VISTA FRONTALE' : 'VISTA POSTERIORE (RETRO)'}
            </span>
          </div>
          <span className="text-slate-400 text-[11px]">
            {isFront ? `${frontUsedRUCount}/${currentRack.totalRU} RU` : `${rearUsedRUCount}/${currentRack.totalRU} RU`}
          </span>
        </div>

        {/* Elevation Unit Rows (From Top RU down to 1) */}
        <div className="space-y-1">
          {Array.from({ length: currentRack.totalRU }, (_, i) => currentRack.totalRU - i).map((ru) => {
            const occupant = occupiedMap.get(ru);

            // Occupied RU
            if (occupant) {
              if (!occupant.isBaseRU) return null; // part of a multi-RU device

              const item = occupant.item;
              const dev = item.deviceId ? state.devices.find((d) => d.id === item.deviceId) : null;
              const brand = dev ? state.brands.find((b) => b.id === dev.brandId) : null;

              // 1. RENDER PDU / CIABATTA DI ALIMENTAZIONE
              if (item.isPDU || dev?.category === 'PDU') {
                const pduCfg = item.pduConfig || dev?.pduConfig || {
                  socketCount: 8,
                  socketType: 'ITALIAN_BIPASSO' as SocketType,
                  circuitBreakerAmps: 16,
                };

                return (
                  <div
                    key={`ru-${face}-${ru}`}
                    style={{ height: `${item.heightRU * 46}px` }}
                    className="rounded-lg bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-2 border-amber-500/80 p-2 flex items-center justify-between shadow-lg relative group transition-all"
                  >
                    {/* Left: RU Badge & PDU Model & Illuminated Switch */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-7 rounded bg-amber-950/70 border border-amber-600/70 flex items-center justify-center font-mono font-bold text-amber-300 text-xs shrink-0">
                        U{ru}
                      </div>

                      <div className="flex items-center gap-2 min-w-0">
                        {/* Red Illuminated Neon Power Switch */}
                        <div
                          className="w-5 h-7 rounded bg-red-950 border border-red-500 flex flex-col items-center justify-center text-[8px] font-bold text-red-200 shadow-md shadow-red-900/60 shrink-0"
                          title="Interruttore Magnetotermico 16A Luminoso (ON)"
                        >
                          <Zap className="w-2.5 h-2.5 text-amber-300 animate-pulse" />
                          <span className="scale-75">I</span>
                        </div>

                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                            <span className="text-amber-400 font-mono text-[10px] uppercase px-1 py-0.2 rounded bg-amber-950/80 border border-amber-700/50">
                              PDU 19"
                            </span>
                            <span className="truncate">{dev?.model || 'Ciabatta di Alimentazione'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {pduCfg.socketCount}x {pduCfg.socketType === 'ITALIAN_BIPASSO' ? 'Bipasso 10/16A' : pduCfg.socketType} &bull; {pduCfg.circuitBreakerAmps || 16}A
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Realistic Sockets rendering */}
                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-black/60 border border-slate-800 overflow-x-auto max-w-[200px] shrink-0">
                      {Array.from({ length: Math.min(pduCfg.socketCount, 12) }).map((_, sIdx) =>
                        renderSocketIcon(pduCfg.socketType, sIdx, sIdx < (pduCfg.usedSockets || 3))
                      )}
                      {pduCfg.socketCount > 12 && (
                        <span className="text-[9px] text-slate-500 font-mono">+{pduCfg.socketCount - 12}</span>
                      )}
                    </div>

                    {/* Right: Unmount Action */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => unmountRackItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                        title="Smonta questa ciabatta dal rack"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              }

              // 2. RENDER SHELF (MENSOLA)
              if (item.isShelf) {
                return (
                  <div
                    key={`ru-${face}-${ru}`}
                    style={{ height: `${item.heightRU * 46}px` }}
                    className="rounded-lg bg-amber-950/30 border-2 border-amber-600/70 p-2 flex flex-col justify-between shadow-inner relative group"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono border-b border-amber-800/40 pb-1">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.2 rounded bg-amber-900 text-amber-200 font-bold">
                          U{ru} {item.heightRU > 1 ? `- U${ru + item.heightRU - 1}` : ''}
                        </span>
                        <span className="font-semibold text-amber-300 flex items-center gap-1">
                          <Box className="w-3.5 h-3.5" />
                          <span>MENSOLA MULTI-DEVICE ({item.heightRU} RU)</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-[10px]">
                          {item.shelfSubSlots?.filter((s) => s.deviceId).length || 0}/3 montati
                        </span>
                        <button
                          onClick={() => unmountRackItem(item.id)}
                          className="p-0.5 text-slate-400 hover:text-rose-400 rounded"
                          title="Rimuovi mensola dal rack"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Sub-slots inside shelf */}
                    <div className="grid grid-cols-3 gap-2 flex-1 pt-1.5">
                      {[0, 1, 2].map((slotIdx) => {
                        const subSlot = item.shelfSubSlots?.find((s) => s.slotIndex === slotIdx);
                        const subDev = subSlot?.deviceId
                          ? state.devices.find((d) => d.id === subSlot.deviceId)
                          : null;
                        const subBrand = subDev ? state.brands.find((b) => b.id === subDev.brandId) : null;

                        return (
                          <div
                            key={slotIdx}
                            className={`rounded border p-1.5 flex flex-col justify-between text-[11px] transition-all ${
                              subDev
                                ? 'bg-slate-900/90 border-slate-700'
                                : 'bg-slate-950/60 border-dashed border-slate-800 hover:border-amber-500/50'
                            }`}
                          >
                            {subDev ? (
                              <>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{ backgroundColor: subBrand?.color || '#049fd9' }}
                                    />
                                    <span className="font-bold text-white truncate max-w-[80px]">
                                      {subDev.model}
                                    </span>
                                  </div>
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      subDev.isPoweredOn === 'SI' ? 'bg-emerald-400' : 'bg-slate-600'
                                    }`}
                                  />
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono truncate">
                                  SN: {subDev.serialNumber}
                                </div>
                                <div className="flex items-center justify-between text-[10px] pt-1">
                                  <span className="text-cyan-400 font-mono truncate max-w-[70px]">
                                    {subDev.ipManagement || 'No IP'}
                                  </span>
                                  {subDev.ipManagement && (
                                    <button
                                      onClick={() => openTerminal(subDev)}
                                      className="text-emerald-400 hover:text-emerald-300 font-semibold text-[9px]"
                                    >
                                      SSH
                                    </button>
                                  )}
                                </div>
                              </>
                            ) : (
                              <button
                                onClick={() =>
                                  setShowMountModal({
                                    targetRU: ru,
                                    face,
                                    isShelfMount: true,
                                    shelfItemId: item.id,
                                    shelfSlotIndex: slotIdx,
                                  })
                                }
                                className="w-full h-full flex flex-col items-center justify-center text-slate-500 hover:text-amber-400 transition-colors py-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span className="text-[10px]">Slot {slotIdx + 1} Libero</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // 3. RENDER STANDARD EQUIPMENT FACEPLATE
              return (
                <div
                  key={`ru-${face}-${ru}`}
                  style={{ height: `${item.heightRU * 46}px` }}
                  className="rounded-lg bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-2 border-cyan-600/80 p-2 flex items-center justify-between shadow-lg relative group"
                >
                  {/* Left RU Badge & Brand Pill */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-7 rounded bg-slate-950 border border-slate-700 flex items-center justify-center font-mono font-bold text-cyan-400 text-xs shrink-0">
                      U{ru}
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 shadow"
                        style={{ backgroundColor: brand?.color || '#049fd9' }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white flex items-center gap-2 truncate">
                          <span className="truncate">{dev?.model || 'Apparato'}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({dev?.heightRU || item.heightRU} RU)
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          SN: <span className="text-cyan-300">{dev?.serialNumber}</span> &bull; {dev?.user || 'Nessuno'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Port Activity lights */}
                  <div className="hidden sm:flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800 shrink-0">
                    {Array.from({ length: 6 }).map((_, pIdx) => (
                      <span
                        key={pIdx}
                        className={`w-1.5 h-1.5 rounded-full ${
                          pIdx % 3 === 0 ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-600'
                        }`}
                      />
                    ))}
                    <span className="text-[10px] text-slate-400 font-mono ml-1">
                      {dev?.interfaces?.length || 0} porte
                    </span>
                  </div>

                  {/* Right: IP & Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {dev?.ipManagement && (
                      <button
                        onClick={() => openTerminal(dev)}
                        className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-[11px] font-mono flex items-center gap-1 shadow"
                        title="Apri Terminale SSH"
                      >
                        <Zap className="w-3 h-3" />
                        <span className="truncate max-w-[80px]">{dev.ipManagement}</span>
                      </button>
                    )}

                    <button
                      onClick={() => unmountRackItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                      title="Smonta apparato dal rack"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            }

            // EMPTY RU SLOT
            return (
              <div
                key={`ru-${face}-${ru}`}
                className="h-10 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/50 p-2 flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <span className="w-8 text-center text-xs font-mono font-semibold text-slate-500 group-hover:text-cyan-400">
                    U{ru}
                  </span>
                  <span className="text-[11px] text-slate-600 font-mono group-hover:text-slate-400">
                    RU Libera ({face === 'FRONT' ? 'Fronte' : 'Retro'})
                  </span>
                </div>

                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Quick Install PDU button */}
                  <button
                    onClick={() => handleOpenPduModal(ru, face)}
                    className="px-2 py-1 rounded bg-amber-950/70 hover:bg-amber-900 border border-amber-700 text-amber-300 text-[10px] font-medium flex items-center gap-1"
                    title="Installa ciabatta PDU con prese Schuko o Bipasso"
                  >
                    <Plug className="w-3 h-3" />
                    <span>+ PDU</span>
                  </button>

                  {/* Quick Add Shelf */}
                  <button
                    onClick={() => handleQuickAddShelf(ru, face)}
                    className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-300 text-[10px] font-medium flex items-center gap-1"
                    title="Inserisci mensola multi-device"
                  >
                    <Box className="w-3 h-3" />
                    <span>+ Mensola</span>
                  </button>

                  {/* Mount standard device */}
                  <button
                    onClick={() => setShowMountModal({ targetRU: ru, face })}
                    className="px-2 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800 text-cyan-300 text-[10px] font-medium flex items-center gap-1"
                    title="Monta apparato da inventario"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Monta</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Rack Footer */}
        <div className="bg-slate-900 border-t-2 border-slate-800 py-1.5 px-4 mt-2 rounded-b-xl flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>RACK BOTTOM &bull; {currentRack.name}</span>
          <span>{isFront ? 'AIR INTAKE' : 'HOT AISLE / PDU FEED'}</span>
          <span>U1 (Base)</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Rack Selector & Top Controls */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-800 flex items-center justify-center text-blue-400">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedRackId}
                  onChange={(e) => setSelectedRackId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-cyan-500"
                >
                  {state.racks.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.totalRU} RU)
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewRackModal(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold flex items-center gap-1 border border-slate-700"
                  title="Aggiungi nuovo rack"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuovo Rack</span>
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Posizione: <strong className="text-slate-200">{getSiteHierarchyBreadcrumb(currentRack.siteNodeId, state.sites)}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher: FRONTE / RETRO / AFFIANCATO */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('BOTH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'BOTH'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-950/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>AFFIANCATO (Fronte + Retro)</span>
            </button>
            <button
              onClick={() => setViewMode('FRONT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'FRONT'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Solo Fronte</span>
            </button>
            <button
              onClick={() => setViewMode('REAR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'REAR'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Solo Retro</span>
            </button>
          </div>

          {/* Quick Add PDU Button */}
          <button
            onClick={() => handleOpenPduModal(1, 'REAR')}
            className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-amber-950/40"
            title="Installa ciabatta di alimentazione PDU (Schuko o Bipasso)"
          >
            <Plug className="w-4 h-4" />
            <span>+ Installa Ciabatta PDU</span>
          </button>

          <button
            onClick={() => {
              if (confirm(`Sei sicuro di voler eliminare il rack "${currentRack.name}" e liberare tutti gli apparati?`)) {
                deleteRack(currentRack.id);
              }
            }}
            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors"
            title="Elimina questo Rack"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Rack Statistics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400 uppercase font-mono">Altezza Rack</div>
          <div className="text-xl font-bold text-white mt-1">{currentRack.totalRU} RU</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Standard 19 pollici EIA-310</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400 uppercase font-mono">RU Occupate Fronte / Retro</div>
          <div className="text-lg font-bold text-cyan-400 mt-1">
            {frontUsedRUCount} <span className="text-xs text-slate-400 font-normal">Fronte</span> &bull;{' '}
            <span className="text-indigo-400">{rearUsedRUCount}</span>{' '}
            <span className="text-xs text-slate-400 font-normal">Retro</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Liberi: {frontFreeRUCount}U (F) / {rearFreeRUCount}U (R)
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400 uppercase font-mono">Ciabatte &amp; PDU Installate</div>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {state.rackItems.filter((i) => i.rackId === currentRack.id && (i.isPDU || i.pduConfig)).length} PDU
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Schuko &amp; Bipasso 10/16A</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400 uppercase font-mono">Alimentazione Massima</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{currentRack.maxPowerWatts || 8000} W</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Doppio feed A/B ridondato</div>
        </div>
      </div>

      {/* Rack Elevation Visualizer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 mb-6 gap-2">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <SplitSquareVertical className="w-4 h-4 text-cyan-400" />
              <span>
                Elevazione Rack: {currentRack.name} &bull;{' '}
                {viewMode === 'BOTH' ? 'Vista Affiancata Fronte & Retro' : viewMode === 'FRONT' ? 'Vista Frontale' : 'Vista Posteriore'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Gestisci l'allocazione delle unità RU, monta apparati, inserisci mensole multi-dispositivo e installa ciabatte PDU
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded bg-cyan-900/60 border border-cyan-500" /> Apparato
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded bg-amber-900/60 border border-amber-500" /> Ciabatta PDU
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded bg-yellow-900/60 border border-yellow-500" /> Mensola
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded bg-slate-950 border border-slate-800" /> RU Libera
            </span>
          </div>
        </div>

        {/* Dynamic Column Layout */}
        {viewMode === 'BOTH' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-7xl mx-auto">
            {renderRackElevationColumn('FRONT')}
            {renderRackElevationColumn('REAR')}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {renderRackElevationColumn(viewMode)}
          </div>
        )}
      </div>

      {/* Modal: Installa Ciabatta di Alimentazione (PDU) */}
      {showPduModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div className="flex items-center gap-2">
                <Plug className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Installa Ciabatta di Alimentazione (PDU)</h3>
              </div>
              <button onClick={() => setShowPduModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInstallPDU} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Modello / Descrizione Ciabatta:</label>
                <input
                  type="text"
                  required
                  value={pduModel}
                  onChange={(e) => setPduModel(e.target.value)}
                  placeholder="es. PDU Rack 19 pollici 8x Bipasso 16A"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Marca Produttore:</label>
                  <select
                    value={pduBrandId}
                    onChange={(e) => setPduBrandId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-amber-500"
                  >
                    {state.brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Numero Seriale (S/N):</label>
                  <input
                    type="text"
                    required
                    value={pduSerialNumber}
                    onChange={(e) => setPduSerialNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Sockets Configuration: Count & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Numero di Prese:</label>
                  <select
                    value={pduSocketCount}
                    onChange={(e) => setPduSocketCount(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-amber-500 font-mono font-bold"
                  >
                    <option value={4}>4 Prese</option>
                    <option value={6}>6 Prese</option>
                    <option value={8}>8 Prese (Standard 19")</option>
                    <option value={10}>10 Prese</option>
                    <option value={12}>12 Prese</option>
                    <option value={16}>16 Prese</option>
                    <option value={24}>24 Prese (Verticale 0U / 2U)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tipologia di Prese:</label>
                  <select
                    value={pduSocketType}
                    onChange={(e) => setPduSocketType(e.target.value as SocketType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-semibold text-xs outline-none focus:border-amber-500"
                  >
                    <option value="ITALIAN_BIPASSO">🇮🇹 Prese Italiane Bipasso (10/16A P17/11)</option>
                    <option value="SCHUKO">🇩🇪 Prese Schuko (Tedesca CEE 7/4)</option>
                    <option value="MIXED">⚡ Miste (Schuko + Bipasso alternate)</option>
                    <option value="IEC_C13">🔌 IEC C13 (Standard Server)</option>
                  </select>
                </div>
              </div>

              {/* Position: RU and Face */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Unità RU:</label>
                  <select
                    value={pduTargetRU}
                    onChange={(e) => setPduTargetRU(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-amber-500 font-mono"
                  >
                    {Array.from({ length: currentRack.totalRU }, (_, i) => i + 1).map((ru) => (
                      <option key={ru} value={ru}>
                        RU {ru}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Lato di Montaggio:</label>
                  <select
                    value={pduTargetFace}
                    onChange={(e) => setPduTargetFace(e.target.value as RackFace)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="REAR">RETRO (Consigliato per PDU)</option>
                    <option value="FRONT">FRONTE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Magnetotermico:</label>
                  <select
                    value={pduBreakerAmps}
                    onChange={(e) => setPduBreakerAmps(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-amber-500 font-mono"
                  >
                    <option value={16}>16A (3680W)</option>
                    <option value={32}>32A (7360W)</option>
                    <option value={10}>10A (2300W)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Utilizzatore / Responsabile:</label>
                <input
                  type="text"
                  value={pduUser}
                  onChange={(e) => setPduUser(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Note (max 300 car.):</label>
                <textarea
                  maxLength={300}
                  value={pduNotes}
                  onChange={(e) => setPduNotes(e.target.value)}
                  placeholder="es. Alimentata da UPS Gruppo A, quadro Q1..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-amber-500 h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPduModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-amber-900/40"
                >
                  <Plug className="w-4 h-4" />
                  <span>Conferma e Installa PDU</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Mount Device To RU / Shelf */}
      {showMountModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  {showMountModal.isShelfMount
                    ? `Installa Apparato su Mensola (Slot ${(showMountModal.shelfSlotIndex || 0) + 1})`
                    : `Installa Apparato al RU ${showMountModal.targetRU} (${showMountModal.face === 'FRONT' ? 'Fronte' : 'Retro'})`}
                </h3>
              </div>
              <button onClick={() => setShowMountModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-400">
                {showMountModal.isShelfMount
                  ? 'Seleziona un piccolo apparato o mini-dispositivo non-rackable da alloggiare nella mensola:'
                  : `Seleziona un apparato presente in inventario da posizionare sul rack ${currentRack.name} a partire dal RU ${showMountModal.targetRU}:`}
              </p>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {(showMountModal.isShelfMount ? unmountedShelfDevices : unmountedStandardDevices).length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                    Nessun apparato disponibile in inventario per questa tipologia di montaggio.
                  </div>
                ) : (
                  (showMountModal.isShelfMount ? unmountedShelfDevices : unmountedStandardDevices).map((dev) => {
                    const brand = state.brands.find((b) => b.id === dev.brandId);
                    return (
                      <div
                        key={dev.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500 flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: brand?.color || '#049fd9' }}
                            />
                            <span>{dev.model}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({dev.heightRU} RU)</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            SN: {dev.serialNumber} &bull; {dev.user}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (showMountModal.isShelfMount && showMountModal.shelfItemId) {
                              mountDeviceToShelf(
                                showMountModal.shelfItemId,
                                showMountModal.shelfSlotIndex || 0,
                                dev.id
                              );
                              setShowMountModal(null);
                            } else {
                              const res = mountDeviceToRack(
                                currentRack.id,
                                dev.id,
                                showMountModal.targetRU,
                                dev.heightRU,
                                showMountModal.face
                              );
                              if (res.success) {
                                setShowMountModal(null);
                              } else {
                                alert(res.error || 'Impossibile montare apparato');
                              }
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors"
                        >
                          Installa
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowMountModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Rack */}
      {showNewRackModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <h3 className="text-base font-bold text-white">Aggiungi Nuovo Rack</h3>
              <button onClick={() => setShowNewRackModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRack} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome del Rack:</label>
                <input
                  type="text"
                  required
                  value={newRackName}
                  onChange={(e) => setNewRackName(e.target.value)}
                  placeholder="es. Rack A-03 (Storage SAN)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Dimensioni (RU):</label>
                  <select
                    value={newRackRU}
                    onChange={(e) => setNewRackRU(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value={12}>12 RU (Small Wallmount)</option>
                    <option value={24}>24 RU (Half-Height)</option>
                    <option value={42}>42 RU (Full-Height Standard)</option>
                    <option value={48}>48 RU (Tall Telco)</option>
                    <option value={52}>52 RU (Hyper-Scale)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Potenza Max (Watts):</label>
                  <input
                    type="number"
                    value={newRackPower}
                    onChange={(e) => setNewRackPower(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Posizione Gerarchica Sito:
                </label>
                <select
                  value={newRackSiteId}
                  onChange={(e) => setNewRackSiteId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                >
                  {state.sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.levelName}] {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Note:</label>
                <textarea
                  value={newRackNotes}
                  onChange={(e) => setNewRackNotes(e.target.value)}
                  placeholder="Informazioni PDU, corridoio o vincoli..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewRackModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                >
                  Crea Rack
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
