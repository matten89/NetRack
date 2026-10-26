/**
 * NetRack DCIM - Backup & Restore Modal (CSV Per Section & Full JSON Snapshot)
 */
import React, { useState } from 'react';
import { useDCIM } from '../context/DCIMContext';
import {
  exportInventoryToCSV,
  exportRacksToCSV,
  exportCablingToCSV,
  exportSitesToCSV,
  exportFullSystemJSON,
  importFullSystemJSON,
} from '../utils/csvEngine';
import {
  Download,
  Upload,
  FileSpreadsheet,
  Database,
  X,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Layers,
  Server,
  Network,
  MapPin,
} from 'lucide-react';

interface BackupRestoreModalProps {
  onClose: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({ onClose }) => {
  const { state, restoreFullSystem, resetToDefaults } = useDCIM();
  const [importStatus, setImportStatus] = useState<{
    success?: boolean;
    message?: string;
    preview?: any;
  } | null>(null);

  // Helper to trigger browser download
  const triggerDownload = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportInventoryCSV = () => {
    const csv = exportInventoryToCSV(state.devices, state.brands, state.racks);
    triggerDownload(`dcim_inventario_apparati_${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv');
  };

  const handleExportRacksCSV = () => {
    const csv = exportRacksToCSV(state.racks, state.sites);
    triggerDownload(`dcim_rack_design_${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv');
  };

  const handleExportCablingCSV = () => {
    const csv = exportCablingToCSV(state.cables);
    triggerDownload(`dcim_cablaggi_punto_a_b_${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv');
  };

  const handleExportSitesCSV = () => {
    const csv = exportSitesToCSV(state.sites);
    triggerDownload(`dcim_gerarchia_siti_${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv');
  };

  const handleExportFullJSON = () => {
    const json = exportFullSystemJSON(state);
    triggerDownload(`netrack_dcim_full_backup_${new Date().toISOString().slice(0, 10)}.json`, json, 'application/json');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importFullSystemJSON(content);
      if (res.valid && res.state) {
        setImportStatus({
          success: true,
          message: 'File di backup valido! Clicca su "Conferma Ripristino" per applicare i dati.',
          preview: res.state,
        });
      } else {
        setImportStatus({
          success: false,
          message: res.error || 'Errore durante la lettura del file di backup.',
        });
      }
    };
    reader.readAsText(file);
  };

  const applyRestoration = () => {
    if (importStatus?.preview) {
      restoreFullSystem(importStatus.preview);
      alert('Ripristino del sistema completato con successo!');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Backup e Ripristino DCIM</h2>
              <p className="text-xs text-slate-400">
                Esporta in CSV per singola sezione o crea un backup istantaneo dell'intero sistema
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi modale backup"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Section 1: CSV Export Per Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                Esportazione CSV Suddivisa per Sezione
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Scarica report tabellari compatibili con Excel e strumenti esterni di audit.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Inventario CSV */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-950/70 border border-blue-800 flex items-center justify-center text-blue-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Inventario Apparati</div>
                    <div className="text-[11px] text-slate-400">{state.devices.length} record censiti</div>
                  </div>
                </div>
                <button
                  onClick={handleExportInventoryCSV}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-cyan-300 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>

              {/* Racks CSV */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/70 border border-cyan-800 flex items-center justify-center text-cyan-400">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Rack Design & RU</div>
                    <div className="text-[11px] text-slate-400">{state.racks.length} rack configurati</div>
                  </div>
                </div>
                <button
                  onClick={handleExportRacksCSV}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-cyan-300 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>

              {/* Cabling CSV */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-950/70 border border-indigo-800 flex items-center justify-center text-indigo-400">
                    <Network className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Cablaggi Punto A / B</div>
                    <div className="text-[11px] text-slate-400">{state.cables.length} cavi terminati</div>
                  </div>
                </div>
                <button
                  onClick={handleExportCablingCSV}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-indigo-300 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>

              {/* Sites CSV */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-950/70 border border-amber-800 flex items-center justify-center text-amber-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Gerarchia Siti (6 Livelli)</div>
                    <div className="text-[11px] text-slate-400">{state.sites.length} nodi albero</div>
                  </div>
                </div>
                <button
                  onClick={handleExportSitesCSV}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-300 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800" />

          {/* Section 2: Full System JSON Backup */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                Backup Completo di Tutto il Sistema
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Crea un file JSON snapshot completo contenente inventario, moduli, SFP, interfacce, rack elevation, cablaggi, siti, marche e utenti.
            </p>

            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-emerald-300">NetRack Full System Snapshot</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Salva l'intero database in formato standard per migrazione o ripristino di emergenza (DR).
                </div>
              </div>
              <button
                onClick={handleExportFullJSON}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Scarica Backup Completo (.json)</span>
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800" />

          {/* Section 3: System Restoration */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Upload className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                Ripristino del Sistema da Backup
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Seleziona un file JSON precedentemente esportato per ripristinare la configurazione.
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-900/50 file:text-cyan-300 hover:file:bg-cyan-900 cursor-pointer"
              />

              {importStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    importStatus.success
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-800 text-rose-300'
                  }`}
                >
                  {importStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{importStatus.message}</p>
                    {importStatus.preview && (
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                        <div>Apparati: {importStatus.preview.devices?.length || 0}</div>
                        <div>Rack: {importStatus.preview.racks?.length || 0}</div>
                        <div>Cablaggi: {importStatus.preview.cables?.length || 0}</div>
                        <div>Utenti: {importStatus.preview.users?.length || 0}</div>
                      </div>
                    )}
                  </div>
                  {importStatus.success && (
                    <button
                      onClick={applyRestoration}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shrink-0"
                    >
                      Conferma Ripristino
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Reset button */}
          <div className="pt-2 flex justify-between items-center text-xs">
            <span className="text-slate-500">Hai bisogno di ricominciare da zero?</span>
            <button
              onClick={() => {
                if (confirm('Sei sicuro di voler resettare tutti i dati alle impostazioni di fabbrica (seed)?')) {
                  resetToDefaults();
                  onClose();
                }
              }}
              className="text-slate-400 hover:text-rose-400 flex items-center gap-1.5 underline"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Ripristina dati demo originali</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
