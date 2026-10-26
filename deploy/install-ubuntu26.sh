#!/usr/bin/env bash
# ==============================================================================
# NetRack DCIM - Script di Installazione Automatica per Ubuntu Server 26 (26.04 LTS)
# ==============================================================================
set -euo pipefail

# Disabilita prompt interattivi e gestisci needrestart in modo automatico su Ubuntu 26
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

# Colori per output shell
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}         NetRack DCIM - Installatore Ubuntu Server 26 LTS           ${NC}"
echo -e "${CYAN}====================================================================${NC}"

# Verifica permessi di root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[ERRORE] Questo script deve essere eseguito come root o con sudo.${NC}"
   echo "Esempio: sudo bash install-ubuntu26.sh"
   exit 1
fi

# Rilevamento versione OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo -e "${GREEN}[INFO] Sistema operativo rilevato: $NAME $VERSION_ID ($VERSION_CODENAME)${NC}"
    if [[ "$ID" != "ubuntu" ]]; then
        echo -e "${YELLOW}[ATTENZIONE] Il sistema non è identificato come Ubuntu. L'installazione prosegue ma potrebbero esserci differenze.${NC}"
    fi
else
    echo -e "${YELLOW}[ATTENZIONE] File /etc/os-release non trovato. Procedo comunque.${NC}"
fi

# Directory di destinazione
APP_DIR="/var/www/netrack-dcim"
SERVICE_USER="www-data"

echo -e "\n${BLUE}[1/7] Aggiornamento dei repository e pacchetti di sistema...${NC}"
apt-get update -y
apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
apt-get install -y curl wget git gnupg ca-certificates build-essential ufw nginx

echo -e "\n${BLUE}[2/7] Configurazione del repository Node.js LTS (v22 / v24) per Ubuntu 26...${NC}"
mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
apt-get update -y
apt-get install -y nodejs

echo -e "${GREEN}[OK] Node.js installato: $(node -v) con npm: $(npm -v)${NC}"

echo -e "\n${BLUE}[3/7] Preparazione cartella applicazione in ${APP_DIR}...${NC}"
mkdir -p "${APP_DIR}"

# Se lo script è lanciato dalla root del progetto clonato
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "${SCRIPT_DIR}/package.json" ]; then
    echo -e "${GREEN}[INFO] Copia dei file di progetto da '${SCRIPT_DIR}' a '${APP_DIR}'...${NC}"
    cp -r "${SCRIPT_DIR}/." "${APP_DIR}/"
fi

cd "${APP_DIR}"

echo -e "\n${BLUE}[4/7] Installazione dipendenze e compilazione produzione (npm run build)...${NC}"
# Usa --legacy-peer-deps per garantire risoluzione fluida su ogni versione di npm / Node 22+
npm install --legacy-peer-deps
npm run build

# Imposta permessi cartella web
chown -R ${SERVICE_USER}:${SERVICE_USER} "${APP_DIR}"
chmod -R 755 "${APP_DIR}/dist"

echo -e "\n${BLUE}[5/7] Configurazione Nginx per Ubuntu 26...${NC}"
cat << 'EOF' > /etc/nginx/sites-available/netrack-dcim
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/netrack-dcim/dist;
    index index.html;

    # Compressione moderna gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml image/svg+xml;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Caching asset statici
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Headers di sicurezza enterprise (Ubuntu 26 hardened)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    access_log /var/log/nginx/netrack_dcim_access.log;
    error_log /var/log/nginx/netrack_dcim_error.log warn;
}
EOF

# Abilita configurazione Nginx
ln -sf /etc/nginx/sites-available/netrack-dcim /etc/nginx/sites-enabled/netrack-dcim
rm -f /etc/nginx/sites-enabled/default

# Verifica configurazione
nginx -t
systemctl restart nginx
systemctl enable nginx

echo -e "\n${BLUE}[6/7] Configurazione Firewall UFW per Ubuntu 26...${NC}"
ufw allow OpenSSH
ufw allow 'Nginx Full'
# Abilita solo se l'utente acconsente o già abilitato
if ! ufw status | grep -q "Status: active"; then
    echo -e "${YELLOW}[INFO] Abilitazione firewall UFW...${NC}"
    echo "y" | ufw enable || true
fi
ufw status verbose

echo -e "\n${BLUE}[7/7] Configurazione del Servizio Systemd Hardened (Opzionale per server mode)...${NC}"
cat << 'EOF' > /etc/systemd/system/netrack-dcim.service
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
# Hardening security su Ubuntu 26
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
NoNewPrivileges=true
ReadWritePaths=/var/www/netrack-dcim

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable netrack-dcim.service
systemctl restart netrack-dcim.service

# Rendi eseguibili tutti gli script di manutenzione
chmod +x /var/www/netrack-dcim/deploy/*.sh 2>/dev/null || true

echo -e "\n${GREEN}====================================================================${NC}"
echo -e "${GREEN}      Installazione di NetRack DCIM su Ubuntu 26 Completata!         ${NC}"
echo -e "${GREEN}====================================================================${NC}"
SERVER_IP=$(hostname -I | awk '{print $1}')
echo -e "L'applicazione è ora accessibile tramite browser su:"
echo -e "  -> Nginx Web (Porta 80):    ${CYAN}http://${SERVER_IP}${NC}"
echo -e "  -> Preview Daemon (Porta 3000): ${CYAN}http://${SERVER_IP}:3000${NC}"
echo -e "\nGestione Aggiornamenti Futuri via GitHub (Senza esportare file a mano):"
echo -e "  1. Configura GitHub una tantum:    ${YELLOW}sudo bash /var/www/netrack-dcim/deploy/setup-github-sync.sh${NC}"
echo -e "  2. Aggiorna da GitHub (con backup): ${YELLOW}sudo bash /var/www/netrack-dcim/deploy/update-from-github.sh${NC}"
echo -e "\nPer abilitare certificato SSL gratuito Let's Encrypt HTTPS:"
echo -e "  ${YELLOW}sudo apt install -y certbot python3-certbot-nginx${NC}"
echo -e "  ${YELLOW}sudo certbot --nginx -d dcim.tuodominio.it${NC}"
echo -e "${GREEN}====================================================================${NC}"
