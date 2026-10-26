#!/usr/bin/env bash
# ==============================================================================
# NetRack DCIM - Script di Ripristino / Rollback Immediato
# ==============================================================================
set -euo pipefail

# Colori per output shell
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[ERRORE] Questo script deve essere eseguito come root o con sudo.${NC}"
   exit 1
fi

APP_DIR="/var/www/netrack-dcim"
BACKUP_BASE_DIR="/var/backups/netrack-dcim"
SPECIFIED_BACKUP="${1:-}"

# Trova l'ultimo backup se non specificato
if [ -z "${SPECIFIED_BACKUP}" ]; then
    LAST_BACKUP=$(ls -td ${BACKUP_BASE_DIR}/backup_* 2>/dev/null | head -n 1 || true)
    if [ -z "${LAST_BACKUP}" ]; then
        echo -e "${RED}[ERRORE] Nessun backup trovato in ${BACKUP_BASE_DIR}.${NC}"
        exit 1
    fi
    TARGET_BACKUP="${LAST_BACKUP}"
else
    TARGET_BACKUP="${SPECIFIED_BACKUP}"
fi

echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}        NetRack DCIM - Ripristino Versione Precedente (Rollback)    ${NC}"
echo -e "${CYAN}====================================================================${NC}"
echo -e "Cartella backup selezionata: ${YELLOW}${TARGET_BACKUP}${NC}"

if [ ! -d "${TARGET_BACKUP}" ]; then
    echo -e "${RED}[ERRORE] La directory di backup ${TARGET_BACKUP} non esiste.${NC}"
    exit 1
fi

echo -e "\n -> Ripristino cartella di produzione dist..."
if [ -d "${TARGET_BACKUP}/dist" ]; then
    rm -rf "${APP_DIR}/dist"
    cp -r "${TARGET_BACKUP}/dist" "${APP_DIR}/dist"
    chown -R www-data:www-data "${APP_DIR}/dist"
    chmod -R 755 "${APP_DIR}/dist"
fi

if [ -f "${TARGET_BACKUP}/package.json" ]; then
    cp "${TARGET_BACKUP}/package.json" "${APP_DIR}/package.json"
fi

echo -e " -> Ricaricamento servizio Nginx..."
systemctl reload nginx

if systemctl is-active --quiet netrack-dcim.service 2>/dev/null; then
    systemctl restart netrack-dcim.service
fi

echo -e "\n${GREEN}[OK] Rollback completato con successo alla versione di backup!${NC}"
echo -e "Verifica il funzionamento su: http://$(hostname -I | awk '{print $1}')"
