/**
 * NetRack DCIM - Real SSH Gateway & Terminal Connection Manager
 * Replaces simulated mock CLI with real browser SSH session originating from Ubuntu Server IP
 */
import React, { useState } from 'react';
import { Device } from '../types/dcim';
import { useDCIM } from '../context/DCIMContext';
import {
  Terminal,
  ExternalLink,
  Shield,
  Copy,
  Check,
  X,
  Server,
  Lock,
  User as UserIcon,
  Radio,
  Settings,
  ArrowRight,
  Sparkles,
  Network,
  Globe,
} from 'lucide-react';

interface SSHTerminalModalProps {
  device: Device;
  onClose: () => void;
}

export const SSHTerminalModal: React.FC<SSHTerminalModalProps> = ({ device, onClose }) => {
  const { launchRealSSH, runDiscoveryOnDevice, webSshGatewayUrl, setWebSshGatewayUrl } = useDCIM();

  const [sshPort, setSshPort] = useState<number>(device.sshPort || 22);
  const [sshUser, setSshUser] = useState<string>(device.sshUsername || 'admin');
  const [sshPassword, setSshPassword] = useState<string>(device.sshPassword || '');
  const [customServerIp, setCustomServerIp] = useState<string>(
    typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1'
  );
  const [showConfigGateway, setShowConfigGateway] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [discoveryStatus, setDiscoveryStatus] = useState<string | null>(null);

  const nativeCmd = `ssh -p ${sshPort} ${sshUser ? `${sshUser}@` : ''}${device.ipManagement}`;

  const handleLaunchWebSSH = () => {
    launchRealSSH(
      {
        ...device,
        sshPort,
        sshUsername: sshUser,
        sshPassword,
      },
      customServerIp
    );
  };

  const handleLaunchDiscovery = () => {
    setDiscoveryStatus('Scansione LLDP/CDP in corso via socket...');
    setTimeout(() => {
      const res = runDiscoveryOnDevice(device.id);
      if (res) {
        setDiscoveryStatus(
          `Scansione completata! Rilevati ${res.neighbors.length} vicini ${res.protocol} e creati ${res.newCablesCount || 0} nuovi collegamenti nella mappa.`
        );
      } else {
        setDiscoveryStatus('Nessun vicino LLDP/CDP rilevato o errore di risposta.');
      }
    }, 600);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(nativeCmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-600/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Connessione SSH Reale</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Origine: IP Server
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sessione TCP reale verso {device.model} ({device.ipManagement})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi finestra SSH"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Status Box */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span>Apparato Target:</span>
              <span className="font-bold text-white">{device.model}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Indirizzo IP Management:</span>
              <span className="font-mono text-cyan-300 font-bold">{device.ipManagement || 'Nessun IP'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Sorgente Connessione SSH:</span>
              <span className="font-mono text-emerald-400 font-bold">{customServerIp} (Server Ubuntu)</span>
            </div>
          </div>

          {/* SSH Credentials Form */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <h3 className="font-bold text-white text-xs flex items-center justify-between">
              <span>Credenziali SSH & Parametri Sessione</span>
              <button
                type="button"
                onClick={() => setShowConfigGateway(!showConfigGateway)}
                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
              >
                <Settings className="w-3 h-3" />
                <span>{showConfigGateway ? 'Nascondi Gateway' : 'Configura Gateway'}</span>
              </button>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Username SSH:</span>
                </label>
                <input
                  type="text"
                  value={sshUser}
                  onChange={(e) => setSshUser(e.target.value)}
                  placeholder="admin"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 flex items-center gap-1">
                  <Server className="w-3.5 h-3.5 text-slate-400" />
                  <span>Porta SSH:</span>
                </label>
                <input
                  type="number"
                  value={sshPort}
                  onChange={(e) => setSshPort(Number(e.target.value))}
                  placeholder="22"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Password di Management (Opzionale per auto-login WebSSH):</span>
              </label>
              <input
                type="password"
                value={sshPassword}
                onChange={(e) => setSshPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono outline-none focus:border-cyan-500"
              />
            </div>

            {/* Gateway custom URL */}
            {showConfigGateway && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2 animate-in fade-in">
                <div>
                  <label className="block text-slate-400 mb-1">
                    IP / Hostname del Server Ubuntu (Sorgente SSH):
                  </label>
                  <input
                    type="text"
                    value={customServerIp}
                    onChange={(e) => setCustomServerIp(e.target.value)}
                    placeholder="192.168.1.100 o dcim.tuodominio.it"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">
                    URL Base WebSSH Gateway (Predefinito: porta 8888 o /webssh/):
                  </label>
                  <input
                    type="text"
                    value={webSshGatewayUrl}
                    onChange={(e) => setWebSshGatewayUrl(e.target.value)}
                    placeholder="Es. http://192.168.1.100:8888 oppure /webssh"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono outline-none focus:border-cyan-500 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Button 1: WebSSH in New Tab */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleLaunchWebSSH}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Apri Sessione SSH Reale in Nuova Scheda del Browser</span>
            </button>
            <p className="text-[11px] text-slate-500 text-center">
              La sessione viene instaurata direttamente dal server Ubuntu via WebSSH Gateway (porta 22/TCP fisica).
            </p>
          </div>

          {/* Action Button 2: LLDP/CDP Discovery Scan with this SSH */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span>Scansione Rete LLDP/CDP da questo Apparato</span>
              </span>
              <button
                type="button"
                onClick={handleLaunchDiscovery}
                className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1 shadow transition-colors"
              >
                <span>Avvia Scansione</span>
              </button>
            </div>
            {discoveryStatus && (
              <p className="text-[11px] text-emerald-300 font-mono bg-slate-900 p-2 rounded border border-slate-800 animate-in fade-in">
                {discoveryStatus}
              </p>
            )}
            <p className="text-[11px] text-slate-400">
              Interroga la tabella vicini di rete dell'apparato e aggiorna automaticamente la Mappa Interconnessioni.
            </p>
          </div>

          {/* Action Button 3: Native Client Command */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <span className="text-slate-400 block font-semibold">Comando Client SSH Nativo per Terminale Locale:</span>
            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px]">
              <code className="text-emerald-300 select-all">{nativeCmd}</code>
              <button
                type="button"
                onClick={copyToClipboard}
                className="p-1 text-slate-400 hover:text-white ml-2 shrink-0"
                title="Copia comando SSH"
              >
                {copiedCmd ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
