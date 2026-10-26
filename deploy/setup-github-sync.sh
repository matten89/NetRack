#!/usr/bin/env bash
# ==============================================================================
# NetRack DCIM - Configurazione Connessione GitHub (SSH Deploy Key o HTTPS)
# ==============================================================================
# Esegui questo script per autorizzare il server Ubuntu a scaricare gli
# aggiornamenti da GitHub in 1 solo clic senza inserire credenziali ogni volta.
# ==============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[ERRORE] Questo script deve essere eseguito come root o con sudo.${NC}"
   exit 1
fi

APP_DIR="/var/www/netrack-dcim"
if [ ! -d "${APP_DIR}" ]; then
    APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}${BOLD}       Configurazione Connessione GitHub per NetRack DCIM           ${NC}"
echo -e "${CYAN}====================================================================${NC}"

cd "${APP_DIR}"

if [ ! -d "${APP_DIR}/.git" ]; then
    echo -e " -> Inizializzazione repository locale in ${APP_DIR}..."
    git init
fi

echo -e "\n${BLUE}Come preferisci collegare questo server a GitHub?${NC}"
echo "1) Chiave SSH Deploy Key (Consigliato per server di produzione - Zero password)"
echo "2) HTTPS con Personal Access Token (PAT)"
echo "3) HTTPS Pubblico (Solo se il repository GitHub è pubblico)"
read -r -p "Seleziona opzione [1-3]: " AUTH_OPT

case $AUTH_OPT in
    1)
        SSH_KEY_PATH="/root/.ssh/id_ed25519_github_netrack"
        mkdir -p /root/.ssh && chmod 700 /root/.ssh
        if [ ! -f "${SSH_KEY_PATH}" ]; then
            echo -e " -> Generazione chiave SSH crittografica ed25519..."
            ssh-keygen -t ed25519 -f "${SSH_KEY_PATH}" -N "" -C "netrack-dcim-server@$(hostname)"
        fi
        
        # Configura SSH client config per github.com
        cat << 'EOF' > /root/.ssh/config
Host github.com
    IdentityFile /root/.ssh/id_ed25519_github_netrack
    StrictHostKeyChecking accept-new
EOF
        chmod 600 /root/.ssh/config /root/.ssh/id_ed25519_github_netrack*

        PUBLIC_KEY=$(cat "${SSH_KEY_PATH}.pub")
        echo -e "\n${GREEN}====================== LA TUA CHIAVE PUBBLICA GITHUB ======================${NC}"
        echo -e "${YELLOW}${PUBLIC_KEY}${NC}"
        echo -e "${GREEN}============================================================================${NC}"
        echo -e "\n${BOLD}Passaggi rapidi per autorizzare GitHub:${NC}"
        echo "1. Apri il tuo repository su GitHub nel browser"
        echo "2. Vai in: Settings -> Deploy keys -> Add deploy key"
        echo "3. Titolo: 'Ubuntu Server NetRack' e incolla la chiave sopra (Read-only)"
        echo "4. Clicca 'Add key'"
        echo ""
        read -r -p "Inserisci l'indirizzo SSH del repository (es. git@github.com:utente/repo.git): " REPO_SSH
        if [ -n "${REPO_SSH}" ]; then
            git remote remove origin 2>/dev/null || true
            git remote add origin "${REPO_SSH}"
            git branch -M main || true
            echo -e "\n${GREEN}[OK] Connessione SSH configurata con successo!${NC}"
            echo -e "Test connessione GitHub..."
            ssh -T git@github.com 2>&1 || true
        fi
        ;;
    2)
        echo -e "\nCrea un Personal Access Token (classic o fine-grained con permesso 'Contents: Read') su:"
        echo "https://github.com/settings/tokens"
        read -r -p "Inserisci il tuo username GitHub: " GH_USER
        read -r -s -p "Inserisci il tuo Personal Access Token (PAT): " GH_TOKEN
        echo ""
        read -r -p "Inserisci il percorso del repository (es. utente/repo): " REPO_NAME
        REPO_NAME=$(echo "${REPO_NAME}" | sed 's#^https://github.com/##' | sed 's#\.git$##')
        
        git remote remove origin 2>/dev/null || true
        git remote add origin "https://${GH_USER}:${GH_TOKEN}@github.com/${REPO_NAME}.git"
        git branch -M main || true
        echo -e "${GREEN}[OK] Remote HTTPS autenticato configurato con successo!${NC}"
        ;;
    3)
        read -r -p "Inserisci l'URL pubblico HTTPS (es. https://github.com/utente/repo.git): " REPO_PUB
        git remote remove origin 2>/dev/null || true
        git remote add origin "${REPO_PUB}"
        git branch -M main || true
        echo -e "${GREEN}[OK] Remote HTTPS pubblico configurato con successo!${NC}"
        ;;
    *)
        echo -e "${RED}Opzione non valida.${NC}"
        exit 1
        ;;
esac

echo -e "\n${CYAN}====================================================================${NC}"
echo -e "${GREEN}Configurazione completata!${NC}"
echo -e "Per lanciare il primo aggiornamento manuale con backup automatico:"
echo -e "${BOLD}sudo bash deploy/update-from-github.sh${NC}"
echo -e "${CYAN}====================================================================${NC}\n"
