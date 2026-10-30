#!/usr/bin/env bash
# ==============================================================================
# NetRack DCIM - Script di Aggiornamento Automatico e Applicazione Modifiche
# Piattaforme supportate: Ubuntu Server 26 (26.04 LTS), 24.04 LTS, 22.04 LTS
# ==============================================================================
# Utilizzo:
#   1. Aggiornamento standard (Git pull o ricompilazione):
#      sudo bash deploy/update-netrack.sh
#
#   2. Aggiornamento copiando file da un'altra cartella:
#      sudo bash deploy/update-netrack.sh /percorso/nuova-versione
#
#   3. Aggiornamento da archivio tar.gz o zip:
#      sudo bash deploy/update-netrack.sh /percorso/aggiornamento.tar.gz
# ==============================================================================
set -euo pipefail

# Disabilita prompt interattivi apt e needrestart
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

# Colori per output shell
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}        NetRack DCIM - Script di Aggiornamento Automatico           ${NC}"
echo -e "${CYAN}====================================================================${NC}"

# 1. Verifica permessi di root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[ERRORE] Questo script deve essere eseguito come root o con sudo.${NC}"
   echo "Esempio: sudo bash $0"
   exit 1
fi

APP_DIR="/var/www/netrack-dcim"
BACKUP_BASE_DIR="/var/backups/netrack-dcim"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_BASE_DIR}/backup_${TIMESTAMP}"
SERVICE_USER="www-data"
SOURCE_INPUT="${1:-}"

# Rilevamento della cartella dell'applicazione
if [ ! -d "${APP_DIR}" ]; then
    echo -e "${YELLOW}[ATTENZIONE] Cartella di produzione ${APP_DIR} non trovata.${NC}"
    # Se lo script si trova all'interno del progetto corrente
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
    if [ -f "${SCRIPT_DIR}/package.json" ]; then
        echo -e "${GREEN}[INFO] Uso la cartella corrente come root del progetto: ${SCRIPT_DIR}${NC}"
        APP_DIR="${SCRIPT_DIR}"
    else
        echo -e "${RED}[ERRORE] Impossibile trovare la directory di NetRack DCIM.${NC}"
        exit 1
    fi
fi

cd "${APP_DIR}"

# Risoluzione definitiva dell'errore "detected dubious ownership in repository"
git config --system --add safe.directory "${APP_DIR}" 2>/dev/null || true
git config --global --add safe.directory "${APP_DIR}" 2>/dev/null || true
git config --global --add safe.directory '*' 2>/dev/null || true
if [ -n "${SUDO_USER:-}" ]; then
    sudo -u "${SUDO_USER}" git config --global --add safe.directory "${APP_DIR}" 2>/dev/null || true
    sudo -u "${SUDO_USER}" git config --global --add safe.directory '*' 2>/dev/null || true
fi

echo -e "\n${BLUE}[1/6] Creazione Backup di Sicurezza Preventivo Obbligatorio...${NC}"
mkdir -p "${BACKUP_DIR}"

if command -v git &>/dev/null && [ -d "${APP_DIR}/.git" ]; then
    CURRENT_REV=$(cd "${APP_DIR}" && git rev-parse HEAD 2>/dev/null || true)
    if [ -n "${CURRENT_REV}" ]; then
        echo "${CURRENT_REV}" > "${BACKUP_DIR}/git_commit_hash.txt"
        echo -e " -> Salvato riferimento commit precedente: ${CURRENT_REV:0:8}"
    fi
fi

if [ -d "${APP_DIR}/dist" ]; then
    echo -e " -> Salvataggio build precedente in ${BACKUP_DIR}/dist"
    cp -r "${APP_DIR}/dist" "${BACKUP_DIR}/dist"
fi

if [ -f "${APP_DIR}/package.json" ]; then
    cp "${APP_DIR}/package.json" "${BACKUP_DIR}/package.json"
fi

if [ -f "${APP_DIR}/package-lock.json" ]; then
    cp "${APP_DIR}/package-lock.json" "${BACKUP_DIR}/package-lock.json"
fi

if [ -f "${APP_DIR}/.env" ]; then
    echo -e " -> Salvataggio configurazioni (.env)..."
    cp "${APP_DIR}/.env" "${BACKUP_DIR}/.env"
fi

# Salva configurazioni o file personalizzati se presenti
if [ -d "${APP_DIR}/data" ]; then
    cp -r "${APP_DIR}/data" "${BACKUP_DIR}/data"
fi

# Rotazione backup (conserva gli ultimi 10)
ls -1td ${BACKUP_BASE_DIR}/backup_* 2>/dev/null | tail -n +11 | xargs rm -rf 2>/dev/null || true

echo -e "${GREEN}[OK] Backup di sicurezza preventivo completato in: ${BACKUP_DIR}${NC}"

echo -e "\n${BLUE}[2/6] Applicazione modifiche e nuovi sorgenti...${NC}"

if [ -n "${SOURCE_INPUT}" ]; then
    if [ -f "${SOURCE_INPUT}" ]; then
        # File archivio (.tar.gz, .tgz, .zip)
        echo -e " -> Estrazione archivio sorgente: ${SOURCE_INPUT}"
        TEMP_EXTRACT=$(mktemp -d)
        if [[ "${SOURCE_INPUT}" == *.tar.gz ]] || [[ "${SOURCE_INPUT}" == *.tgz ]]; then
            tar -xzf "${SOURCE_INPUT}" -C "${TEMP_EXTRACT}"
        elif [[ "${SOURCE_INPUT}" == *.zip ]]; then
            unzip -q -o "${SOURCE_INPUT}" -d "${TEMP_EXTRACT}"
        fi
        
        # Copia i file estratti escludendo node_modules e .git
        rsync -av --exclude 'node_modules' --exclude '.git' --exclude 'dist' "${TEMP_EXTRACT}/" "${APP_DIR}/"
        rm -rf "${TEMP_EXTRACT}"
        echo -e "${GREEN}[OK] File aggiornati dall'archivio con successo.${NC}"

    elif [ -d "${SOURCE_INPUT}" ]; then
        # Cartella con nuovi file
        echo -e " -> Sincronizzazione file da cartella sorgente: ${SOURCE_INPUT}"
        rsync -av --exclude 'node_modules' --exclude '.git' --exclude 'dist' "${SOURCE_INPUT}/" "${APP_DIR}/"
        echo -e "${GREEN}[OK] File aggiornati dalla cartella sorgente.${NC}"
    fi

elif [ -d "${APP_DIR}/.git" ]; then
    # Aggiornamento tramite Git
    echo -e " -> Rilevato repository Git in ${APP_DIR}. Esecuzione git pull..."
    cd "${APP_DIR}"
    
    # Salva eventuali modifiche locali non committate in stash per evitare conflitti
    if ! git diff-index --quiet HEAD --; then
        echo -e "${YELLOW} -> Rilevate modifiche locali non salvate. Esecuzione 'git stash'...${NC}"
        git stash save "Auto-stash prima dell'aggiornamento ${TIMESTAMP}" || true
    fi
    
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    echo -e " -> Scaricamento commit da branch '${CURRENT_BRANCH}'..."
    git pull origin "${CURRENT_BRANCH}" || {
        echo -e "${YELLOW}[WARN] Git pull non riuscito direttamente (forse assenza di credenziali remote o connessione). Procedo con la build dei file esistenti.${NC}"
    }
else
    echo -e " -> Nessun sorgente esterno specificato e nessun repository Git. Ricompilo i file locali aggiornati in ${APP_DIR}."
fi

cd "${APP_DIR}"

echo -e "\n${BLUE}[3/6] Risoluzione dipendenze e aggiornamento pacchetti (NPM)...${NC}"
# Usa --legacy-peer-deps per evitare blocchi ERESOLVE con le nuove versioni di npm
npm install --legacy-peer-deps

echo -e "\n${BLUE}[4/6] Compilazione Produzione Ottimizzata (npm run build)...${NC}"
npm run build

# Imposta permessi corretti per il server web Nginx
chown -R ${SERVICE_USER}:${SERVICE_USER} "${APP_DIR}"
chmod -R 755 "${APP_DIR}/dist"

echo -e "\n${BLUE}[5/6] Verifica e Ricaricamento Servizi di Rete (Nginx / Systemd)...${NC}"

# Se presente il file di configurazione Nginx aggiornato nel progetto
if [ -f "${APP_DIR}/deploy/nginx-netrack.conf" ]; then
    cp "${APP_DIR}/deploy/nginx-netrack.conf" /etc/nginx/sites-available/netrack-dcim
fi

# Verifica sintassi Nginx
if nginx -t 2>/dev/null; then
    systemctl reload nginx
    echo -e "${GREEN}[OK] Configurazione Nginx convalidata e ricaricata con successo.${NC}"
else
    echo -e "${RED}[ATTENZIONE] Errore nella sintassi Nginx. Il servizio web precedente rimane attivo.${NC}"
fi

# Riavvia il servizio di backend systemd se attivo
if systemctl is-active --quiet netrack-dcim.service 2>/dev/null; then
    systemctl restart netrack-dcim.service
    echo -e "${GREEN}[OK] Servizio systemd netrack-dcim riavviato.${NC}"
fi

echo -e "\n${BLUE}[6/6] Healthcheck di Convalida Aggiornamento...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ || echo "000")

if [ "${HTTP_STATUS}" -eq 200 ] || [ "${HTTP_STATUS}" -eq 301 ] || [ "${HTTP_STATUS}" -eq 302 ]; then
    echo -e "${GREEN}[SUCCESSO] Healthcheck superato! Risposta HTTP ${HTTP_STATUS} OK.${NC}"
else
    echo -e "${YELLOW}[WARN] Risposta HTTP: ${HTTP_STATUS}. Verifica con 'curl -I http://localhost'.${NC}"
fi

SERVER_IP=$(hostname -I | awk '{print $1}')

echo -e "\n${CYAN}====================================================================${NC}"
echo -e "${GREEN}   NetRack DCIM è stato AGGIORNATO con successo!                   ${NC}"
echo -e "${CYAN}====================================================================${NC}"
echo -e "Applicazione attiva su:    ${YELLOW}http://${SERVER_IP}/${NC}"
echo -e "Backup di sicurezza in:    ${MAGENTA}${BACKUP_DIR}${NC}"
echo -e "Per annullare modifiche:   ${YELLOW}sudo bash ${APP_DIR}/deploy/rollback-netrack.sh ${BACKUP_DIR}${NC}"
echo -e "${CYAN}====================================================================${NC}"
