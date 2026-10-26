/**
 * NetRack DCIM - Customizable Brands & Vendors Manager
 */
import React, { useState } from 'react';
import { useDCIM } from '../context/DCIMContext';
import { Tag, X, Plus, Check } from 'lucide-react';

interface BrandsModalProps {
  onClose: () => void;
}

const PRESET_COLORS = [
  '#049fd9', // Cisco cyan
  '#1f4389', // Arista blue
  '#84bd00', // Juniper lime
  '#007db8', // Dell blue
  '#01a982', // HPE teal
  '#ee3124', // Fortinet red
  '#3dcd58', // APC green
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
];

export const BrandsModal: React.FC<BrandsModalProps> = ({ onClose }) => {
  const { state, addBrand } = useDCIM();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [portPrefix, setPortPrefix] = useState('GigabitEthernet1/0/');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addBrand({
      name: name.trim(),
      color,
      defaultPortPrefix: portPrefix.trim() || 'eth',
    });

    setName('');
    setPortPrefix('GigabitEthernet1/0/');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Gestione Marche & Vendor</h2>
              <p className="text-xs text-slate-400">
                Lista marche customizzabile con badge colore e prefisso porte predefinito
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi modale marche"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Add New Brand Form */}
          <form onSubmit={handleAdd} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Aggiungi Nuova Marca</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nome Vendor / Marca:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Es. Huawei, CheckPoint, Palo Alto..."
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Prefisso Porte Predefinito:</label>
                <input
                  type="text"
                  value={portPrefix}
                  onChange={(e) => setPortPrefix(e.target.value)}
                  placeholder="Es. Ethernet, ge-0/0/, port"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Colore Badge Marchio:</label>
              <div className="flex flex-wrap gap-2 items-center">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${
                      color === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-950' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Inserisci Marca</span>
            </button>
          </form>

          {/* List of existing brands */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Marche Configurate ({state.brands.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {state.brands.map((b) => {
                const count = state.devices.filter((d) => d.brandId === b.id).length;
                return (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: b.color || '#049fd9' }}
                      />
                      <div>
                        <div className="text-xs font-bold text-white">{b.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Prefisso: {b.defaultPortPrefix || 'eth'}</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {count} apparati
                    </span>
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
