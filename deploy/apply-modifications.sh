#!/usr/bin/env bash
# ==============================================================================
# NetRack DCIM - Applica Modifiche Locali Rapide (Fast Hot-Build)
# ==============================================================================
# Usalo quando modifichi direttamente file di codice, template o impostazioni
# sul server e desideri ricompilare e pubblicare istantaneamente.
#
# Esempio:
#   sudo bash deploy/apply-modifications.sh
# ==============================================================================
set -euo pipefail

# Colori per output shell
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[ERRORE] Esegui con sudo: sudo bash $0${NC}"
   exit 1
fi

APP_DIR="/var/www/netrack-dcim"
if [ ! -d "${APP_DIR}" ]; then
    APP_DIR="$(pwd)"
fi

cd "${APP_DIR}"

echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}        NetRack DCIM - Ricompilazione e Applicazione Modifiche      ${NC}"
echo -e "${CYAN}====================================================================${NC}"

echo -e " -> [1/3] Ricompilazione asset di produzione (npm run build)..."
npm run build

echo -e " -> [2/3] Impostazione permessi cartella web..."
chown -R www-data:www-data "${APP_DIR}/dist"
chmod -R 755 "${APP_DIR}/dist"

echo -e " -> [3/3] Ricaricamento Nginx..."
nginx -t && systemctl reload nginx

if systemctl is-active --quiet netrack-dcim.service 2>/dev/null; then
    systemctl restart netrack-dcim.service
fi

echo -e "\n${GREEN}[OK] Modifiche applicate con successo in pochi secondi!${NC}"
echo -e "Visita il sito per vedere le novità: http://$(hostname -I | awk '{print $1}')"
