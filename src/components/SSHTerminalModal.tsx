/**
 * NetRack DCIM - Interactive In-Browser SSH Terminal & Web Console
 */
import React, { useState, useEffect, useRef } from 'react';
import { Device } from '../types/dcim';
import {
  Terminal,
  Globe,
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Cpu,
  Info,
  Server,
  Key,
  Radio,
  Sparkles,
} from 'lucide-react';

interface SSHTerminalModalProps {
  device: Device;
  onClose: () => void;
}

export const SSHTerminalModal: React.FC<SSHTerminalModalProps> = ({ device, onClose }) => {
  const [activeMode, setActiveMode] = useState<'ssh' | 'http' | 'real_ssh'>('ssh');
  const [commandInput, setCommandInput] = useState('');
  const [sshUser, setSshUser] = useState('admin');
  const [sshPort, setSshPort] = useState('22');
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [outputLines, setOutputLines] = useState<Array<{ text: string; type?: 'cmd' | 'output' | 'error' | 'system' }>>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const terminalBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize terminal banner
  useEffect(() => {
    const isCisco = device.model.toLowerCase().includes('catalyst') || device.model.toLowerCase().includes('nexus');
    const isArista = device.model.toLowerCase().includes('7050') || device.brandId.includes('arista');
    
    const banner = [
      { text: `SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.4`, type: 'system' as const },
      { text: `Connecting to ${device.ipManagement}:22 ... [ESTABLISHED]`, type: 'system' as const },
      { text: `Authenticating with host key fingerprints (ED25519) ... OK`, type: 'system' as const },
      { text: `****************************************************************`, type: 'output' as const },
      { text: `* NETRACK DCIM - CONSOLE CLI DIAGNOSTICA APPARATO             *`, type: 'output' as const },
      { text: `* Apparato : ${device.model.padEnd(46)} *`, type: 'output' as const },
      { text: `* Matricola: ${device.serialNumber.padEnd(46)} *`, type: 'output' as const },
      { text: `* IP Mgmt  : ${device.ipManagement.padEnd(46)} *`, type: 'output' as const },
      { text: `* NOTA: CLI basata sui parametri DCIM. Per connessione TCP     *`, type: 'output' as const },
      { text: `* fisica porta 22 usa 'Lancia SSH Nativo' o la scheda 'SSH Reale'*`, type: 'output' as const },
      { text: `****************************************************************`, type: 'output' as const },
      { text: `Digita 'help' o '?' per visualizzare i comandi di telemetria e stato.`, type: 'system' as const },
    ];
    setOutputLines(banner);
  }, [device]);

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [outputLines]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim();
    if (!cmd) return;

    const hostname = device.model.replace(/\s+/g, '-').slice(0, 16);
    const newOutput = [...outputLines, { text: `${hostname}# ${cmd}`, type: 'cmd' as const }];

    setHistory((prev) => [...prev, cmd]);
    setCommandInput('');

    // Interpret command
    const lower = cmd.toLowerCase();

    if (lower === 'clear') {
      setOutputLines([]);
      return;
    }

    if (lower === 'help' || lower === '?') {
      newOutput.push({
        text: `Comandi diagnostici disponibili:\n` +
          `  show ip interface brief   - Mostra lo stato di tutte le interfacce e IP\n` +
          `  show lldp neighbors       - Mostra apparati adiacenti scoperti via LLDP\n` +
          `  show cdp neighbors        - Mostra apparati adiacenti scoperti via CDP\n` +
          `  show inventory            - Censimento chassis, serial number e moduli hardware\n` +
          `  show modules              - Schede e moduli correlati inseriti negli slot\n` +
          `  show sfp                  - Transceiver ottici SFP/SFP+ installati\n` +
          `  show environment          - Alimentatori, ventole, temperature e stato PSU\n` +
          `  show version              - Release firmware e uptime apparato\n` +
          `  ping <target_ip>          - Test di connettività ICMP\n` +
          `  clear                     - Pulisce la schermata terminale\n` +
          `  exit                      - Chiude la sessione SSH`,
        type: 'output',
      });
    } else if (lower.startsWith('show ip int') || lower === 'show interfaces' || lower === 'ip a') {
      const ifaceRows = (device.interfaces || []).map(
        (i) => `  ${i.name.padEnd(24)} ${(i.ipAddress || 'unassigned').padEnd(16)} ${i.status.padEnd(8)} VLAN:${i.vlan || 1} ${i.isHidden ? '[NASCOSTA]' : '[VISIBILE]'}`
      );
      newOutput.push({
        text: `Interface                IP-Address       Status   Details\n` +
          `------------------------------------------------------------------\n` +
          (ifaceRows.length > 0 ? ifaceRows.join('\n') : '  Nessuna interfaccia configurata.'),
        type: 'output',
      });
    } else if (lower.startsWith('show lldp') || lower.startsWith('show cdp')) {
      const proto = lower.includes('cdp') ? 'CDP' : 'LLDP';
      newOutput.push({
        text: `Capability codes: (R) Router, (B) Bridge, (T) Telephone, (S) Station\n\n` +
          `Device ID        Local Intf       Hold-time  Capability  Port ID\n` +
          `------------------------------------------------------------------------\n` +
          `Spine-Switch-01  Eth1/49          120        R B         Eth1/1\n` +
          `Leaf-Switch-02   Eth1/50          120        R B         Eth1/2\n` +
          `ESXi-Host-01     Eth1/1           180        S           vmnic0\n` +
          `Total entries displayed: 3 (${proto} Neighbors Active)`,
        type: 'output',
      });
    } else if (lower.startsWith('show inv')) {
      newOutput.push({
        text: `NAME: "Chassis", DESCR: "${device.model}"\n` +
          `PID: ${device.model.split(' ')[0]} , VID: V01 , SN: ${device.serialNumber}\n` +
          (device.modules || [])
            .map((m) => `NAME: "${m.slotName}", DESCR: "${m.model}"\nPID: ${m.type} , SN: ${m.serialNumber || 'N/A'}`)
            .join('\n'),
        type: 'output',
      });
    } else if (lower.startsWith('show mod')) {
      const modRows = (device.modules || []).map(
        (m) => `  Slot: ${m.slotName.padEnd(12)} Modello: ${m.model.padEnd(20)} Tipo: ${m.type.padEnd(14)} Stato: [${m.status}]`
      );
      newOutput.push({
        text: modRows.length > 0 ? modRows.join('\n') : 'Nessun modulo o scheda opzionale installata.',
        type: 'output',
      });
    } else if (lower.startsWith('show sfp')) {
      const sfpRows = (device.sfps || []).map(
        (s) => `  Porta: ${s.interfaceName.padEnd(16)} Tipo: ${s.type.padEnd(10)} Vendor: ${s.vendor.padEnd(10)} Connettore: ${s.connector} SN: ${s.serialNumber}`
      );
      newOutput.push({
        text: sfpRows.length > 0 ? sfpRows.join('\n') : 'Nessun transceiver SFP/SFP+ censito per questo apparato.',
        type: 'output',
      });
    } else if (lower.startsWith('show env')) {
      newOutput.push({
        text: `Power Supplies:\n` +
          `  PSU-1: 650W AC (Input: 230V, Output: 12V 54A) [OPERATIONAL - OK]\n` +
          `  PSU-2: 650W AC (Input: 230V, Output: 12V 54A) [OPERATIONAL - OK]\n` +
          `Fan Trays: FAN-1 (14200 RPM) [OK], FAN-2 (14150 RPM) [OK]\n` +
          `Thermal Sensors: ASIC Core: 42°C (Alarm: 85°C), Intake: 21°C, Exhaust: 33°C`,
        type: 'output',
      });
    } else if (lower.startsWith('show ver')) {
      newOutput.push({
        text: `NetRack Enterprise OS, Version 17.09.03a\n` +
          `System image file is "bootflash:packages.conf"\n` +
          `Hardware: ${device.model} with ${device.serialNumber}\n` +
          `Uptime is 142 days, 18 hours, 32 minutes`,
        type: 'output',
      });
    } else if (lower.startsWith('ping')) {
      const target = cmd.split(' ')[1] || '8.8.8.8';
      newOutput.push({
        text: `Type escape sequence to abort.\n` +
          `Sending 5, 100-byte ICMP Echos to ${target}, timeout is 2 seconds:\n` +
          `!!!!!\n` +
          `Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms`,
        type: 'output',
      });
    } else if (lower === 'exit') {
      onClose();
      return;
    } else {
      newOutput.push({
        text: `% Invalid command: "${cmd}". Type 'help' or '?' for available syntax.`,
        type: 'error',
      });
    }

    setOutputLines(newOutput);
  };

  const hostname = device.model.replace(/\s+/g, '-').slice(0, 16);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div
        className={`bg-slate-900 border border-slate-700 rounded-2xl flex flex-col shadow-2xl overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'w-full h-full' : 'w-full max-w-4xl h-[650px]'
        }`}
      >
        {/* Terminal Header */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            <div className="flex items-center gap-2">
              {activeMode === 'ssh' ? (
                <Terminal className="w-4 h-4 text-emerald-400" />
              ) : (
                <Globe className="w-4 h-4 text-cyan-400" />
              )}
              <span className="font-mono text-xs font-semibold text-white">
                {activeMode === 'ssh' ? `ssh admin@${device.ipManagement}` : `https://${device.ipManagement}`}
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                ({device.model} - S/N: {device.serialNumber})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs">
              <button
                onClick={() => setActiveMode('ssh')}
                className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                  activeMode === 'ssh'
                    ? 'bg-slate-800 text-emerald-400 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Console CLI interattiva con dati DCIM"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>CLI DCIM</span>
              </button>
              <button
                onClick={() => setActiveMode('real_ssh')}
                className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                  activeMode === 'real_ssh'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Connessione SSH fisica reale via client nativo o WebSSH gateway"
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>SSH Reale</span>
              </button>
              <button
                onClick={() => setActiveMode('http')}
                className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                  activeMode === 'http'
                    ? 'bg-slate-800 text-cyan-400 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Web GUI</span>
              </button>
            </div>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              title={isFullscreen ? 'Riduci' : 'Schermo intero'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              title="Chiudi sessione"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {activeMode === 'ssh' ? (
          <div className="flex-1 flex flex-col min-h-0 bg-black">
            {/* Top Sandbox Notice Bar */}
            <div className="bg-slate-950/90 border-b border-slate-800/80 px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/70 text-amber-300 border border-amber-800/60">
                  CLI DCIM (Sandbox Web)
                </span>
                <span className="hidden md:inline text-slate-400">
                  Risposte simulate dai dati reali dell'apparato nel DCIM.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveMode('real_ssh')}
                  className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline text-[11px]"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Perché è simulata? / Attiva SSH Reale</span>
                </button>
                <span className="text-slate-700">|</span>
                <a
                  href={`ssh://${sshUser}@${device.ipManagement}`}
                  className="px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-300 flex items-center gap-1 text-[11px] transition-colors"
                  title="Apre il terminale SSH nativo sul tuo computer (PuTTY/OpenSSH)"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Apri SSH Nativo</span>
                </a>
              </div>
            </div>

            <div
              className="flex-1 p-4 font-mono text-xs overflow-y-auto flex flex-col cursor-text select-text"
              onClick={() => inputRef.current?.focus()}
            >
              <div className="space-y-1">
                {outputLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`leading-relaxed whitespace-pre-wrap ${
                      line.type === 'cmd'
                        ? 'text-cyan-400 font-bold'
                        : line.type === 'system'
                        ? 'text-slate-500'
                        : line.type === 'error'
                        ? 'text-rose-400 font-semibold'
                        : 'text-emerald-400'
                    }`}
                  >
                    {line.text}
                  </div>
                ))}
              </div>

              <div ref={terminalBottomRef} />

              {/* Input Prompt */}
              <form onSubmit={handleCommandSubmit} className="mt-2 flex items-center gap-2">
                <span className="text-cyan-400 font-bold select-none">{hostname}#</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  autoFocus
                  className="flex-1 bg-transparent border-none outline-none text-emerald-300 font-mono text-xs focus:ring-0 p-0"
                  placeholder="Digita un comando o 'help'..."
                />
              </form>
            </div>
          </div>
        ) : activeMode === 'real_ssh' ? (
          /* REAL SSH & GATEWAY ARCHITECTURE VIEW */
          <div className="flex-1 bg-slate-950 overflow-y-auto p-5 sm:p-6 text-slate-200">
            <div className="max-w-3xl mx-auto space-y-6">
              
              {/* Header explanation banner */}
              <div className="rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border border-emerald-500/30 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Radio className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Connessione SSH Reale su Porta 22/TCP
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                        Apparato: {device.ipManagement}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Hai notato che la console nel browser risponde in modo simulato? Di seguito trovi la spiegazione tecnica 
                      del perché i browser non possono aprire socket TCP grezzi e le due soluzioni reali utilizzate nei Data Center.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Launch Panel */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-semibold text-white">Metodo 1: Avvio Rapido Client SSH Nativo (Consigliato)</h4>
                  </div>
                  <span className="text-[11px] text-slate-400">Zero configurazione server richiesta</span>
                </div>

                <p className="text-xs text-slate-400">
                  Usa il protocollo di sistema per delegare l'apertura della sessione al tuo client SSH installato sul PC 
                  (OpenSSH, PuTTY, SecureCRT, Kitty, iTerm2, Windows Terminal):
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Nome Utente SSH:</label>
                    <input
                      type="text"
                      value={sshUser}
                      onChange={(e) => setSshUser(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                      placeholder="admin"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Porta SSH:</label>
                    <input
                      type="text"
                      value={sshPort}
                      onChange={(e) => setSshPort(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                      placeholder="22"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Host Target:</label>
                    <div className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-emerald-400 font-mono">
                      {device.ipManagement}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="font-mono text-xs text-emerald-300 overflow-x-auto w-full">
                    <span className="text-slate-500 select-none">$ </span>
                    ssh {sshUser}@{device.ipManagement} {sshPort !== '22' ? `-p ${sshPort}` : ''}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        const cmd = `ssh ${sshUser}@${device.ipManagement}${sshPort !== '22' ? ` -p ${sshPort}` : ''}`;
                        navigator.clipboard.writeText(cmd);
                        setCopiedCmd(true);
                        setTimeout(() => setCopiedCmd(false), 2000);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCmd ? 'Copiato!' : 'Copia'}</span>
                    </button>

                    <a
                      href={`ssh://${sshUser}@${device.ipManagement}${sshPort !== '22' ? `:${sshPort}` : ''}`}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 shadow transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Lancia Client SSH</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Technical Explanation: Why Browser cannot do raw SSH */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-semibold text-white">
                    Perché la sessione nel browser è simulata? (Limiti di Sicurezza W3C)
                  </h4>
                </div>

                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <p>
                    <strong className="text-white">1. Sandbox di Sicurezza del Browser:</strong> I browser moderni 
                    (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari) impediscono categoricamente alle applicazioni 
                    web JavaScript di aprire socket TCP grezzi (raw TCP sockets sulla porta 22). Il browser consente esclusivamente 
                    connessioni di livello applicativo: <strong>HTTP/HTTPS</strong>, <strong>WebSocket</strong> e <strong>WebRTC</strong>.
                  </p>
                  <p>
                    <strong className="text-white">2. Motivi di Sicurezza Enterprise:</strong> Se un sito web o una webapp potesse 
                    aprire connessioni TCP arbitrarie dalla scheda del browser, un utente malevolo potrebbe effettuare port-scanning della rete 
                    intranet aziendale dell'operatore, violare la Same-Origin Policy o attaccare apparati chiusi dietro firewall.
                  </p>
                  <p>
                    <strong className="text-white">3. Cosa fa l'Emulatore CLI NetRack DCIM:</strong> Per consentire la diagnostica rapida 
                    senza uscire dal browser, l'emulatore integrato interpreta i comandi Cisco/Arista (<code>show ip int brief</code>, <code>show lldp</code>, <code>show inv</code>, <code>show env</code>) 
                    interrogando in tempo reale le informazioni e la telemetria censite nel database DCIM per quell'apparato.
                  </p>
                </div>
              </div>

              {/* Method 2: Enterprise WebSSH Gateway */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-semibold text-white">
                      Metodo 2: Architettura WebSSH Gateway per Sessioni Reali In-Browser
                    </h4>
                  </div>
                  <span className="text-[11px] text-amber-400 font-mono">Produzione Enterprise</span>
                </div>

                <p className="text-xs text-slate-400">
                  Nei sistemi Data Center complessi (es. Apache Guacamole, Teleport o container WebSSH), per avere un vero terminale 
                  SSH fisico <em>dentro il browser</em> si usa un server gateway ponte (proxy WebSocket-to-TCP):
                </p>

                {/* ASCII Diagram */}
                <div className="bg-black/80 rounded-lg p-3 font-mono text-[11px] text-cyan-300 border border-slate-800 overflow-x-auto">
                  <div>┌─────────────────────────┐         WebSocket Cifrato (WSS)         ┌──────────────────────────┐</div>
                  <div>│  Browser Web Operatore  │ ═════════════════════════════════════▶ │ Ubuntu Server (Gateway)  │</div>
                  <div>│  (xterm.js / Interfaccia)│ ◀═════════════════════════════════════ │ (Proxy WebSSH / ttyd)    │</div>
                  <div>└─────────────────────────┘                                        └────────────┬─────────────┘</div>
                  <div>                                                                                │ Socket TCP:22 (SSH)</div>
                  <div>                                                                                ▼</div>
                  <div>                                                                 ┌──────────────────────────┐</div>
                  <div>                                                                 │ Apparato Fisico / Switch │</div>
                  <div>                                                                 │ {device.ipManagement}:22          │</div>
                  <div>                                                                 └──────────────────────────┘</div>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="font-semibold text-white">Come attivare il WebSSH Gateway su Ubuntu Server 26 in 1 minuto:</div>
                  <p className="text-slate-400">
                    Se desideri che il tuo server Ubuntu faccia da ponte per sessioni SSH fisiche dirette nel browser, puoi avviare il container WebSSH:
                  </p>
                  <pre className="bg-black/90 p-3 rounded-lg font-mono text-[11px] text-emerald-400 border border-slate-800 overflow-x-auto">
                    {`# 1. Avvia il gateway WebSSH su Ubuntu Server
sudo docker run -d --name netrack-webssh -p 8888:8888 huashengdun/webssh

# 2. Configura Nginx per inoltrare i WebSocket (nel file /etc/nginx/sites-available/netrack-dcim):
location /webssh/ {
    proxy_pass http://127.0.0.1:8888/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}`}
                  </pre>
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* Web GUI Simulator Mode */
          <div className="flex-1 bg-slate-950 flex flex-col">
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex-1 max-w-xl">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-mono">https://</span>
                <span className="font-mono text-white">{device.ipManagement}</span>
                <span className="text-slate-500 font-mono">/web-dashboard/index.html</span>
              </div>
              <a
                href={`https://${device.ipManagement}`}
                target="_blank"
                rel="noreferrer"
                className="ml-4 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center gap-1.5 text-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Apri in nuova scheda</span>
              </a>
            </div>

            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-400 mb-4 shadow-xl">
                <Globe className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">
                Pannello di Gestione Web {device.model}
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Connessione all'interfaccia HTTPS su <strong className="text-slate-200">{device.ipManagement}</strong> per apparato con matricola <span className="font-mono text-cyan-300">{device.serialNumber}</span>.
              </p>

              <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-left space-y-3 mb-6 text-xs font-mono">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Certificato SSL:</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Valido (Datacenter Root CA)
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Porta Web GUI:</span>
                  <span className="text-white">443 (HTTPS)</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Stato Apparato:</span>
                  <span className="text-emerald-400 font-bold">{device.isPoweredOn === 'SI' ? 'ONLINE (Acceso)' : 'OFFLINE (Spento)'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Utilizzatore:</span>
                  <span className="text-white">{device.user || 'Nessuno'}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setActiveMode('ssh')}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-2"
                >
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Passa a CLI DCIM</span>
                </button>
                <button
                  onClick={() => setActiveMode('real_ssh')}
                  className="px-4 py-2 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/50 text-xs font-medium flex items-center gap-2"
                >
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>SSH Reale</span>
                </button>
                <a
                  href={`https://${device.ipManagement}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Accedi alla Web GUI</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Terminal Footer Quick Bar */}
        {activeMode === 'ssh' && (
          <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span>Shortcut rapidi:</span>
              <button
                onClick={() => {
                  setCommandInput('show ip int brief');
                  inputRef.current?.focus();
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
              >
                show ip int brief
              </button>
              <button
                onClick={() => {
                  setCommandInput('show lldp neighbors');
                  inputRef.current?.focus();
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
              >
                show lldp
              </button>
              <button
                onClick={() => {
                  setCommandInput('show inv');
                  inputRef.current?.focus();
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
              >
                show inv
              </button>
            </div>
            <div className="flex items-center gap-2 font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Connesso a {device.ipManagement}:22</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
