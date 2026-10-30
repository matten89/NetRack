/**
 * NetRack DCIM - Customizable Device Types Manager (Tipologie Apparato)
 */
import React, { useState } from 'react';
import { useDCIM } from '../context/DCIMContext';
import { DeviceType } from '../types/dcim';
import { Layers, X, Plus, Check, Edit2, Trash2, Shield, Server, Radio, Cpu } from 'lucide-react';

interface DeviceTypesModalProps {
  onClose: () => void;
}

const PRESET_TYPE_COLORS = [
  '#0284c7', // Sky Blue (Router)
  '#059669', // Emerald (Switch)
  '#dc2626', // Red (Firewall)
  '#7c3aed', // Purple (Access Point)
  '#2563eb', // Blue (Server)
  '#d97706', // Amber (Storage)
  '#e11d48', // Rose (PDU)
  '#475569', // Slate (Patch Panel)
  '#0891b2', // Cyan (UPS)
  '#64748b', // Slate Gray (Appliance/Other)
];

export const DeviceTypesModal: React.FC<DeviceTypesModalProps> = ({ onClose }) => {
  const { state, addDeviceType, updateDeviceType, deleteDeviceType } = useDCIM();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState(PRESET_TYPE_COLORS[0]);
  const [defaultHeightRU, setDefaultHeightRU] = useState<number>(1);
  const [description, setDescription] = useState('');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const generatedCode = code.trim().toUpperCase() || name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');

    if (editingTypeId) {
      updateDeviceType(editingTypeId, {
        name: name.trim(),
        code: generatedCode,
        color,
        defaultHeightRU,
        description: description.trim(),
      });
      setEditingTypeId(null);
    } else {
      addDeviceType({
        name: name.trim(),
        code: generatedCode,
        color,
        defaultHeightRU,
        description: description.trim(),
      });
    }

    setName('');
    setCode('');
    setDescription('');
    setDefaultHeightRU(1);
    setColor(PRESET_TYPE_COLORS[0]);
  };

  const handleStartEdit = (type: DeviceType) => {
    setEditingTypeId(type.id);
    setName(type.name);
    setCode(type.code);
    setColor(type.color || PRESET_TYPE_COLORS[0]);
    setDefaultHeightRU(type.defaultHeightRU || 1);
    setDescription(type.description || '');
  };

  const handleCancelEdit = () => {
    setEditingTypeId(null);
    setName('');
    setCode('');
    setDescription('');
    setDefaultHeightRU(1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Gestione Tipologie Apparati</h2>
              <p className="text-xs text-slate-400">
                Personalizza categorie e ruoli (Router, Switch, Firewall, Access Point, Server, ecc.)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi modale tipologie"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Add / Edit Form */}
          <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                {editingTypeId ? <Edit2 className="w-3.5 h-3.5 text-cyan-400" /> : <Plus className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{editingTypeId ? 'Modifica Tipologia Apparato' : 'Aggiungi Nuova Tipologia Apparato'}</span>
              </h3>
              {editingTypeId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  Annulla Modifica
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-slate-300 mb-1">Nome Tipologia:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingTypeId && !code) {
                      setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '_'));
                    }
                  }}
                  placeholder="Es. Access Point, SD-WAN..."
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Codice / Sigla:</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Es. AP, ROUTER, SW"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Altezza Rack Default:</label>
                <select
                  value={defaultHeightRU}
                  onChange={(e) => setDefaultHeightRU(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                >
                  <option value={1}>1 RU</option>
                  <option value={2}>2 RU</option>
                  <option value={3}>3 RU</option>
                  <option value={4}>4 RU</option>
                  <option value={6}>6 RU</option>
                  <option value={8}>8 RU</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Descrizione Funzionale (Opzionale):</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve spiegazione del ruolo dell'apparato nel datacenter"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Colore Badge & Distintivo:</label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_TYPE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-lg transition-transform flex items-center justify-center text-white ${
                      color === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-950' : 'hover:scale-105'
                    }`}
                  >
                    {color === c && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
                <div
                  className="px-2.5 py-1 rounded text-xs font-semibold text-white ml-2 flex items-center gap-1.5"
                  style={{ backgroundColor: color }}
                >
                  <span>{name || 'Anteprima Badge'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
              >
                {editingTypeId ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{editingTypeId ? 'Salva Modifiche' : 'Aggiungi Tipologia'}</span>
              </button>
            </div>
          </form>

          {/* Existing Types List */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Tipologie Attualmente Censite</span>
              <span className="text-[11px] text-slate-400 font-mono">Totale: {state.deviceTypes?.length || 0}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(state.deviceTypes || []).map((t) => {
                const countUsing = state.devices.filter(
                  (d) => d.deviceTypeId === t.id || d.deviceRole === t.code
                ).length;

                return (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: t.color || '#0284c7' }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">{t.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                            {t.code}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 truncate block">
                          {t.description || `${t.defaultHeightRU || 1} RU`} &bull; {countUsing} apparati censiti
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleStartEdit(t)}
                        title="Modifica tipologia"
                        className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-900 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (countUsing > 0) {
                            if (!confirm(`Ci sono ${countUsing} apparati associati a questa tipologia. Vuoi rimuoverla comunque?`)) {
                              return;
                            }
                          }
                          deleteDeviceType(t.id);
                        }}
                        title="Elimina tipologia"
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
