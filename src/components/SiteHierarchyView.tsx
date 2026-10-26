/**
 * NetRack DCIM - 6-Level Site & Location Hierarchy Manager
 */
import React, { useState } from 'react';
import { useDCIM } from '../context/DCIMContext';
import { SiteNode } from '../types/dcim';
import { MapPin, Plus, Trash2, ChevronRight, FolderTree, Server, Layers } from 'lucide-react';
import { getSiteHierarchyBreadcrumb } from '../utils/validation';

const LEVEL_NAMES: Record<number, string> = {
  1: 'Regione',
  2: 'Nazione',
  3: 'Città',
  4: 'DataCenter',
  5: 'Sala Server',
  6: 'Fila Rack',
};

export const SiteHierarchyView: React.FC = () => {
  const { state, addSiteNode, deleteSiteNode } = useDCIM();
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [newNodeName, setNewNodeName] = useState<string>('');
  const [newNodeLevel, setNewNodeLevel] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Group sites by parentId
  const getChildren = (parentId?: string) => {
    return state.sites.filter((s) => s.parentId === parentId);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeName.trim()) return;

    addSiteNode({
      name: newNodeName.trim(),
      level: newNodeLevel,
      levelName: LEVEL_NAMES[newNodeLevel],
      parentId: selectedParentId || undefined,
    });

    setNewNodeName('');
  };

  const handleSelectParentForChild = (node: SiteNode) => {
    if (node.level < 6) {
      setSelectedParentId(node.id);
      setNewNodeLevel((node.level + 1) as any);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-800 flex items-center justify-center text-amber-400">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Gerarchia Geografica & Siti (fino a 6 Livelli)</h1>
            <p className="text-xs text-slate-400">
              Modella l'albero infrastrutturale: Regione &rarr; Nazione &rarr; Città &rarr; DataCenter &rarr; Sala &rarr; Fila Rack
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form to create sub-nodes */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>Nuovo Nodo Gerarchico</span>
          </h2>

          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Livello Gerarchico:</label>
              <select
                value={newNodeLevel}
                onChange={(e) => setNewNodeLevel(parseInt(e.target.value, 10) as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
              >
                <option value={1}>Livello 1: Regione (es. EMEA, APAC)</option>
                <option value={2}>Livello 2: Nazione (es. Italia)</option>
                <option value={3}>Livello 3: Città (es. Milano)</option>
                <option value={4}>Livello 4: DataCenter (es. DC-Caldera)</option>
                <option value={5}>Livello 5: Sala Server (es. Hall 2B)</option>
                <option value={6}>Livello 6: Fila Rack (es. Fila A)</option>
              </select>
            </div>

            {newNodeLevel > 1 && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nodo Genitore (Livello {newNodeLevel - 1}):
                </label>
                <select
                  required
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                >
                  <option value="">-- Seleziona genitore --</option>
                  {state.sites
                    .filter((s) => s.level === newNodeLevel - 1)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.levelName}] {s.name} ({getSiteHierarchyBreadcrumb(s.id, state.sites)})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nome del Nodo:</label>
              <input
                type="text"
                required
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                placeholder={`Es. ${LEVEL_NAMES[newNodeLevel]} Principale`}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-900/30"
            >
              <Plus className="w-4 h-4" />
              <span>Aggiungi Nodo alla Struttura</span>
            </button>
          </form>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="font-semibold text-slate-300">Guida ai 6 livelli:</div>
            <p>
              Gli apparati dell'inventario e i rack possono essere associati direttamente a qualunque livello (ad es. per posizionare un apparato non a rack, oppure per inserirlo direttamente nel rack appartenente a una specifica Fila).
            </p>
          </div>
        </div>

        {/* Right Columns: Tree Navigator */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-amber-400" />
              <span>Albero Topologico Datacenter ({state.sites.length} Nodi)</span>
            </h2>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-2">
            {state.sites.filter((s) => s.level === 1).map((root) => (
              <RenderSiteTreeBranch
                key={root.id}
                node={root}
                allSites={state.sites}
                onSelectAddChild={handleSelectParentForChild}
                onDelete={deleteSiteNode}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface RenderSiteTreeBranchProps {
  node: SiteNode;
  allSites: SiteNode[];
  onSelectAddChild: (n: SiteNode) => void;
  onDelete: (id: string) => void;
}

const RenderSiteTreeBranch: React.FC<RenderSiteTreeBranchProps> = ({
  node,
  allSites,
  onSelectAddChild,
  onDelete,
}) => {
  const children = allSites.filter((s) => s.parentId === node.id);

  const getLevelBadge = (level: number) => {
    const colors: Record<number, string> = {
      1: 'bg-blue-950 text-blue-300 border-blue-800',
      2: 'bg-emerald-950 text-emerald-300 border-emerald-800',
      3: 'bg-amber-950 text-amber-300 border-amber-800',
      4: 'bg-purple-950 text-purple-300 border-purple-800',
      5: 'bg-cyan-950 text-cyan-300 border-cyan-800',
      6: 'bg-rose-950 text-rose-300 border-rose-800',
    };
    return colors[level] || 'bg-slate-800 text-slate-300';
  };

  return (
    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`text-[10px] px-2 py-0.5 rounded font-mono border font-semibold ${getLevelBadge(node.level)}`}>
            L{node.level}: {node.levelName}
          </span>
          <span className="font-semibold text-xs text-white">{node.name}</span>
        </div>

        <div className="flex items-center gap-2">
          {node.level < 6 && (
            <button
              onClick={() => onSelectAddChild(node)}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 text-[11px] font-medium flex items-center gap-1 border border-slate-800"
              title="Aggiungi sotto-livello"
            >
              <Plus className="w-3 h-3" />
              <span>Sotto-livello</span>
            </button>
          )}

          <button
            onClick={() => {
              if (confirm(`Eliminare il nodo "${node.name}" e tutti i suoi sotto-nodi?`)) {
                onDelete(node.id);
              }
            }}
            aria-label={`Elimina nodo ${node.name}`}
            className="p-1 text-slate-500 hover:text-rose-400 rounded"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Nested children */}
      {children.length > 0 && (
        <div className="mt-2.5 ml-4 pl-3 border-l-2 border-slate-800 space-y-2">
          {children.map((child) => (
            <RenderSiteTreeBranch
              key={child.id}
              node={child}
              allSites={allSites}
              onSelectAddChild={onSelectAddChild}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
