# Modbus Register Library — Web App

Libreria universale di registri Modbus. Gira come **Teams Tab** direttamente nel browser.  
280 dispositivi · 41.930 registri · MIT license.

---

## Setup iniziale (una sola volta)

### 1. Configura il nome del repository

Apri `vite.config.js` e imposta il nome del tuo repo:

```js
base: '/nome-del-tuo-repo/',
```

### 2. Attiva GitHub Pages

Su GitHub → Settings → Pages:
- Source: **GitHub Actions**

### 3. Pusha sul branch main

```bash
git add .
git commit -m "Initial setup"
git push origin main
```

GitHub Actions fa il build e deploya automaticamente. In ~2 minuti l'app è online su:
```
https://<org>.github.io/<nome-repo>/
```

### 4. Aggiungi la Tab in Teams

1. Apri il canale Teams dove vuoi la libreria
2. Clicca **+** accanto ai tab
3. Cerca **Website**
4. Incolla l'URL GitHub Pages
5. Nome: `Modbus Library` → Salva

Tutti i colleghi nel canale la vedono subito.

---

## Aggiungere un nuovo dispositivo

### Metodo 1 — Da app (import CSV)

1. Apri la web app
2. Clicca **📥 Importa**
3. Incolla la tabella dei registri (CSV, testo da PDF, Excel)
4. Salva

⚠️ I dispositivi importati da browser sono salvati solo localmente (sessione). Per aggiungerli permanentemente per tutti, usa il Metodo 2.

### Metodo 2 — Da repository (permanente per tutti)

1. Clona il repo
2. Aggiungi il file JSON in `public/data/registers/marca__modello.json`:

```json
[
  {"addr":1000,"type":"HR","name":"Voltage L1","desc":"","unit":"V","dataType":"float32","access":"R"},
  {"addr":1002,"type":"HR","name":"Current L1","desc":"","unit":"A","dataType":"float32","access":"R"}
]
```

3. Aggiungi una riga in `public/data/devices.json`:

```json
{
  "id": "marca__modello",
  "brand": "Nome Marca",
  "model": "Nome Modello",
  "modelRaw": "marca-modello",
  "category": "Energy Meter",
  "regCount": 2
}
```

4. Commit + push → GitHub Actions aggiorna automaticamente

Tutti i colleghi vedono il nuovo dispositivo al prossimo refresh della pagina.

---

## Convertire una tabella da datasheet

Usa il prompt in `ModbusLibrary_ImportPrompt.md` con qualsiasi IA (Claude, ChatGPT, Gemini...).

---

## Sviluppo locale

```bash
npm install
npm run dev
```

Apri [http://localhost:5173](http://localhost:5173)

---

## Struttura

```
modbus-library/
├── .github/workflows/deploy.yml   ← deploy automatico su push
├── public/
│   └── data/
│       ├── devices.json           ← indice 280 dispositivi
│       └── registers/             ← un JSON per dispositivo
├── src/
│   ├── App.jsx                    ← componente principale
│   ├── App.css                    ← stili
│   └── utils/
│       ├── xmlExport.js           ← export XML EBO
│       └── csvImport.js           ← import CSV/testo
├── vite.config.js                 ← ⚠️ imposta base con nome repo
└── package.json
```
