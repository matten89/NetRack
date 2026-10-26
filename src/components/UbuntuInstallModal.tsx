/**
 * NetRack DCIM - Ubuntu Server Deployment Guide Modal (Featuring Ubuntu Server 26)
 */
import React, { useState } from 'react';
import {
  Terminal,
  Copy,
  Check,
  X,
  Server,
  Shield,
  Layers,
  Download,
  ExternalLink,
  Cpu,
  HardDrive,
  Network,
  Zap,
  Sparkles,
  FileCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Container,
  AlertTriangle,
  ArrowUpCircle,
  History,
  Play,
  Wrench,
  GitBranch,
  Archive,
} from 'lucide-react';

interface UbuntuInstallModalProps {
  onClose: () => void;
}

export const UbuntuInstallModal: React.FC<UbuntuInstallModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'ubuntu26' | 'ubuntu24' | 'script' | 'updates' | 'docker' | 'troubleshoot'>('ubuntu26');
  const [activeUpdateScriptView, setActiveUpdateScriptView] = useState<'update' | 'fast' | 'rollback'>('update');
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  const copyToClipboard = (text: string, stepId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepId);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const downloadScriptFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/x-shellscript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadBashScript = () => {
    const scriptContent = `#!/usr/bin/env bash
# ==============================================================================
# NetRack DCIM - Script di Installazione Automatica per Ubuntu Server 26 (26.04 LTS)
# ==============================================================================
set -euo pipefail

# Disabilita prompt interattivi e needrestart in background
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

echo "==> [1/6] Aggiornamento del sistema Ubuntu 26..."
sudo apt update && sudo apt upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
sudo apt install -y curl wget git gnupg ca-certificates build-essential ufw nginx

echo "==> [2/6] Configurazione Node.js 22 LTS via Keyring moderno..."
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt update
sudo apt install -y nodejs

echo "==> [3/6] Installazione e Compilazione NetRack DCIM..."
sudo mkdir -p /var/www/netrack-dcim
sudo chown -R $USER:$USER /var/www/netrack-dcim
# Copia o clona repository in /var/www/netrack-dcim
cd /var/www/netrack-dcim
npm install --legacy-peer-deps
npm run build

echo "==> [4/6] Configurazione Nginx..."
sudo tee /etc/nginx/sites-available/netrack-dcim > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root /var/www/netrack-dcim/dist;
    index index.html;
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml image/svg+xml;

    location / {
        try_files $uri $uri/ /index.html;
    }
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
EOF
sudo ln -sf /etc/nginx/sites-available/netrack-dcim /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "==> [5/6] Configurazione Firewall UFW..."
sudo ufw limit OpenSSH
sudo ufw allow 'Nginx Full'
echo "y" | sudo ufw enable || true

echo "==> [6/6] Creazione Servizio Systemd Hardened..."
sudo tee /etc/systemd/system/netrack-dcim.service > /dev/null << 'EOF'
[Unit]
Description=NetRack DCIM Daemon
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/netrack-dcim
ExecStart=/usr/bin/npm run preview -- --port 3000 --host 0.0.0.0
Restart=always
RestartSec=10
Environment=NODE_ENV=production
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
NoNewPrivileges=true
ReadWritePaths=/var/www/netrack-dcim

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable netrack-dcim.service
sudo systemctl restart netrack-dcim.service

echo "==> Installazione completata con successo su Ubuntu Server 26!"
`;
    const blob = new Blob([scriptContent], { type: 'text/x-shellscript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'install-ubuntu26.sh';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const ubuntu26Steps = [
    {
      id: 'u26_step1',
      title: 'Passo 1: Aggiornamento Sistema e Strumenti Base (Ubuntu 26)',
      desc: 'Aggiorna i repository APT e installa gli strumenti essenziali di compilazione e networking.',
      cmd: `sudo apt update && sudo apt upgrade -y\nsudo apt install -y curl wget git gnupg ca-certificates build-essential ufw software-properties-common nginx`,
    },
    {
      id: 'u26_step2',
      title: 'Passo 2: Installazione Node.js 22 LTS con Keyring Moderno APT',
      desc: 'Ubuntu Server 26 richiede lo standard /etc/apt/keyrings/ per la convalida crittografica delle sorgenti.',
      cmd: `# Prepara il keyring crittografico ufficiale NodeSource\nsudo mkdir -p /etc/apt/keyrings\ncurl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes\n\n# Aggiungi il repository Node.js 22.x LTS\necho "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list\n\n# Installa Node.js e verifica\nsudo apt update && sudo apt install -y nodejs\nnode -v && npm -v`,
    },
    {
      id: 'u26_step3',
      title: 'Passo 3: Setup Directory, Installazione Dipendenze e Build Produzione',
      desc: 'Installa le dipendenze con --legacy-peer-deps per evitare blocchi ERESOLVE di npm 10+ e compila la cartella /dist.',
      cmd: `sudo mkdir -p /var/www/netrack-dcim\nsudo chown -R $USER:$USER /var/www/netrack-dcim\ncd /var/www/netrack-dcim\n\n# Copia i file del progetto o clona da Git\n# git clone <URL_REPOSITORY> .\n\n# Installa i moduli evitando conflitti di peer resolution e compila\nnpm install --legacy-peer-deps\nnpm run build`,
    },
    {
      id: 'u26_step4',
      title: 'Passo 4: Configurazione Web Server Nginx (VirtualHost SPA)',
      desc: 'Configura Nginx con compressione Gzip e supporto per routing SPA React / Vite.',
      cmd: `sudo nano /etc/nginx/sites-available/netrack-dcim\n\n# Incolla la configurazione per la porta 80 e root /var/www/netrack-dcim/dist\n# Poi abilita il VirtualHost:\nsudo ln -sf /etc/nginx/sites-available/netrack-dcim /etc/nginx/sites-enabled/\nsudo rm -f /etc/nginx/sites-enabled/default\nsudo nginx -t\nsudo systemctl restart nginx\nsudo systemctl enable nginx`,
    },
    {
      id: 'u26_step5',
      title: 'Passo 5: Servizio Systemd Hardened con Sandbox di Sicurezza (Ubuntu 26)',
      desc: 'Crea un demone systemd isolato con privilegi minimi e protezione del filesystem.',
      cmd: `sudo nano /etc/systemd/system/netrack-dcim.service\n\n# Inserisci la configurazione hardened:\n# [Service]\n# User=www-data\n# ProtectSystem=strict\n# ProtectHome=true\n# PrivateTmp=true\n# NoNewPrivileges=true\n\nsudo systemctl daemon-reload\nsudo systemctl enable netrack-dcim\nsudo systemctl start netrack-dcim\nsudo systemctl status netrack-dcim`,
    },
    {
      id: 'u26_step6',
      title: 'Passo 6: Firewall UFW con Rate-Limiting SSH e Nginx Full',
      desc: 'Protegge la macchina applicando limiti contro brute-force SSH ed esponendo le porte HTTP/HTTPS.',
      cmd: `sudo ufw limit OpenSSH\nsudo ufw allow 'Nginx Full'\nsudo ufw enable\nsudo ufw status verbose`,
    },
    {
      id: 'u26_step7',
      title: 'Passo 7: Certificato SSL Gratuito HTTPS con Certbot Let\'s Encrypt',
      desc: 'Abilita cifratura TLS 1.3 automatica e rinnovo gestito da Systemd Timer.',
      cmd: `sudo apt install -y certbot python3-certbot-nginx\nsudo certbot --nginx -d dcim.tuodominio.it\n# Verifica il rinnovo automatico:\nsudo certbot renew --dry-run`,
    },
  ];

  const ubuntu24Steps = [
    {
      id: 'u24_step1',
      title: '1. Aggiorna il sistema Ubuntu 24/22',
      cmd: 'sudo apt update && sudo apt upgrade -y\nsudo apt install -y curl wget git build-essential nginx ufw',
    },
    {
      id: 'u24_step2',
      title: '2. Installa Node.js LTS (v20 o v22)',
      cmd: 'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -\nsudo apt install -y nodejs\nnode -v && npm -v',
    },
    {
      id: 'u24_step3',
      title: '3. Prepara la cartella e compila l\'app',
      cmd: 'sudo mkdir -p /var/www/netrack-dcim\nsudo chown -R $USER:$USER /var/www/netrack-dcim\ncd /var/www/netrack-dcim\nnpm install --legacy-peer-deps\nnpm run build',
    },
    {
      id: 'u24_step4',
      title: '4. Configura Nginx VirtualHost',
      cmd: 'sudo nano /etc/nginx/sites-available/netrack-dcim\nsudo ln -s /etc/nginx/sites-available/netrack-dcim /etc/nginx/sites-enabled/\nsudo rm -f /etc/nginx/sites-enabled/default\nsudo nginx -t && sudo systemctl restart nginx',
    },
    {
      id: 'u24_step5',
      title: '5. Configura UFW Firewall e SSL Certbot',
      cmd: 'sudo ufw allow OpenSSH\nsudo ufw allow \'Nginx Full\'\nsudo ufw enable\nsudo apt install -y certbot python3-certbot-nginx\nsudo certbot --nginx -d dcim.tuodominio.it',
    },
  ];

  const automatedScriptCode = `#!/usr/bin/env bash
# NetRack DCIM - Installatore Rapido per Ubuntu Server 26 (26.04 LTS)
set -euo pipefail

# Disabilita notifiche e blocchi interattivi needrestart su Ubuntu 26
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

echo "==> Inizio installazione NetRack DCIM su Ubuntu 26..."
sudo apt update && sudo apt upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
sudo apt install -y curl wget git gnupg ca-certificates build-essential ufw nginx

# Node.js 22 LTS con keyring APT moderno
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt update && sudo apt install -y nodejs

# Cartella e build con protezione --legacy-peer-deps
sudo mkdir -p /var/www/netrack-dcim
sudo chown -R $USER:$USER /var/www/netrack-dcim
cd /var/www/netrack-dcim
# Copia sorgenti o clona: git clone <REPO_URL> .
npm install --legacy-peer-deps
npm run build

# Nginx config
sudo tee /etc/nginx/sites-available/netrack-dcim > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root /var/www/netrack-dcim/dist;
    index index.html;
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml image/svg+xml;

    location / {
        try_files $uri $uri/ /index.html;
    }
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/netrack-dcim /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx && sudo systemctl enable nginx

# Firewall
sudo ufw limit OpenSSH
sudo ufw allow 'Nginx Full'
echo "y" | sudo ufw enable || true

echo "==> NetRack DCIM installato con successo su Ubuntu Server 26!"
echo "Accedi al server via browser: http://$(hostname -I | awk '{print $1}')"`;

  const dockerComposeCode = `version: '3.8'

services:
  dcim-web:
    image: nginx:alpine
    container_name: netrack_dcim_web
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./deploy/nginx-netrack.conf:/etc/nginx/conf.d/default.conf:ro
    environment:
      - NGINX_PORT=80
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost"]
      interval: 30s
      timeout: 5s
      retries: 3`;

  const updateScriptCode = `#!/usr/bin/env bash
# NetRack DCIM - Script di Aggiornamento Automatico con Backup e Healthcheck
# Utilizzo: sudo bash deploy/update-netrack.sh [opzionale: cartella_sorgente_o_archivio]
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

APP_DIR="/var/www/netrack-dcim"
BACKUP_DIR="/var/backups/netrack-dcim/backup_$(date +%Y%m%d_%H%M%S)"
SOURCE_INPUT="\${1:-}"

echo "==> [1/6] Creazione backup di sicurezza in \${BACKUP_DIR}..."
mkdir -p "\${BACKUP_DIR}"
[ -d "\${APP_DIR}/dist" ] && cp -r "\${APP_DIR}/dist" "\${BACKUP_DIR}/dist"
[ -f "\${APP_DIR}/package.json" ] && cp "\${APP_DIR}/package.json" "\${BACKUP_DIR}/"

echo "==> [2/6] Applicazione modifiche e nuovi sorgenti..."
if [ -n "\${SOURCE_INPUT}" ] && [ -d "\${SOURCE_INPUT}" ]; then
    rsync -av --exclude 'node_modules' --exclude '.git' --exclude 'dist' "\${SOURCE_INPUT}/" "\${APP_DIR}/"
elif [ -d "\${APP_DIR}/.git" ]; then
    cd "\${APP_DIR}" && git pull origin main || true
fi

cd "\${APP_DIR}"
echo "==> [3/6] Risoluzione dipendenze npm con protezione peer..."
npm install --legacy-peer-deps

echo "==> [4/6] Compilazione produzione ottimizzata..."
npm run build
chown -R www-data:www-data "\${APP_DIR}"
chmod -R 755 "\${APP_DIR}/dist"

echo "==> [5/6] Ricaricamento Nginx e Systemd..."
nginx -t && systemctl reload nginx
systemctl is-active --quiet netrack-dcim.service && systemctl restart netrack-dcim.service || true

echo "==> [6/6] Healthcheck HTTP..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ || echo "000")
echo "==> Aggiornamento completato con successo! Risposta HTTP: \${HTTP_STATUS}"
echo "Backup salvato in: \${BACKUP_DIR}"`;

  const fastModScriptCode = `#!/usr/bin/env bash
# NetRack DCIM - Applica Modifiche Locali Rapide (Fast Build in 5 secondi)
# Utilizzo: sudo bash deploy/apply-modifications.sh
set -euo pipefail
APP_DIR="/var/www/netrack-dcim"
cd "\${APP_DIR}"

echo "==> Ricompilazione produzione (npm run build)..."
npm run build

echo "==> Impostazione permessi e ricarica Nginx..."
chown -R www-data:www-data "\${APP_DIR}/dist"
chmod -R 755 "\${APP_DIR}/dist"
nginx -t && systemctl reload nginx
systemctl is-active --quiet netrack-dcim.service && systemctl restart netrack-dcim.service || true

echo "==> Modifiche pubblicate con successo! Visita: http://\$(hostname -I | awk '{print \$1}')"`;

  const rollbackScriptCode = `#!/usr/bin/env bash
# NetRack DCIM - Ripristino / Rollback Immediato alla versione precedente
# Utilizzo: sudo bash deploy/rollback-netrack.sh [cartella_backup_opzionale]
set -euo pipefail
APP_DIR="/var/www/netrack-dcim"
BACKUP_BASE="/var/backups/netrack-dcim"
TARGET_BACKUP="\${1:-}"

if [ -z "\${TARGET_BACKUP}" ]; then
    TARGET_BACKUP=$(ls -td \${BACKUP_BASE}/backup_* 2>/dev/null | head -n 1 || true)
fi

echo "==> Ripristino da backup: \${TARGET_BACKUP}"
rm -rf "\${APP_DIR}/dist"
cp -r "\${TARGET_BACKUP}/dist" "\${APP_DIR}/dist"
chown -R www-data:www-data "\${APP_DIR}/dist"
chmod -R 755 "\${APP_DIR}/dist"
systemctl reload nginx
echo "==> Rollback completato con successo!"`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-600 flex items-center justify-center text-white font-bold shadow-lg shadow-orange-600/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Guida Installazione Ubuntu Server
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-950 text-orange-400 border border-orange-800 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Ubuntu 26 LTS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Documentazione di installazione, hardening e produzione per Ubuntu Server 26 (26.04) e 24/22 LTS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi guida"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-800 bg-slate-950 flex gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('ubuntu26')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ubuntu26'
                ? 'border-orange-500 text-orange-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-orange-400" />
            <span>Ubuntu Server 26 (26.04 LTS)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-950 text-orange-300 font-mono">Consigliata</span>
          </button>

          <button
            onClick={() => setActiveTab('ubuntu24')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ubuntu24'
                ? 'border-cyan-500 text-cyan-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ubuntu 24.04 / 22.04 LTS</span>
          </button>

          <button
            onClick={() => setActiveTab('script')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'script'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Installatore Base (.sh)</span>
          </button>

          <button
            onClick={() => setActiveTab('updates')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'updates'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Aggiornamenti & Modifiche</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono">Auto Updater</span>
          </button>

          <button
            onClick={() => setActiveTab('docker')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'docker'
                ? 'border-blue-500 text-blue-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Container className="w-3.5 h-3.5 text-blue-400" />
            <span>Docker Compose</span>
          </button>

          <button
            onClick={() => setActiveTab('troubleshoot')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'troubleshoot'
                ? 'border-purple-500 text-purple-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
            <span>Verifica & Risoluzione Errori</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* HARDWARE PREREQUISITES PILLS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">PIATTAFORMA TARGET</span>
              <span className="text-orange-400 font-bold">Ubuntu 26 LTS (64-bit)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">CPU RACCOMANDATA</span>
              <span className="text-cyan-400 font-bold">2+ vCPU (x86_64/ARM64)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">MEMORIA RAM</span>
              <span className="text-emerald-400 font-bold">2 GB - 4 GB</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">PORTE FIREWALL</span>
              <span className="text-indigo-400 font-bold">22 (SSH), 80, 443 (SSL)</span>
            </div>
          </div>

          {/* TAB 1: UBUNTU SERVER 26 */}
          {activeTab === 'ubuntu26' && (
            <div className="space-y-5 animate-in fade-in">
              {/* Feature highlight banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-orange-950/40 via-amber-950/20 to-slate-950 border border-orange-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-orange-300 text-sm">Caratteristiche Ubuntu Server 26 (26.04 LTS)</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Kernel Linux 6.14+, Systemd v258+ con sandbox nativo, gestione crittografica modernizzata dei repository (/etc/apt/keyrings) e supporto Node.js 22/24 LTS.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={downloadBashScript}
                    className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-orange-900/30 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Scarica Script .sh</span>
                  </button>
                  <button
                    onClick={() => copyToClipboard(automatedScriptCode, 'full_script_u26')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
                  >
                    {copiedStep === 'full_script_u26' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiato!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copia Tutto</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Step by step list */}
              <div className="space-y-4">
                {ubuntu26Steps.map((step) => (
                  <div key={step.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-white block">{step.title}</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">{step.desc}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(step.cmd, step.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-orange-400 text-[11px] font-mono flex items-center gap-1 border border-slate-800 transition-colors shrink-0"
                      >
                        {copiedStep === step.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copiato!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copia</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 font-mono text-[11px] text-orange-300 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                      {step.cmd}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: UBUNTU SERVER 24 / 22 */}
          {activeTab === 'ubuntu24' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-slate-300">
                Guida per distribuzioni <strong>Ubuntu 24.04 LTS (Noble Numbat)</strong> e <strong>Ubuntu 22.04 LTS (Jammy Jellyfish)</strong>.
              </div>

              <div className="space-y-4">
                {ubuntu24Steps.map((step) => (
                  <div key={step.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{step.title}</span>
                      <button
                        onClick={() => copyToClipboard(step.cmd, step.id)}
                        className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 text-[11px] font-mono flex items-center gap-1 border border-slate-800 transition-colors"
                      >
                        {copiedStep === step.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copiato!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copia comandi</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 font-mono text-[11px] text-cyan-300 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                      {step.cmd}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: AUTOMATED SCRIPT */}
          {activeTab === 'script' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-emerald-300 block">Script Bash Idempotente per Ubuntu Server 26</span>
                  <span className="text-[11px] text-slate-400">
                    Esegue in un'unica volta tutti i controlli OS, installazione Node 22, Nginx, UFW, flags anti-conflitto npm e Systemd.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadBashScript}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Scarica .sh</span>
                  </button>
                  <button
                    onClick={() => copyToClipboard(automatedScriptCode, 'copy_full_script')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
                  >
                    {copiedStep === 'copy_full_script' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiato!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copia Script</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1 font-mono">Come eseguire direttamente sul server Ubuntu 26:</span>
                <pre className="p-2.5 rounded bg-slate-900 font-mono text-[11px] text-emerald-400 select-all overflow-x-auto">
                  sudo bash deploy/install-ubuntu26.sh
                </pre>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-96 leading-relaxed select-all">
                  {automatedScriptCode}
                </pre>
              </div>
            </div>
          )}

          {/* TAB: AGGIORNAMENTI & MODIFICHE AUTOMATICHE */}
          {activeTab === 'updates' && (
            <div className="space-y-5 animate-in fade-in text-xs">
              {/* Header Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-cyan-950/40 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
                    Script di Aggiornamento Automatico e Applicazione Modifiche
                  </span>
                  <span className="text-[11px] text-slate-300">
                    File eseguibili pronti all'uso inclusi nella cartella <code className="text-cyan-300 font-mono">deploy/</code> del progetto per la manutenzione diretta sulla macchina Ubuntu.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => downloadScriptFile('update-netrack.sh', updateScriptCode)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Scarica update-netrack.sh</span>
                  </button>
                </div>
              </div>

              {/* 4 Action Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Card 1: Standard Update */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <RefreshCw className="w-4 h-4 text-emerald-400" />
                        1. Aggiornamento Completo con Backup
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono">Consigliato</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Crea un backup preventivo con timestamp in <code className="text-slate-300 font-mono">/var/backups/</code>, risolve i conflitti npm, compila la nuova versione e verifica la risposta HTTP 200.
                    </p>
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
                      <code className="text-emerald-300 select-all">sudo bash deploy/update-netrack.sh</code>
                      <button
                        onClick={() => copyToClipboard('sudo bash deploy/update-netrack.sh', 'copy_cmd_update')}
                        className="text-slate-400 hover:text-white p-1"
                        title="Copia comando"
                      >
                        {copiedStep === 'copy_cmd_update' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card 2: Update from Folder or Archive */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Archive className="w-4 h-4 text-cyan-400" />
                        2. Aggiornamento da Cartella o File ZIP / TAR
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono">Offline / No Git</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Se hai caricato una nuova cartella con SCP/SFTP o un archivio compresso, lo script sincronizza solo i file modificati ed esegue l'aggiornamento.
                    </p>
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
                      <code className="text-cyan-300 select-all">sudo bash deploy/update-netrack.sh /home/cse/nuovi-file</code>
                      <button
                        onClick={() => copyToClipboard('sudo bash deploy/update-netrack.sh /home/cse/nuovi-file', 'copy_cmd_update_src')}
                        className="text-slate-400 hover:text-white p-1"
                        title="Copia comando"
                      >
                        {copiedStep === 'copy_cmd_update_src' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card 3: Fast Modifications Applier */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Play className="w-4 h-4 text-amber-400" />
                        3. Fast Build: Applica Modifiche Locali
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 font-mono">5 Secondi</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Hai modificato manualmente un componente, un file CSS o una configurazione direttamente sul server? Questo script compila e pubblica all'istante senza reinstallare i pacchetti.
                    </p>
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
                      <code className="text-amber-300 select-all">sudo bash deploy/apply-modifications.sh</code>
                      <button
                        onClick={() => copyToClipboard('sudo bash deploy/apply-modifications.sh', 'copy_cmd_fast')}
                        className="text-slate-400 hover:text-white p-1"
                        title="Copia comando"
                      >
                        {copiedStep === 'copy_cmd_fast' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card 4: Instant Rollback */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <History className="w-4 h-4 text-purple-400" />
                        4. Rollback / Ripristino Immediato
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 font-mono">Sicurezza Zero-Downtime</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Se un aggiornamento introduce un errore imprevisto, ripristina all'istante l'ultimo backup precedente salvato automaticamente da update-netrack.sh.
                    </p>
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
                      <code className="text-purple-300 select-all">sudo bash deploy/rollback-netrack.sh</code>
                      <button
                        onClick={() => copyToClipboard('sudo bash deploy/rollback-netrack.sh', 'copy_cmd_rollback')}
                        className="text-slate-400 hover:text-white p-1"
                        title="Copia comando"
                      >
                        {copiedStep === 'copy_cmd_rollback' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Code Viewer with selector tabs */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveUpdateScriptView('update')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        activeUpdateScriptView === 'update'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>deploy/update-netrack.sh</span>
                    </button>
                    <button
                      onClick={() => setActiveUpdateScriptView('fast')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        activeUpdateScriptView === 'fast'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>deploy/apply-modifications.sh</span>
                    </button>
                    <button
                      onClick={() => setActiveUpdateScriptView('rollback')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        activeUpdateScriptView === 'rollback'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>deploy/rollback-netrack.sh</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const code = activeUpdateScriptView === 'update'
                          ? updateScriptCode
                          : activeUpdateScriptView === 'fast'
                          ? fastModScriptCode
                          : rollbackScriptCode;
                        const fname = activeUpdateScriptView === 'update'
                          ? 'update-netrack.sh'
                          : activeUpdateScriptView === 'fast'
                          ? 'apply-modifications.sh'
                          : 'rollback-netrack.sh';
                        downloadScriptFile(fname, code);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-medium flex items-center gap-1 border border-slate-800 transition-colors"
                    >
                      <Download className="w-3 h-3 text-cyan-400" />
                      <span>Scarica file</span>
                    </button>

                    <button
                      onClick={() => {
                        const code = activeUpdateScriptView === 'update'
                          ? updateScriptCode
                          : activeUpdateScriptView === 'fast'
                          ? fastModScriptCode
                          : rollbackScriptCode;
                        copyToClipboard(code, `copy_script_${activeUpdateScriptView}`);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-medium flex items-center gap-1 border border-slate-800 transition-colors"
                    >
                      {copiedStep === `copy_script_${activeUpdateScriptView}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copiato!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copia codice</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-72 leading-relaxed select-all">
                  {activeUpdateScriptView === 'update'
                    ? updateScriptCode
                    : activeUpdateScriptView === 'fast'
                    ? fastModScriptCode
                    : rollbackScriptCode}
                </pre>
              </div>

              {/* Automatic Cron Job Tips */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-white block">Aggiornamento Notturno Automatico Schedulato (Opzionale con Crontab)</span>
                <p className="text-[11px] text-slate-400">
                  Se vuoi sincronizzare e aggiornare l'applicazione in modo automatico ogni notte alle 03:00 del mattino:
                </p>
                <pre className="p-2.5 rounded bg-slate-900 font-mono text-[11px] text-emerald-400 select-all overflow-x-auto">
                  0 3 * * * root /var/www/netrack-dcim/deploy/update-netrack.sh &gt;&gt; /var/log/netrack_update.log 2&gt;&amp;1
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: DOCKER COMPOSE */}
          {activeTab === 'docker' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-blue-300 block">Distribuzione Containerizzata con Docker su Ubuntu 26</span>
                  <span className="text-[11px] text-slate-400">
                    Utilizza l'immagine Alpine Nginx e isola l'istanza con auto-restart e healthcheck integrato.
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(dockerComposeCode, 'docker_compose_copy')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
                >
                  {copiedStep === 'docker_compose_copy' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiato!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copia Compose</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-white">Comando di avvio rapido:</span>
                <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-cyan-300 select-all">
                  docker compose -f deploy/docker-compose.yml up -d --build
                </pre>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-white">deploy/docker-compose.yml:</span>
                <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap select-all">
                  {dockerComposeCode}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 5: TROUBLESHOOTING & VERIFICA */}
          {activeTab === 'troubleshoot' && (
            <div className="space-y-4 animate-in fade-in text-xs">
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/40 text-purple-300">
                <span className="font-bold block text-sm">Diagnostica e Risoluzione Errori Noti su Ubuntu Server 26</span>
                <span className="text-slate-400 text-[11px]">
                  Risoluzione immediata per i log di installazione, avvisi del kernel e conflitti di pacchetti.
                </span>
              </div>

              {/* Specific ERESOLVE Fix Card */}
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Risoluzione: npm error code ERESOLVE (conflitto esbuild / vite)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Questo errore si verifica quando una versione recente di <code className="text-cyan-300 font-mono">npm (10.x o 12.x)</code> tenta di imporre una risoluzione rigida sui peer dependencies di Vite ed esbuild. Per risolvere subito ed eseguire il build:
                </p>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 text-amber-300 select-all">
                    cd /var/www/netrack-dcim{'\n'}npm install --legacy-peer-deps{'\n'}npm run build
                  </pre>
                  <p className="text-[10px] text-slate-400">
                    Il flag <code className="text-slate-200">--legacy-peer-deps</code> dice ad npm di procedere normalmente senza bloccare l'albero delle dipendenze.
                  </p>
                </div>
              </div>

              {/* Kernel Warning Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <AlertCircle className="w-4 h-4 text-cyan-400" />
                  <span>Avviso: Pending kernel upgrade! / needrestart (7.0.0-generic)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Il messaggio <code className="text-slate-300 font-mono">The currently running kernel version is not the expected kernel version</code> è un semplice avviso del tool di sistema Ubuntu <code className="text-slate-300 font-mono">needrestart</code> informando che apt ha installato un aggiornamento del kernel Linux. Non blocca l'applicazione: basta riavviare la macchina quando opportuno con <code className="text-cyan-300 font-mono">sudo reboot</code>.
                </p>
              </div>

              {/* SSH Real vs Simulated Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/60 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <span>Connessioni SSH agli Apparati: Perché la sessione web è simulata?</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  I browser web impediscono al codice JavaScript di aprire socket raw TCP sulla porta 22 per ragioni di sicurezza W3C (prevenzione port scanning e CSRF nella LAN aziendale). La console web integrata nel DCIM emula i comandi di diagnostica (Cisco/Arista) interrogando il database dei dispositivi.
                </p>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1 text-[11px]">
                  <div className="text-emerald-400 font-semibold">Come connettersi in modo reale all'apparato:</div>
                  <ul className="list-disc list-inside text-slate-400 space-y-1">
                    <li><strong className="text-white">Opzione 1 (Immediata):</strong> Clicca sul pulsante <em>"Lancia Client SSH"</em> nella modale del dispositivo per aprire OpenSSH/PuTTY sul tuo computer locale via URL <code className="text-cyan-300 font-mono">ssh://admin@ip</code>.</li>
                    <li><strong className="text-white">Opzione 2 (Gateway WebSSH su Ubuntu 26):</strong> Avvia il container proxy con <code className="text-amber-300 font-mono">sudo docker run -d -p 8888:8888 huashengdun/webssh</code> e inoltra i WebSocket tramite Nginx per avere una shell reale dentro il browser.</li>
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-semibold text-white block">1. Verifica Stato Nginx</span>
                  <pre className="p-2 rounded bg-slate-900 font-mono text-[11px] text-cyan-300 select-all">
                    sudo systemctl status nginx
                  </pre>
                  <p className="text-[10px] text-slate-400">Assicurati che compaia: Active: active (running)</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-semibold text-white block">2. Test Sintassi Nginx</span>
                  <pre className="p-2 rounded bg-slate-900 font-mono text-[11px] text-cyan-300 select-all">
                    sudo nginx -t
                  </pre>
                  <p className="text-[10px] text-slate-400">Verifica: syntax is ok e test is successful</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-semibold text-white block">3. Log di Accesso & Errori Nginx</span>
                  <pre className="p-2 rounded bg-slate-900 font-mono text-[11px] text-cyan-300 select-all">
                    sudo tail -f /var/log/nginx/netrack_dcim_error.log
                  </pre>
                  <p className="text-[10px] text-slate-400">Mostra eventuali errori di caricamento in tempo reale</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-semibold text-white block">4. Stato Firewall UFW</span>
                  <pre className="p-2 rounded bg-slate-900 font-mono text-[11px] text-cyan-300 select-all">
                    sudo ufw status verbose
                  </pre>
                  <p className="text-[10px] text-slate-400">Verifica che le porte 22 e 80/443 siano ALLOW</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-semibold text-white block">5. Servizio Systemd NetRack</span>
                  <pre className="p-2 rounded bg-slate-900 font-mono text-[11px] text-cyan-300 select-all">
                    sudo journalctl -u netrack-dcim.service -f -n 50
                  </pre>
                  <p className="text-[10px] text-slate-400">Visualizza i log del demone in esecuzione su Ubuntu 26</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-semibold text-white block">6. Test Locale di Risposta HTTP</span>
                  <pre className="p-2 rounded bg-slate-900 font-mono text-[11px] text-cyan-300 select-all">
                    curl -I http://localhost
                  </pre>
                  <p className="text-[10px] text-slate-400">Deve restituire HTTP/1.1 200 OK</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Guida completa disponibile anche nel file: <code className="text-cyan-300 font-mono">INSTALL_UBUNTU.md</code></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadBashScript}
              className="px-3 py-1.5 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-800/60 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Scarica install-ubuntu26.sh</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
