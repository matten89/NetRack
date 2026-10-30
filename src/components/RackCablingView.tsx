/**
 * NetRack DCIM - Rack Cabling (Point A to Point B) & LLDP/CDP Network Discovery
 */
import React, { useState } from 'react';
import { useDCIM } from '../context/DCIMContext';
import { Cable, LLDPNeighbor } from '../types/dcim';
import { DeviceTopologyMap } from './DeviceTopologyMap';
import {
  Network,
  Plus,
  Trash2,
  Radio,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  X,
  Zap,
  Activity,
  Layers,
} from 'lucide-react';

const CABLE_TYPES = [
  { id: 'CAT6A', label: 'Rame Cat6A RJ45', defaultColor: '#16a34a' },
  { id: 'CAT7', label: 'Rame Cat7 Shielded', defaultColor: '#059669' },
  { id: 'FIBER_OM4', label: 'Fibra Multimode OM4 (LC/MPO)', defaultColor: '#9333ea' },
  { id: 'FIBER_OS2', label: 'Fibra Singlemode OS2 (LC)', defaultColor: '#eab308' },
  { id: 'DAC_10G', label: 'Cavo Diretto DAC SFP+ 10G', defaultColor: '#0284c7' },
  { id: 'DAC_100G', label: 'Cavo Diretto DAC QSFP28 100G', defaultColor: '#06b6d4' },
];

export const RackCablingView: React.FC = () => {
  const { state, addCable, deleteCable, runDiscoveryOnDevice, runGlobalDiscovery } = useDCIM();
  const [showAddCableModal, setShowAddCableModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'matrix' | 'discovery' | 'topology'>('topology');
  const [globalDiscoveryStatus, setGlobalDiscoveryStatus] = useState<string | null>(null);

  // Discovery state
  const [selectedDiscoveryDeviceId, setSelectedDiscoveryDeviceId] = useState<string>(
    state.devices[0]?.id || ''
  );
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const handleRunGlobalDiscovery = () => {
    const res = runGlobalDiscovery();
    setGlobalDiscoveryStatus(
      `Scansione completata: ${res.scannedCount} apparati scansionati, ${res.newCablesCount} nuovi collegamenti registrati nella mappa di cablaggio!`
    );
    setTimeout(() => setGlobalDiscoveryStatus(null), 7000);
  };

  // New Cable Form state
  const [cableNumber, setCableNumber] = useState(`CBL-${String(state.cables.length + 1).padStart(3, '0')}`);
  const [cableType, setCableType] = useState<Cable['type']>('CAT6A');
  const [cableColor, setCableColor] = useState('#16a34a');
  const [cableLength, setCableLength] = useState<number>(2.5);
  const [cableStatus, setCableStatus] = useState<Cable['status']>('ACTIVE');
  const [cableNotes, setCableNotes] = useState('');

  // Point A selection
  const [devAId, setDevAId] = useState<string>(state.devices[0]?.id || '');
  const [portAName, setPortAName] = useState<string>('GigabitEthernet1/0/1');

  // Point B selection
  const [devBId, setDevBId] = useState<string>(state.devices[1]?.id || state.devices[0]?.id || '');
  const [portBName, setPortBName] = useState<string>('GigabitEthernet1/0/2');

  const devA = state.devices.find((d) => d.id === devAId);
  const rackA = devA?.rackId ? state.racks.find((r) => r.id === devA.rackId) : null;

  const devB = state.devices.find((d) => d.id === devBId);
  const rackB = devB?.rackId ? state.racks.find((r) => r.id === devB.rackId) : null;

  const handleCreateCable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!devA || !devB) return;

    addCable({
      cableNumber: cableNumber.trim(),
      type: cableType,
      color: cableColor,
      lengthMeters: Number(cableLength),
      status: cableStatus,
      notes: cableNotes.trim(),
      pointA: {
        deviceId: devA.id,
        portName: portAName,
        rackName: rackA?.name || 'Fuori Rack',
        ru: devA.rackRU || 0,
      },
      pointB: {
        deviceId: devB.id,
        portName: portBName,
        rackName: rackB?.name || 'Fuori Rack',
        ru: devB.rackRU || 0,
      },
    });

    setShowAddCableModal(false);
    setCableNumber(`CBL-${String(state.cables.length + 2).padStart(3, '0')}`);
    setCableNotes('');
  };

  const handleRunDiscovery = () => {
    if (!selectedDiscoveryDeviceId) return;
    setIsScanning(true);
    setScanResult(null);

    setTimeout(() => {
      const res = runDiscoveryOnDevice(selectedDiscoveryDeviceId);
      setScanResult(res);
      setIsScanning(false);
    }, 800);
  };

  const handleAddCableFromDiscovery = (neighbor: LLDPNeighbor) => {
    const localDev = state.devices.find((d) => d.id === selectedDiscoveryDeviceId);
    if (!localDev) return;

    // Find remote device by matching chassisId or systemName
    const remoteDev = state.devices.find(
      (d) => d.serialNumber === neighbor.chassisId || neighbor.systemName.includes(d.model)
    );

    const localRack = localDev.rackId ? state.racks.find((r) => r.id === localDev.rackId) : null;
    const remoteRack = remoteDev?.rackId ? state.racks.find((r) => r.id === remoteDev.rackId) : null;

    addCable({
      cableNumber: `CBL-DISC-${Date.now().toString().slice(-4)}`,
      type: 'DAC_10G',
      color: '#06b6d4',
      lengthMeters: 2.0,
      status: 'ACTIVE',
      notes: `Autogenerato da discovery ${neighbor.protocol} (Neighbor: ${neighbor.systemName})`,
      pointA: {
        deviceId: localDev.id,
        portName: neighbor.localPort,
        rackName: localRack?.name || 'Rack non specificato',
        ru: localDev.rackRU || 0,
      },
      pointB: {
        deviceId: remoteDev?.id || 'unknown',
        portName: neighbor.portId,
        rackName: remoteRack?.name || 'Rack Remoto',
        ru: remoteDev?.rackRU || 0,
      },
    });

    alert(`Cablaggio punto A & punto B registrato per il collegamento con ${neighbor.systemName}!`);
  };

  return (
    <div className="space-y-6">
      {/* Title & Subnav */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800 flex items-center justify-center text-indigo-400">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Rack Cabling & Discovery di Rete (LLDP / CDP)</h1>
            <p className="text-xs text-slate-400">
              Tracciamento punto-punto (Apparato, Porta, Rack, RU) e scansione automatica adiacenze
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setActiveTab('topology')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'topology' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Mappa Interconnessione Apparati</span>
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'matrix' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Matrice Cablaggi ({state.cables.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('discovery')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'discovery' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Discovery LLDP / CDP</span>
            </button>
          </div>

          <button
            onClick={handleRunGlobalDiscovery}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-white font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
            title="Esegui scansione LLDP/CDP su tutti gli apparati con IP management"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Scansione LLDP / CDP</span>
          </button>

          <button
            onClick={() => setShowAddCableModal(true)}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-900/30"
          >
            <Plus className="w-4 h-4" />
            <span>Nuovo Cavo</span>
          </button>
        </div>
      </div>

      {globalDiscoveryStatus && (
        <div className="p-3.5 rounded-xl bg-cyan-950/90 border border-cyan-600 text-cyan-200 text-xs flex items-center gap-2.5 shadow-xl animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="flex-1">{globalDiscoveryStatus}</span>
          <button onClick={() => setGlobalDiscoveryStatus(null)} className="text-cyan-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeTab === 'topology' ? (
        <DeviceTopologyMap />
      ) : activeTab === 'matrix' ? (
        /* Cabling Table */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Network className="w-4 h-4 text-indigo-400" />
              <span>Tabella Connessioni Fisiche Punto A &rarr; Punto B</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">{state.cables.length} cavi terminati</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
                  <th className="py-3 px-4">Codice & Tipo Cavo</th>
                  <th className="py-3 px-4">Punto A (Sorgente)</th>
                  <th className="py-3 px-4 text-center">Tratta</th>
                  <th className="py-3 px-4">Punto B (Destinazione)</th>
                  <th className="py-3 px-4">Stato</th>
                  <th className="py-3 px-4">Note</th>
                  <th className="py-3 px-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {state.cables.map((c) => {
                  const devAObj = state.devices.find((d) => d.id === c.pointA.deviceId);
                  const devBObj = state.devices.find((d) => d.id === c.pointB.deviceId);

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Code & Type */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm border border-slate-700"
                            style={{ backgroundColor: c.color }}
                            title={`Colore cavo: ${c.color}`}
                          />
                          <div>
                            <div className="font-mono font-bold text-white">{c.cableNumber}</div>
                            <div className="text-[11px] text-slate-400">{c.type} &bull; {c.lengthMeters} m</div>
                          </div>
                        </div>
                      </td>

                      {/* Punto A */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                            <span>{devAObj?.model || c.pointA.deviceId}</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-950 text-slate-300 font-mono text-[10px] border border-slate-800">
                              Porta: {c.pointA.portName}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Rack: {c.pointA.rackName} &bull; RU: {c.pointA.ru > 0 ? `U${c.pointA.ru}` : 'N/D'}
                          </div>
                        </div>
                      </td>

                      {/* Middle Arrow */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-950 border border-slate-800 text-slate-400">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </td>

                      {/* Punto B */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
                            <span>{devBObj?.model || c.pointB.deviceId}</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-950 text-slate-300 font-mono text-[10px] border border-slate-800">
                              Porta: {c.pointB.portName}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Rack: {c.pointB.rackName} &bull; RU: {c.pointB.ru > 0 ? `U${c.pointB.ru}` : 'N/D'}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : c.status === 'PLANNED'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate" title={c.notes}>
                        {c.notes || '-'}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Rimuovere il cavo ${c.cableNumber}?`)) {
                              deleteCable(c.id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          title="Elimina cavo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Discovery LLDP & CDP Tool */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>Scansione LLDP & CDP</span>
            </h2>
            <p className="text-xs text-slate-400">
              Interroga lo switch selezionato per scoprire automaticamente le adiacenze fisiche L2 dei vicini e completare le porte di rete.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Seleziona Apparato da Scansionare:
              </label>
              <select
                value={selectedDiscoveryDeviceId}
                onChange={(e) => setSelectedDiscoveryDeviceId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
              >
                {state.devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.model} ({d.serialNumber}) - {d.ipManagement || 'No IP'}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRunDiscovery}
              disabled={isScanning}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/40 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Discovery in corso...' : 'Avvia Discovery LLDP & CDP'}</span>
            </button>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-2 font-mono">
              <div className="text-slate-300 font-sans font-semibold">Protocolli supportati:</div>
              <div>&bull; <strong>CDP</strong> (Cisco Discovery Protocol v1/v2)</div>
              <div>&bull; <strong>LLDP</strong> (IEEE 802.1AB standard multibrand)</div>
              <div>&bull; <strong>LLDP-MED</strong> (Endpoint extensions)</div>
            </div>
          </div>

          {/* Results Box */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Risultati Discovery Topology</span>
            </h2>

            {!scanResult ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                <Radio className="w-12 h-12 text-slate-600 mb-2 animate-pulse" />
                <p className="text-xs">Seleziona un apparato e premi "Avvia Discovery" per analizzare la topologia di rete adiacente.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    <span>
                      Scansione completata per <strong>{scanResult.deviceName}</strong> ({scanResult.ip}) tramite protocollo <strong className="font-mono text-cyan-300">{scanResult.protocol}</strong>.
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {scanResult.neighbors.length} vicini rilevati
                  </span>
                </div>

                <div className="space-y-3">
                  {scanResult.neighbors.map((n: LLDPNeighbor, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono text-[10px] font-bold">
                            {n.protocol}
                          </span>
                          <span className="font-bold text-white text-xs">{n.systemName}</span>
                          <span className="text-[11px] font-mono text-slate-400">({n.managementIp})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Porta Locale: <strong className="text-cyan-300">{n.localPort}</strong> &rarr; Porta Remota: <strong className="text-indigo-300">{n.portId}</strong>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Chassis ID: {n.chassisId} &bull; Capacità: {n.capabilities?.join(', ')}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddCableFromDiscovery(n)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow transition-colors shrink-0"
                      >
                        <Network className="w-3.5 h-3.5" />
                        <span>Crea Cablaggio da Discovery</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: New Cable */}
      {showAddCableModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <h3 className="text-base font-bold text-white">Nuova Connessione Cablata (Punto A &rarr; Punto B)</h3>
              <button onClick={() => setShowAddCableModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCable} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Codice Cavo:</label>
                  <input
                    type="text"
                    required
                    value={cableNumber}
                    onChange={(e) => setCableNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tipologia Cavo:</label>
                  <select
                    value={cableType}
                    onChange={(e) => {
                      const t = e.target.value as Cable['type'];
                      setCableType(t);
                      const def = CABLE_TYPES.find((c) => c.id === t);
                      if (def) setCableColor(def.defaultColor);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                  >
                    {CABLE_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Lunghezza (metri):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={cableLength}
                    onChange={(e) => setCableLength(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              {/* Punto A & Punto B Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                {/* Punto A */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    Punto A (Sorgente)
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Apparato A:</label>
                    <select
                      value={devAId}
                      onChange={(e) => {
                        setDevAId(e.target.value);
                        const sel = state.devices.find((d) => d.id === e.target.value);
                        if (sel && sel.interfaces.length > 0) {
                          setPortAName(sel.interfaces[0].name);
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                    >
                      {state.devices.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.model} ({d.serialNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Porta Interfaccia A:</label>
                    <input
                      type="text"
                      required
                      value={portAName}
                      onChange={(e) => setPortAName(e.target.value)}
                      placeholder="es. GigabitEthernet1/0/1"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-mono outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono">
                    Rack: <strong>{rackA?.name || 'Fuori Rack'}</strong> &bull; RU: <strong>U{devA?.rackRU || 'N/D'}</strong>
                  </div>
                </div>

                {/* Punto B */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Punto B (Destinazione)
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Apparato B:</label>
                    <select
                      value={devBId}
                      onChange={(e) => {
                        setDevBId(e.target.value);
                        const sel = state.devices.find((d) => d.id === e.target.value);
                        if (sel && sel.interfaces.length > 0) {
                          setPortBName(sel.interfaces[0].name);
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                    >
                      {state.devices.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.model} ({d.serialNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Porta Interfaccia B:</label>
                    <input
                      type="text"
                      required
                      value={portBName}
                      onChange={(e) => setPortBName(e.target.value)}
                      placeholder="es. NIC.Slot.1-1"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-mono outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono">
                    Rack: <strong>{rackB?.name || 'Fuori Rack'}</strong> &bull; RU: <strong>U{devB?.rackRU || 'N/D'}</strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Colore Etichetta Cavo:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={cableColor}
                      onChange={(e) => setCableColor(e.target.value)}
                      className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={cableColor}
                      onChange={(e) => setCableColor(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Stato Operativo:</label>
                  <select
                    value={cableStatus}
                    onChange={(e) => setCableStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                  >
                    <option value="ACTIVE">ACTIVE (Connessione Attiva)</option>
                    <option value="PLANNED">PLANNED (Pianificato)</option>
                    <option value="DISCONNECTED">DISCONNECTED (Scollegato)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Note di Posa / Patch Panel:</label>
                <input
                  type="text"
                  value={cableNotes}
                  onChange={(e) => setCableNotes(e.target.value)}
                  placeholder="es. Passante canala destra, terminazione su patch panel PP-01"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCableModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                >
                  Crea Cavo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
