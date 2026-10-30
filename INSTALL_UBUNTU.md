# Guida Completa all'Installazione di NetRack DCIM su Ubuntu Server (Include Ubuntu Server 26)

Questa guida descrive i requisiti di sistema e le procedure passo-passo per installare, configurare ed eseguire in produzione **NetRack DCIM** su server con sistema operativo:
- **Ubuntu Server 26 (26.04 LTS)** *(Consigliato per nuove installazioni)*
- **Ubuntu Server 24.04 LTS**
- **Ubuntu Server 22.04 LTS**

---

## 1. Prerequisiti del Server

### Requisiti Hardware Minimi e Raccomandati

| Risorsa | Minimo (Ambiente Test / Piccolo DC) | Raccomandato (Produzione Enterprise) |
| :--- | :--- | :--- |
| **Sistema Operativo** | Ubuntu Server 26.04 LTS / 24.04 LTS / 22.04 LTS (x86_64 o ARM64) | **Ubuntu Server 26.04 LTS** (x86_64 o ARM64) |
| **Kernel Linux** | 6.8+ (Ubuntu 24) o 6.14+ (Ubuntu 26) | Kernel Linux LTS con cgroups v2 attivo |
| **CPU (vCPU)** | 2 Core | 4 Core o superiore |
| **RAM** | 2 GB | 4 GB - 8 GB |
| **Disco (Storage)** | 20 GB SSD | 50 GB NVMe SSD |
| **Rete** | 1 Interfaccia di rete 1 Gbps con IP statico | 2x Interfacce in bonding LACP (Accesso + OOB Mgmt) |

### Requisiti di Rete & Porte Firewall (UFW)
Il server deve poter accettare connessioni sulle seguenti porte:
- **Porta 22/TCP**: Accesso amministrativo SSH protetto al server Ubuntu
- **Porta 80/TCP**: Traffico HTTP (reindirizzamento automatico a HTTPS e convalida Certbot Let's Encrypt)
- **Porta 443/TCP**: Traffico HTTPS sicuro cifrato TLS 1.3 (Webapp DCIM)
- *(Opzionale)* **Porta 3000/TCP**: Nel caso si utilizzi il daemon integrato Node/Vite preview
- *(Opzionale)* **Porta 1812/UDP**: Nel caso si utilizzi un server RADIUS esterno
- *(Opzionale)* **Porta 389/TCP o 636/TCP**: Nel caso di integrazione con LDAP / Active Directory

---

## 2. Metodo Rapido: Script Automatizzato per Ubuntu Server 26

Se hai un'istanza appena installata di **Ubuntu Server 26**, puoi eseguire l'installatore automatico incluso nel repository:

```bash
# Esegui lo script come root o con sudo
cd /percorso/del/progetto
sudo bash deploy/install-ubuntu26.sh
```

Lo script si occuperà automaticamente di:
1. Aggiornare i repository `apt` di Ubuntu 26.
2. Configurare la chiave GPG moderna in `/etc/apt/keyrings/nodesource.gpg` e installare Node.js v22 LTS.
3. Installare Nginx, UFW, Git e strumenti di compilazione.
4. Posizionare i file in `/var/www/netrack-dcim` ed eseguire `npm install` e `npm run build`.
5. Configurare Nginx come reverse proxy ottimizzato con Gzip e security headers.
6. Creare e abilitare il servizio di sistema Systemd `netrack-dcim.service` con sandbox hardening.
7. Abilitare il firewall UFW aprendo SSH e Nginx.

---

## 3. Metodo Passo-Passo Dettagliato: Installazione su Ubuntu Server 26 (26.04 LTS)

Segui questi passaggi per effettuare un'installazione manuale controllata su **Ubuntu Server 26**.

### Passo 1: Aggiornamento del Sistema Operativo Ubuntu 26
Connettiti via SSH alla console del tuo server Ubuntu 26:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git gnupg ca-certificates build-essential ufw software-properties-common nginx
```

---

### Passo 2: Installazione di Node.js 22 LTS (o 24 LTS) su Ubuntu 26
Ubuntu 26 utilizza lo standard di sicurezza rigoroso per i keyring APT (`/etc/apt/keyrings/`):

```bash
# Crea la cartella keyring protetta
sudo mkdir -p /etc/apt/keyrings

# Scarica la chiave GPG ufficiale di NodeSource
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes

# Aggiungi il repository Node.js 22.x LTS
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list

# Aggiorna l'indice dei pacchetti e installa Node.js
sudo apt update
sudo apt install -y nodejs

# Verifica che Node.js e NPM siano correttamente installati:
node -v   # v22.x.x o superiore
npm -v    # 10.x.x o superiore
```

---

### Passo 3: Distribuzione dell'Applicazione NetRack DCIM
Crea la directory applicativa in `/var/www/`:
```bash
sudo mkdir -p /var/www/netrack-dcim
sudo chown -R $USER:$USER /var/www/netrack-dcim
cd /var/www/netrack-dcim

# Copia i file del progetto oppure clona il tuo repository Git:
# git clone <URL_TUO_REPOSITORY> .
```

Installa i moduli Node e compila la versione ad altissime prestazioni per la produzione:
```bash
# Installa le dipendenze di progetto evitando conflitti peer di npm 10+
npm install --legacy-peer-deps

# Compila l'applicazione web (genera la cartella /dist)
npm run build
```

---

### Passo 4: Configurazione del Web Server Nginx su Ubuntu 26
Crea il file di configurazione del virtual host:
```bash
sudo nano /etc/nginx/sites-available/netrack-dcim
```

Incolla la seguente configurazione enterprise:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name dcim.tuodominio.it; # Inserisci il tuo FQDN o l'IP del server (es. 192.168.1.100)

    root /var/www/netrack-dcim/dist;
    index index.html;

    # Compressione Gzip nativa Nginx
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml image/svg+xml;

    # Gestione delle route SPA di React / Vite
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Caching aggressivo per file statici immutable
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security Headers conformi a standard CIS Benchmark Ubuntu 26
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    access_log /var/log/nginx/netrack_dcim_access.log;
    error_log /var/log/nginx/netrack_dcim_error.log warn;
}
```

Abilita il sito e riavvia Nginx:
```bash
sudo ln -sf /etc/nginx/sites-available/netrack-dcim /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

### Passo 5: Configurazione del Servizio Systemd Hardened (Ubuntu 26)
Ubuntu 26 supporta il sandboxing avanzato dei servizi tramite systemd v258+:
```bash
sudo nano /etc/systemd/system/netrack-dcim.service
```

Inserisci:
```ini
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

# Hardening di sicurezza nativo Ubuntu 26
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
NoNewPrivileges=true
ReadWritePaths=/var/www/netrack-dcim

[Install]
WantedBy=multi-user.target
```

Ricarica il demone systemd e avvia il servizio:
```bash
sudo systemctl daemon-reload
sudo systemctl enable netrack-dcim
sudo systemctl start netrack-dcim
sudo systemctl status netrack-dcim
```

---

### Passo 6: Configurazione Firewall UFW su Ubuntu 26
Configura il firewall per proteggere l'accesso al server:
```bash
# Consenti la connessione SSH con rate-limiting anti brute-force
sudo ufw limit OpenSSH

# Consenti traffico HTTP e HTTPS
sudo ufw allow 'Nginx Full'

# (Opzionale) Consenti la porta interna di preview se desiderato
# sudo ufw allow 3000/tcp

# Abilita il firewall
sudo ufw enable
sudo ufw status verbose
```

---

### Passo 7: Certificato SSL Gratuito HTTPS con Certbot Let's Encrypt
Su Ubuntu 26, Certbot include il timer systemd nativo per il rinnovo automatico senza crontab:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d dcim.tuodominio.it
```
Testa il corretto funzionamento del rinnovo automatico:
```bash
sudo certbot renew --dry-run
```

---

## 4. Installazione tramite Docker & Docker Compose su Ubuntu 26

Se l'infrastruttura del tuo Datacenter utilizza container Docker su Ubuntu 26:

### Passo 1: Installazione del Docker Engine ufficiale su Ubuntu 26
```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Aggiungi il tuo utente al gruppo docker
sudo usermod -aG docker $USER
```

### Passo 2: Avvio del Container
```bash
cd /var/www/netrack-dcim
docker compose -f deploy/docker-compose.yml up -d --build
```

---

## 5. Script di Aggiornamento Rapido (Ubuntu 26)
Crea uno script `/usr/local/bin/update-netrack.sh`:
```bash
#!/usr/bin/env bash
set -e
echo "Aggiornamento NetRack DCIM su Ubuntu 26 in corso..."
cd /var/www/netrack-dcim
# git pull
npm install --omit=dev
npm run build
sudo systemctl reload nginx
sudo systemctl restart netrack-dcim
echo "Aggiornamento completato con successo!"
```
Rendilo eseguibile:
```bash
sudo chmod +x /usr/local/bin/update-netrack.sh
```

---

## 6. Manutenzione, Backup e Procedure di Disaster Recovery

1. **Backup JSON e CSV da interfaccia web**:
   - Apri il menu in alto **"Backup / Restore"**.
   - Clicca **"Scarica Backup JSON Completo"** per avere l'intero snapshot dell'infrastruttura.
   - Clicca sui pulsanti CSV per salvare singoli elenchi (Dispositivi, Rack, Cablaggi, Moduli, Siti).

2. **Backup Automatico Giornaliero tramite Systemd Timer o Cron su Ubuntu 26**:
   Aggiungi in `/etc/cron.daily/backup-netrack`:
   ```bash
   #!/bin/bash
   BACKUP_DIR="/var/backups/netrack"
   mkdir -p "$BACKUP_DIR"
   tar -czf "$BACKUP_DIR/netrack_$(date +%Y%m%d).tar.gz" -C /var/www/netrack-dcim/dist .
   find "$BACKUP_DIR" -type f -mtime +30 -delete
   ```
   ```bash
   sudo chmod +x /etc/cron.daily/backup-netrack
   ```

---

## 7. Tabella di Confronto delle Versioni Ubuntu Server

| Caratteristica | Ubuntu Server 26.04 LTS | Ubuntu Server 24.04 LTS | Ubuntu Server 22.04 LTS |
| :--- | :--- | :--- | :--- |
| **Supporto Ufficiale Canonical** | Fino al 2036 | Fino al 2034 | Fino al 2032 |
| **Kernel Linux Standard** | 6.14+ LTS | 6.8 LTS | 5.15 LTS |
| **Versione Node.js Raccomandata** | v22.x LTS o v24.x LTS | v20.x LTS o v22.x LTS | v20.x LTS |
| **Systemd Security Hardening** | Livello Avanzato (v258+) | Livello Standard (v255) | Livello Base (v249) |
| **Formato APT Keyrings** | `/etc/apt/keyrings/*.gpg` | `/etc/apt/keyrings/*.gpg` | Transizione da `/etc/apt/trusted.gpg.d/` |
| **Compatibilità HTTP/2 & HTTP/3** | Nativa Nginx 1.26+ | Nativa Nginx 1.24+ | Richiede Nginx Mainline per HTTP/3 |
| **Stato per NetRack DCIM** | **Consigliata / Ottimizzata** | Pienamente Supportata | Pienamente Supportata |
| **Supporto Flag NPM** | Consigliato `--legacy-peer-deps` | Opzionale | Standard |

---

## 8. Risoluzione Errori e Avvisi Comuni (Troubleshooting)

### A. Errore `npm error code ERESOLVE could not resolve peerOptional esbuild`
Se durante l'esecuzione di `npm install` o dello script automatico riscontri:
```
npm error code ERESOLVE
npm error ERESOLVE could not resolve
npm error While resolving: vite@...
npm error Could not resolve dependency: peerOptional esbuild
```
**Causa:** Le nuove versioni di NPM (v10.x / v12.x fornite con Node 22 LTS) applicano controlli molto severi sulle dipendenze peer facoltative dei compilatori Vite ed esbuild.
**Soluzione immediata:**
Lancia l'installazione con il flag di compatibilità:
```bash
cd /var/www/netrack-dcim
npm install --legacy-peer-deps
npm run build
```
Questo risolve le dipendenze in modo pulito e permette a Vite di generare la build di produzione `/dist` senza blocchi.

---

### B. Avviso `Pending kernel upgrade!` / `needrestart` su Ubuntu Server 26
Se durante l'installazione dei pacchetti noti log come:
```
Pending kernel upgrade!
Running kernel version: 7.0.0-27-generic
Diagnostics: The currently running kernel version is not the expected kernel version 7.0.0-38-generic.
Restarting the system to load the new kernel will not be handled automatically...
```
**Causa:** Il gestore di aggiornamenti di Ubuntu (`needrestart` e `unattended-upgrades`) segnala che `apt upgrade` ha scaricato una versione aggiornata del Kernel Linux rispetto a quella attualmente caricata in memoria RAM.
**Azione:** Questo è un semplice avviso informativo di sicurezza. L'installazione di NetRack DCIM prosegue normalmente. Quando avrai completato la configurazione o in una finestra di manutenzione programmata, riavvia il server per caricare il nuovo kernel con:
```bash
sudo reboot
```

---

### C. Connettività SSH con gli Apparati di Rete: Perché è Simulata e Come Abilitare SSH Reale

**Perché la connessione SSH pura nel browser è simulata?**
1. **Sandbox di Sicurezza del Browser (W3C Standard):**
   I browser web moderni (Chrome, Firefox, Safari, Edge) operano all'interno di una sandbox di sicurezza rigorosa. Il codice JavaScript in esecuzione nel browser **non ha accesso ad API per aprire socket TCP grezzi (porta 22/TCP)** verso indirizzi IP arbitrari. Il browser può instaurare unicamente connessioni a livello applicativo (`http://`, `https://`, `ws://`, `wss://`, `webrtc`). Questa restrizione è fondamentale per proteggere la rete locale aziendale da port-scanning e attacchi CSRF/SSRF.
2. **Cosa fa la console CLI di NetRack DCIM:**
   La console integrata nel browser è un emulatore diagnostico interattivo. Interpreta i comandi tipici (Cisco IOS, NX-OS, Arista EOS: `show ip int brief`, `show lldp neighbors`, `show inv`, `show env`) interrogando direttamente i dati reali censiti nel DCIM per quell'apparato.

**Come abilitare sessioni SSH reali con gli apparati fisici:**

* **Opzione 1: Client SSH Nativo Locale (Zero configurazione server)**
  All'interno della modale apparato è presente il pulsante **"Lancia Client SSH Nativo"** (`ssh://admin@<ip_apparato>`). Cliccandolo, il browser delega al sistema operativo l'apertura del terminale configurato sul computer del sistemista (OpenSSH, PuTTY, SecureCRT, Kitty, iTerm2, Windows Terminal). In alternativa, è possibile copiare il comando precompilato negli appunti.

* **Opzione 2: WebSSH Gateway su Ubuntu Server 26 (Sessione reale dentro al Browser)**
  Se desideri che il browser apra una vera sessione interattiva su porta 22/TCP senza installare client sul PC locale, è necessario un **Gateway Proxy WebSocket-to-TCP** sul server Ubuntu.
  
  Architettura:
  `Browser Web (xterm.js via WSS) <---> Ubuntu Server 26 (WebSSH Gateway) <---> Switch Datacenter (TCP:22)`

  Procedura di installazione del Gateway WebSSH su Ubuntu Server 26:
  ```bash
  # 1. Installa Docker (se non presente)
  sudo apt install -y docker.io
  sudo systemctl enable --now docker

  # 2. Avvia il container WebSSH
  sudo docker run -d --name netrack-webssh \
    --restart always \
    -p 127.0.0.1:8888:8888 \
    huashengdun/webssh

  # 3. Configura il reverse proxy Nginx aggiungendo questo blocco in /etc/nginx/sites-available/netrack-dcim
  location /webssh/ {
      proxy_pass http://127.0.0.1:8888/;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_read_timeout 3600s;
  }

  # 4. Ricarica Nginx
  sudo nginx -t && sudo systemctl reload nginx
  ```

---

## 9. Gestione Aggiornamenti via GitHub con Backup Automatico Obbligatorio

Per eliminare definitivamente la necessità di esportare archivi ZIP, trasferirli via SFTP/SCP ed estrarli a mano, **NetRack DCIM** è progettato per sincronizzarsi **direttamente con GitHub**.

### Principi di Sicurezza del Workflow:
1. **Controllo Manuale Assoluto:** Gli aggiornamenti vengono eseguiti **esclusivamente quando l'amministratore decide di lanciarli** (nessun cron o webhook non monitorato che possa interrompere i servizi in momenti inopportuni).
2. **Backup Preventivo Automatico al 100%:** **Ogni singolo aggiornamento lanciato crea automaticamente un backup completo e datato** in `/var/backups/netrack-dcim/backup_YYYYMMDD_HHMMSS/` prima di toccare qualsiasi riga di codice o eseguire git pull.
3. **Rollback Istantaneo:** Se il nuovo codice contiene problemi, un singolo comando (`sudo bash deploy/rollback-netrack.sh`) ripristina la versione precedente in meno di 2 secondi.
4. **Protezione Modifiche Locali:** Se hai effettuato modifiche temporanee sul server, lo script le protegge automaticamente con `git stash`.

---

### Passo 1: Collegamento Una Tantum del Server a GitHub

Per consentire al server di scaricare gli aggiornamenti da GitHub senza dover inserire password ogni volta, esegui il configuratore guidato incluso:

```bash
cd /var/www/netrack-dcim
sudo bash deploy/setup-github-sync.sh
```

Lo script ti permette di scegliere tra:
* **Opzione 1 (Consigliata per la Produzione - SSH Deploy Key):**
  Genera una chiave crittografica `ed25519` dedicata sul server (`/root/.ssh/id_ed25519_github_netrack.pub`).
  Basta copiare la chiave mostrata a video e aggiungerla su GitHub in:
  *GitHub Repository -> Settings -> Deploy keys -> Add deploy key (permesso Read-only)*.
* **Opzione 2 (HTTPS con Personal Access Token):**
  Inserisci il tuo Personal Access Token di GitHub con permessi di lettura repo.
* **Opzione 3 (HTTPS Pubblico):**
  Se il repository è pubblico, non è necessaria alcuna autenticazione.

---

### Passo 2: Lancio Manuale dell'Aggiornamento da GitHub

Quando desideri aggiornare l'applicazione con gli ultimi commit pubblicati su GitHub, esegui semplicemente:

```bash
cd /var/www/netrack-dcim
sudo bash deploy/update-from-github.sh
```

#### Cosa accade in automatico durante l'esecuzione:
1. **Controllo Remoto:** Esegue `git fetch` e mostra l'elenco dei nuovi commit disponibili (autore, data, messaggio).
2. **Backup Preventivo Obbligatorio:** Crea la cartella di backup timestamped salvando:
   - Hash del commit precedente (`git rev-parse HEAD`)
   - Directory di produzione compilata (`dist/`)
   - File di dipendenze (`package.json`, `package-lock.json`)
   - Variabili di configurazione (`.env`) e dati locali
   - Rotazione automatica: conserva gli ultimi 10 backup ed elimina quelli più vecchi.
3. **Scaricamento Codice:** Esegue `git pull origin <branch>` salvando eventuali file modificati localmente in `git stash`.
4. **Installazione Sicura:** Esegue `npm install --legacy-peer-deps` per garantire compatibilità con Ubuntu 26 / npm 10-12 senza conflitti `ERESOLVE`.
5. **Compilazione Produzione:** Esegue `npm run build`. Se la compilazione dovesse fallire, lo script attiva **il rollback automatico immediato** per non interrompere il servizio Nginx!
6. **Ricaricamento Servizi:** Valida Nginx (`nginx -t`) e ricarica la configurazione (`systemctl reload nginx`).
#### Risoluzione Automatica di "dubious ownership" e refspec Git
Se hai configurato il repository con un utente diverso da `root` (es. `cse`), Git potrebbe segnalare l'avviso di sicurezza `detected dubious ownership in repository`.
Gli script `deploy/update-from-github.sh` e `deploy/setup-github-sync.sh` configurano automaticamente la direttiva `safe.directory` sia a livello di sistema sia a livello globale (`git config --system --add safe.directory /var/www/netrack-dcim`), permettendo l'esecuzione sia con `sudo` che come utente normale senza blocchi o errori di refspec.

---

### Tabella degli Script di Manutenzione Disponibili in `deploy/`

| Script Eseguibile | Scopo Principale | Modalità | Backup Automatico |
| :--- | :--- | :--- | :--- |
| `deploy/update-from-github.sh` | **Aggiornamento Manuale da GitHub** (Consigliato) | Manuale | **Sì, sempre automatico** |
| `deploy/setup-github-sync.sh` | Configurazione SSH Deploy Key / Credenziali GitHub | Una tantum | - |
| `deploy/rollback-netrack.sh` | Rollback istantaneo all'ultimo backup funzionante | Manuale | - |
| `deploy/apply-modifications.sh` | Fast Build: compila al volo modifiche manuali locali | Manuale | - |
| `deploy/update-netrack.sh` | Aggiornamento flessibile (da GitHub, cartella o archivio) | Manuale | **Sì, sempre automatico** |

---

### Scenario Alternativo: Aggiornamento da Cartella Locale o Archivio (No Git)

```bash
# Aggiornamento passando la cartella dei nuovi sorgenti come argomento:
sudo bash /var/www/netrack-dcim/deploy/update-netrack.sh /home/cse/nuova-versione-dcim

# Oppure aggiornamento passando direttamente l'archivio compresso:
sudo bash /var/www/netrack-dcim/deploy/update-netrack.sh /home/cse/netrack-update.tar.gz
```
Lo script estrarrà o sincronizzerà i file escludendo `node_modules` e `.git`, applicherà il backup preventivo, compilerà la release e ricaricherà i servizi.

---

### Scenario C: Applicazione Rapida di Modifiche Locali al Codice (Fast Hot-Build)
Se ti sei collegato via SSH o VS Code Remote e hai modificato direttamente un file `.tsx`, un layout, i brand o i file in `src/`:

```bash
cd /var/www/netrack-dcim
sudo bash deploy/apply-modifications.sh
```
*Questo script impiega solo 5 secondi: salta la reinstallazione dei pacchetti npm, esegue direttamente la compilazione Vite e ricarica Nginx.*

---

### Scenario D: Rollback / Ripristino Istantaneo all'Ultima Versione Funzionante
Se un aggiornamento introduce un problema imprevisto o desideri tornare immediatamente indietro:

```bash
# Ripristina automaticamente l'ultimo backup precedente
sudo bash /var/www/netrack-dcim/deploy/rollback-netrack.sh

# Oppure specifica una cartella di backup specifica:
sudo bash /var/www/netrack-dcim/deploy/rollback-netrack.sh /var/backups/netrack-dcim/backup_20261026_113000
```
In 2 secondi la versione precedente viene ripristinata e Nginx viene ricaricato.

---

### Scenario E: Aggiornamento Notturno Schedulato (Crontab Automatico)
Per aggiornare l'applicazione in modo del tutto autonomo ogni notte alle 03:00:

```bash
# Apri il crontab di root:
sudo crontab -e

# Aggiungi questa riga in fondo:
0 3 * * * /var/www/netrack-dcim/deploy/update-netrack.sh >> /var/log/netrack_update.log 2>&1
```
Il file di log `/var/log/netrack_update.log` conterrà il resoconto di ogni aggiornamento eseguito con successo.



