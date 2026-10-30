#!/usr/bin/env bash
# ==============================================================================
# NetRack DCIM - Script di Aggiornamento Manuale Diretto da GitHub
# con BACKUP AUTOMATICO OBBLIGATORIO ad ogni esecuzione
# ==============================================================================
# Piattaforme supportate: Ubuntu Server 26 (26.04 LTS), 24.04 LTS, 22.04 LTS
#
# Utilizzo:
#   sudo bash deploy/update-from-github.sh
#   oppure non-interattivo:
#   sudo bash deploy/update-from-github.sh -y
# ==============================================================================
set -euo pipefail

# Disabilita prompt interattivi apt e needrestart in background
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

# Colori per il terminale
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

AUTO_CONFIRM=false
if [[ "${1:-}" == "-y" ]] || [[ "${1:-}" == "--yes" ]]; then
    AUTO_CONFIRM=true
fi

echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}${BOLD}     NetRack DCIM - Aggiornamento Manuale da GitHub                 ${NC}"
echo -e "${CYAN}     (Con Creazione Backup Preventivo Automatico Obbligatorio)       ${NC}"
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
MAX_BACKUPS_RETAIN=10

# Rilevamento della cartella dell'applicazione
if [ ! -d "${APP_DIR}" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
    if [ -f "${SCRIPT_DIR}/package.json" ]; then
        APP_DIR="${SCRIPT_DIR}"
    else
        echo -e "${RED}[ERRORE] Impossibile trovare la directory di installazione (/var/www/netrack-dcim).${NC}"
        exit 1
    fi
fi

cd "${APP_DIR}"

# Risoluzione definitiva dell'errore "detected dubious ownership in repository"
# Aggiunge safe.directory a livello System, Global (root) e per l'utente originale (SUDO_USER)
git config --system --add safe.directory "${APP_DIR}" 2>/dev/null || true
git config --global --add safe.directory "${APP_DIR}" 2>/dev/null || true
git config --global --add safe.directory '*' 2>/dev/null || true
if [ -n "${SUDO_USER:-}" ]; then
    sudo -u "${SUDO_USER}" git config --global --add safe.directory "${APP_DIR}" 2>/dev/null || true
    sudo -u "${SUDO_USER}" git config --global --add safe.directory '*' 2>/dev/null || true
fi

# 2. Controllo configurazione Git
echo -e "\n${BLUE}[1/7] Verifica configurazione repository Git...${NC}"

if [ ! -d "${APP_DIR}/.git" ]; then
    echo -e "${YELLOW}[ATTENZIONE] La cartella ${APP_DIR} non è attualmente un repository Git inizializzato.${NC}"
    echo -e "Inizializzazione repository locale..."
    git init
fi

# Verifica o richiesta remote 'origin'
REMOTE_URL=$(git remote get-url origin 2>/dev/null || true)
if [ -z "${REMOTE_URL}" ]; then
    echo -e "${YELLOW}[ATTENZIONE] Nessun remote GitHub configurato.${NC}"
    read -r -p "Inserisci l'URL GitHub (es. https://github.com/matten89/NetRack.git): " USER_REPO
    if [ -n "${USER_REPO}" ]; then
        # Assicura estensione .git se mancante per HTTPS
        if [[ "${USER_REPO}" =~ ^https:// ]] && [[ ! "${USER_REPO}" =~ \.git$ ]]; then
            USER_REPO="${USER_REPO}.git"
        fi
        git remote add origin "${USER_REPO}"
        REMOTE_URL="${USER_REPO}"
        echo -e "${GREEN}[OK] Remote GitHub configurato: ${REMOTE_URL}${NC}"
    else
        echo -e "${RED}[ERRORE] Nessun URL inserito. Impossibile procedere.${NC}"
        exit 1
    fi
fi

echo -e " -> Remote GitHub: ${MAGENTA}${REMOTE_URL}${NC}"

# 3. Fetch globale da GitHub (senza refspec per evitare errori 'invalid refspec')
echo -e "\n${BLUE}[2/7] Download metadati e commit disponibili da GitHub (git fetch)...${NC}"
if ! git fetch origin --prune; then
    echo -e "${RED}[ERRORE] Impossibile contattare GitHub con il remote specificato.${NC}"
    echo -e "Dettagli errore e possibili cause:"
    echo -e "  1. Se il repository è privato (es. su account personale), HTTPS richiede token o SSH Deploy Key."
    echo -e "  2. Per configurare facilmente la chiave SSH o il Token esegui:"
    echo -e "     ${BOLD}sudo bash deploy/setup-github-sync.sh${NC}"
    echo -e "  3. Verifica la connessione internet dal server Ubuntu (ping -c 2 github.com)."
    exit 1
fi

# Rilevamento branch remoto predefinito (main o master)
REMOTE_BRANCH=""
if git rev-parse --verify origin/main >/dev/null 2>&1; then
    REMOTE_BRANCH="main"
elif git rev-parse --verify origin/master >/dev/null 2>&1; then
    REMOTE_BRANCH="master"
fi

# Rilevamento robusto e pulito del branch locale (estrazione rigorosa della sola prima riga)
RAW_BRANCH=$(git branch --show-current 2>/dev/null || git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
CURRENT_BRANCH=$(echo "${RAW_BRANCH}" | head -n 1 | tr -d '[:space:]')

# Se il branch rilevato è "HEAD" (detached o non ancora committato) o vuoto, usa il branch remoto o 'main'
if [ -z "${CURRENT_BRANCH}" ] || [ "${CURRENT_BRANCH}" = "HEAD" ]; then
    CURRENT_BRANCH="${REMOTE_BRANCH:-main}"
fi

echo -e " -> Branch attivo: ${MAGENTA}${CURRENT_BRANCH}${NC}"

LOCAL_HASH=$(git rev-parse HEAD 2>/dev/null || echo "nessuno")
REMOTE_HASH=$(git rev-parse "origin/${CURRENT_BRANCH}" 2>/dev/null || echo "nessuno")

echo -e " -> Commit locale attuale:    ${YELLOW}${LOCAL_HASH:0:8}${NC}"
echo -e " -> Ultimo commit su GitHub:  ${GREEN}${REMOTE_HASH:0:8}${NC}"

if [ "${LOCAL_HASH}" != "nessuno" ] && [ "${LOCAL_HASH}" = "${REMOTE_HASH}" ]; then
    echo -e "${GREEN}[INFO] Il codice locale è già perfettamente sincronizzato con l'ultimo commit di GitHub!${NC}"
    if [ "${AUTO_CONFIRM}" = false ]; then
        read -r -p "Vuoi comunque ricompilare l'applicazione e rigenerare la build? (s/N): " FORCE_REBUILD || FORCE_REBUILD="n"
        if [[ ! "${FORCE_REBUILD}" =~ ^[sSyY]$ ]]; then
            echo -e "${CYAN}Operazione terminata: nessun aggiornamento necessario.${NC}"
            exit 0
        fi
    fi
else
    if [ "${LOCAL_HASH}" != "nessuno" ]; then
        echo -e "\n${CYAN}Dettaglio nuovi commit in arrivo da GitHub:${NC}"
        git log --oneline --graph --decorate "${LOCAL_HASH}..origin/${CURRENT_BRANCH}" -n 5 2>/dev/null || true
    else
        echo -e "${CYAN}Inizializzazione primo allineamento dal repository GitHub...${NC}"
    fi
    echo ""
    if [ "${AUTO_CONFIRM}" = false ]; then
        read -r -p "Procedere con l'aggiornamento manuale e il backup automatico? [S/n]: " CONFIRM_UPDATE || CONFIRM_UPDATE="s"
        if [[ "${CONFIRM_UPDATE}" =~ ^[nN]$ ]]; then
            echo -e "${YELLOW}Aggiornamento annullato dall'amministratore.${NC}"
            exit 0
        fi
    fi
fi

# 4. Creazione OBBLIGATORIA del Backup Automatico Preventivo
echo -e "\n${BLUE}[3/7] Creazione OBBLIGATORIA del Backup di Sicurezza Preventivo...${NC}"
mkdir -p "${BACKUP_DIR}"

# Salvataggio hash commit attuale se presente
if [ "${LOCAL_HASH}" != "nessuno" ]; then
    echo "${LOCAL_HASH}" > "${BACKUP_DIR}/git_commit_hash.txt"
    echo -e " -> Salvato riferimento commit precedente: ${LOCAL_HASH:0:8}"
fi

# Salvataggio cartella di build produzione dist/
if [ -d "${APP_DIR}/dist" ]; then
    echo -e " -> Archiviazione build produzione precedente (dist/)..."
    cp -r "${APP_DIR}/dist" "${BACKUP_DIR}/dist"
fi

# Salvataggio file di configurazione
[ -f "${APP_DIR}/package.json" ] && cp "${APP_DIR}/package.json" "${BACKUP_DIR}/package.json"
[ -f "${APP_DIR}/package-lock.json" ] && cp "${APP_DIR}/package-lock.json" "${BACKUP_DIR}/package-lock.json"
[ -f "${APP_DIR}/.env" ] && cp "${APP_DIR}/.env" "${BACKUP_DIR}/.env"
[ -d "${APP_DIR}/data" ] && cp -r "${APP_DIR}/data" "${BACKUP_DIR}/data"

# Metadati del backup
cat <<EOF > "${BACKUP_DIR}/backup_info.json"
{
  "timestamp": "${TIMESTAMP}",
  "date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "branch": "${CURRENT_BRANCH}",
  "previous_commit": "${LOCAL_HASH}",
  "target_commit": "${REMOTE_HASH}",
  "trigger": "manual_github_update"
}
EOF

echo -e "${GREEN}[OK] Backup preventivo completato con successo in:${NC}"
echo -e "     ${MAGENTA}${BACKUP_DIR}${NC}"

# Rotazione dei backup: mantieni solo gli ultimi MAX_BACKUPS_RETAIN
BACKUP_COUNT=$(ls -1d ${BACKUP_BASE_DIR}/backup_* 2>/dev/null | wc -l || echo 0)
if [ "${BACKUP_COUNT}" -gt "${MAX_BACKUPS_RETAIN}" ]; then
    echo -e " -> Pulizia automatica vecchi backup (conservati gli ultimi ${MAX_BACKUPS_RETAIN})..."
    ls -1td ${BACKUP_BASE_DIR}/backup_* | tail -n +$((MAX_BACKUPS_RETAIN + 1)) | xargs rm -rf 2>/dev/null || true
fi

# 5. Allineamento e Pull del codice da GitHub
echo -e "\n${BLUE}[4/7] Scaricamento del codice aggiornato da GitHub (branch: ${CURRENT_BRANCH})...${NC}"

# Se il repository locale non ha ancora commit propri (es. creato da installazione manuale)
if ! git rev-parse HEAD >/dev/null 2>&1; then
    echo -e " -> Allineamento iniziale del branch locale '${CURRENT_BRANCH}' con 'origin/${CURRENT_BRANCH}'..."
    git checkout -B "${CURRENT_BRANCH}" "origin/${CURRENT_BRANCH}" --force || {
        git reset --hard "origin/${CURRENT_BRANCH}"
    }
else
    # Proteggi modifiche locali con stash prima del pull
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        echo -e "${YELLOW} -> Rilevate modifiche locali nei file di lavoro. Salvataggio in stash automatico...${NC}"
        git stash save "Auto-stash pre-update ${TIMESTAMP}" || true
    fi

    # Esegui il pull con gestione fallback su merge o reset
    if ! git pull origin "${CURRENT_BRANCH}" --no-edit; then
        echo -e "${YELLOW} -> Tentativo di merge unione cronologia...${NC}"
        git merge "origin/${CURRENT_BRANCH}" --allow-unrelated-histories -m "Merge update ${TIMESTAMP}" || {
            echo -e "${YELLOW} -> Allineamento diretto all'ultimo commit di GitHub...${NC}"
            git reset --hard "origin/${CURRENT_BRANCH}"
        }
    fi
fi

NEW_LOCAL_HASH=$(git rev-parse HEAD 2>/dev/null || echo "sconosciuto")
echo -e "${GREEN}[OK] Codice sincronizzato con successo al commit: ${NEW_LOCAL_HASH:0:8}${NC}"

# 6. Risoluzione dipendenze e Build di produzione
echo -e "\n${BLUE}[5/7] Installazione dipendenze Node.js (con flag anti-conflitto npm)...${NC}"
# Il flag --legacy-peer-deps evita blocchi ERESOLVE con le nuove versioni di npm
npm install --legacy-peer-deps

echo -e "\n${BLUE}[6/7] Compilazione Produzione Ottimizzata (npm run build)...${NC}"
if ! npm run build; then
    echo -e "${RED}====================================================================${NC}"
    echo -e "${RED}[ERRORE COMPILAZIONE] 'npm run build' ha generato un errore.${NC}"
    echo -e "${YELLOW}AVVIO PROCEDURA DI SICUREZZA ROLLBACK:${NC}"
    echo -e "Ripristino automatico dell'ultima build funzionante dal backup..."
    if [ -d "${BACKUP_DIR}/dist" ]; then
        rm -rf "${APP_DIR}/dist"
        cp -r "${BACKUP_DIR}/dist" "${APP_DIR}/dist"
        systemctl reload nginx 2>/dev/null || true
        echo -e "${GREEN}[ROLLBACK AUTOMATICO ESEGUITO] Il server web continua a servire la versione funzionante.${NC}"
    fi
    echo -e "Dettagli backup per analisi: ${BACKUP_DIR}"
    exit 1
fi

# Imposta permessi sicuri per Nginx
chown -R ${SERVICE_USER}:${SERVICE_USER} "${APP_DIR}"
chmod -R 755 "${APP_DIR}/dist"

# 7. Aggiornamento Servizi Nginx & Healthcheck
echo -e "\n${BLUE}[7/7] Ricaricamento servizi web e test di integrità (Healthcheck)...${NC}"

if [ -f "${APP_DIR}/deploy/nginx-netrack.conf" ]; then
    cp "${APP_DIR}/deploy/nginx-netrack.conf" /etc/nginx/sites-available/netrack-dcim
fi

if nginx -t 2>/dev/null; then
    systemctl reload nginx
    echo -e "${GREEN}[OK] Configurazione Nginx convalidata e ricaricata.${NC}"
else
    echo -e "${RED}[WARN] Sintassi Nginx non valida. Il web server precedente rimane attivo.${NC}"
fi

if systemctl is-active --quiet netrack-dcim.service 2>/dev/null; then
    systemctl restart netrack-dcim.service
    echo -e "${GREEN}[OK] Servizio systemd netrack-dcim riavviato.${NC}"
fi

# Esegui healthcheck HTTP locale
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ || echo "000")
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")

echo -e "\n${CYAN}====================================================================${NC}"
if [ "${HTTP_STATUS}" -eq 200 ] || [ "${HTTP_STATUS}" -eq 301 ] || [ "${HTTP_STATUS}" -eq 302 ]; then
    echo -e "${GREEN}${BOLD}   NetRack DCIM è stato AGGIORNATO DA GITHUB con successo!        ${NC}"
    echo -e "${CYAN}====================================================================${NC}"
    echo -e "Risposta Healthcheck:      ${GREEN}HTTP ${HTTP_STATUS} (OK)${NC}"
else
    echo -e "${YELLOW}${BOLD}   Aggiornamento completato con codice HTTP: ${HTTP_STATUS}          ${NC}"
    echo -e "${CYAN}====================================================================${NC}"
fi

echo -e "Versione precedente:       ${YELLOW}${LOCAL_HASH:0:8}${NC}"
echo -e "Nuova versione attiva:     ${GREEN}${NEW_LOCAL_HASH:0:8}${NC}"
echo -e "Applicazione attiva su:    ${BOLD}http://${SERVER_IP}/${NC}"
echo -e "Backup automatico creato:  ${MAGENTA}${BACKUP_DIR}${NC}"
echo -e "Comando di Rollback:       ${YELLOW}sudo bash ${APP_DIR}/deploy/rollback-netrack.sh ${BACKUP_DIR}${NC}"
echo -e "${CYAN}====================================================================${NC}\n"
