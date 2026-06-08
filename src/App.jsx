import { useState, useEffect, useMemo, useCallback } from 'react';
import { downloadXml } from './utils/xmlExport.js';
import { parseImportText } from './utils/csvImport.js';

const BASE = import.meta.env.BASE_URL;

const CAT_ICONS = {
  'Energy Meter': '⚡', 'Solar Inverter': '☀', 'PLC': '⚙',
  'Variable Speed Drive': '🔄', 'Generator': '🔋', 'HVAC Controller': '❄',
  'Building Automation': '🏢', 'Gateway/RTU': '🔌', 'Circuit Breaker': '⚡',
  'Insulation Monitor': '🛡', 'default': '⚡',
};

const TYPE_COLORS = { HR:'HR', IR:'IR', CO:'CO', DI:'DI' };

// ── Pill component ────────────────────────────────────────────────────────────
function Pill({ type }) {
  return <span className={`pill pill-${type}`}>{type}</span>;
}

// ── ImportPanel ───────────────────────────────────────────────────────────────
function ImportPanel({ onSave, onClose }) {
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [cat, setCat] = useState('Energy Meter');
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState('');

  const doParse = () => {
    const regs = parseImportText(text);
    if (regs.length === 0) { setError('Nessun registro trovato. Controlla il formato.'); return; }
    setError('');
    setParsed(regs);
  };

  const doSave = () => {
    if (!name.trim() || !parsed) return;
    const id = `custom__${(brand||'custom').toLowerCase().replace(/\s+/g,'_')}__${name.toLowerCase().replace(/\s+/g,'_')}_${Date.now()}`;
    onSave({ id, brand: brand||'Custom', model: name, modelRaw: name.toLowerCase(), category: cat, regCount: parsed.length, registers: parsed });
    onClose();
  };

  const onFileChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setText(ev.target.result); setParsed(null); setError(''); };
    reader.readAsText(file);
    e.target.value = '';
  };

  const cats = ['Energy Meter','Solar Inverter','PLC','Variable Speed Drive','Generator','HVAC Controller','Building Automation','Gateway/RTU','Other'];

  return (
    <div className="panel-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="panel">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
          <h2>Importa registri</h2>
          <a href={`${BASE}guide.pdf`} target="_blank" rel="noreferrer" className="btn"
            style={{fontSize:11,display:'flex',alignItems:'center',gap:5,textDecoration:'none'}}>
            📖 Guida prompt AI
          </a>
        </div>
        <div className="hint-box">
          Formato: virgola, punto e virgola o tab. Colonne:
          <code>indirizzo, tipo (HR/IR/CO/DI), nome, descrizione, unità, data_type, accesso (R/RW)</code>
          Esempio:
          <code>3000,HR,Voltage L1,Tensione fase L1,V,float32,R{'\n'}3054,HR,Active power,Potenza attiva,kW,float32,R</code>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:4}}>
          <label className="btn" style={{cursor:'pointer',fontSize:11,margin:0}}>
            📂 Carica CSV/TXT
            <input type="file" accept=".csv,.txt,.tsv" style={{display:'none'}} onChange={onFileChange}/>
          </label>
          <span style={{fontSize:11,color:'var(--text-3)'}}>oppure incolla il testo sotto</span>
        </div>
        <textarea value={text} onChange={e=>{setText(e.target.value);setParsed(null);setError('');}} placeholder="Incolla qui la tabella dei registri, oppure carica un file CSV..." />
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button className="btn btn-primary" onClick={doParse} disabled={!text.trim()}>▶ Analizza</button>
          {parsed && <span className="parse-result">✓ {parsed.length} registri trovati</span>}
          {error && <span className="parse-error">{error}</span>}
        </div>
        {parsed && (
          <div className="mini-table">
            <table>
              <thead><tr><th>Addr</th><th>Tipo</th><th>Nome</th><th>Unità</th><th>R/W</th></tr></thead>
              <tbody>
                {parsed.slice(0,15).map((r,i)=>(
                  <tr key={i}>
                    <td className="addr">{r.addr}</td>
                    <td><Pill type={r.type}/></td>
                    <td>{r.name}</td>
                    <td>{r.unit||'—'}</td>
                    <td className={r.access==='RW'?'access-rw':'access-r'}>{r.access}</td>
                  </tr>
                ))}
                {parsed.length>15&&<tr><td colSpan={5} style={{textAlign:'center',color:'var(--text-3)',padding:'4px'}}>...e altri {parsed.length-15}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <div className="import-fields">
          <div className="field"><label>Nome dispositivo *</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Es: PM5100"/></div>
          <div className="field"><label>Marca</label><input value={brand} onChange={e=>setBrand(e.target.value)} placeholder="Es: Schneider Electric"/></div>
          <div className="field"><label>Categoria</label>
            <select value={cat} onChange={e=>setCat(e.target.value)}>
              {cats.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="panel-footer">
          <button className="btn" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" onClick={doSave} disabled={!parsed||!name.trim()}>💾 Salva dispositivo</button>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ devices, navMode, setNavMode, selectedId, onSelect, filter, setFilter }) {
  const [expanded, setExpanded] = useState(new Set());

  const toggle = useCallback(key => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const groups = useMemo(() => {
    const filtered = filter ? devices.filter(d => d.category === filter) : devices;
    const map = {};
    filtered.forEach(d => {
      const key = navMode === 'brand' ? d.brand : d.category;
      if (!map[key]) map[key] = [];
      map[key].push(d);
    });
    return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0]));
  }, [devices, navMode, filter]);

  const cats = useMemo(() => [...new Set(devices.map(d=>d.category))].sort(), [devices]);

  return (
    <div className="sidebar">
      <div className="sidebar-controls">
        <div className="nav-tabs">
          <button className={`nav-tab${navMode==='brand'?' active':''}`} onClick={()=>setNavMode('brand')}>Per marca</button>
          <button className={`nav-tab${navMode==='category'?' active':''}`} onClick={()=>setNavMode('category')}>Per categoria</button>
        </div>
        <select className="sidebar-select" value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="">Tutte le categorie</option>
          {cats.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="sidebar-tree">
        {groups.map(([group, devs]) => {
          const isOpen = expanded.has(group);
          const totalRegs = devs.reduce((s,d)=>s+d.regCount,0);
          return (
            <div key={group} className="tree-group">
              <div className="tree-group-header" onClick={()=>toggle(group)}>
                <span className={`tree-arrow${isOpen?' open':''}`}>▶</span>
                <span className="tree-group-name">{group}</span>
              </div>
              {isOpen && (
                <div className="tree-children">
                  {devs.sort((a,b)=>a.model.localeCompare(b.model)).map(d => (
                    <div key={d.id} className={`tree-device${selectedId===d.id?' selected':''}`} onClick={()=>onSelect(d.id)}>
                      <span className="tree-device-name">{navMode==='brand' ? d.model : `${d.brand} ${d.model.split(' ')[0]}`}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [allDevices, setAllDevices] = useState([]);
  const [customDevices, setCustomDevices] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [registers, setRegisters] = useState([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [navMode, setNavMode] = useState('brand');
  const [catFilter, setCatFilter] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [status, setStatus] = useState('');

  const [buildDate, setBuildDate] = useState('');

  // Load device index on startup
  useEffect(() => {
    fetch(`${BASE}data/devices.json`)
      .then(r => r.json())
      .then(d => { setAllDevices(d); })
      .catch(() => setStatus('Errore caricamento dati'));
    // Load build date
    fetch(`${BASE}version.json`)
      .then(r => r.json())
      .then(v => setBuildDate(new Date(v.date).toLocaleDateString('it-IT', {day:'2-digit',month:'2-digit',year:'numeric'})))
      .catch(() => {});
  }, []);

  const devices = useMemo(() => [...allDevices, ...customDevices], [allDevices, customDevices]);

  const selectedDevice = useMemo(() => devices.find(d => d.id === selectedId), [devices, selectedId]);

  // Load registers when device is selected
  useEffect(() => {
    if (!selectedId) { setRegisters([]); return; }
    const dev = devices.find(d => d.id === selectedId);
    if (!dev) return;
    if (dev.registers) { setRegisters(dev.registers); return; }
    setLoadingRegs(true);
    fetch(`${BASE}data/registers/${selectedId}.json`)
      .then(r => r.json())
      .then(d => { setRegisters(d.map(r=>({...r, name:r.name||'', desc:r.desc||'', unit:r.unit||'', dataType:r.dataType||'', access:r.access||'R', type:r.type||'HR' }))); })
      .catch(() => setRegisters([]))
      .finally(() => setLoadingRegs(false));
  }, [selectedId]);

  const filteredRegs = useMemo(() => {
    let r = registers;
    if (typeFilter) r = r.filter(x => x.type === typeFilter);
    if (search && selectedId) {
      const q = search.toLowerCase();
      r = r.filter(x => String(x.addr).includes(q) || x.name.toLowerCase().includes(q) || x.desc.toLowerCase().includes(q) || x.unit.toLowerCase().includes(q));
    }
    return r;
  }, [registers, typeFilter, search, selectedId]);

  // Global search across all devices (only when no device selected)
  const globalHits = useMemo(() => {
    if (!search || search.length < 2 || selectedId) return null;
    const q = search.toLowerCase();
    const hits = [];
    // Only search in loaded registers (custom devices have registers inline)
    customDevices.forEach(dev => {
      (dev.registers||[]).forEach(r => {
        if (String(r.addr) === q || r.name?.toLowerCase().includes(q))
          hits.push({ dev, reg: r });
      });
    });
    return hits.slice(0, 60);
  }, [search, selectedId, customDevices]);

  const stats = useMemo(() => ({
    total: registers.length,
    hr: registers.filter(r=>r.type==='HR').length,
    ir: registers.filter(r=>r.type==='IR').length,
    co: registers.filter(r=>r.type==='CO'||r.type==='DI').length,
  }), [registers]);

  const handleSelect = id => {
    setSelectedId(id);
    setSearch('');
    setTypeFilter('');
    setStatus('');
  };

  const handleExport = () => {
    if (!selectedDevice) return;
    downloadXml(selectedDevice, filteredRegs.length > 0 ? filteredRegs : registers);
    setStatus(`Esportato: modbus_${selectedDevice.model}.xml`);
  };

  const totalRegs = devices.reduce((s,d)=>s+d.regCount,0);

  return (
    <div className="layout">

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-title">
          <span>⚡</span> Modbus Register Library
        </div>
        <div className="toolbar-search">
          <span className="icon">🔍</span>
          <input value={search} onChange={e=>{setSearch(e.target.value);if(e.target.value)setSelectedId(null);}}
            placeholder="Cerca indirizzo, nome, unità..." />
        </div>
        <div className="toolbar-actions">
          <button className="btn" onClick={handleExport} disabled={!selectedDevice}>📤 Esporta XML</button>
        </div>
      </div>

      {/* Main */}
      <div className="main-area">
        <Sidebar devices={devices} navMode={navMode} setNavMode={setNavMode}
          selectedId={selectedId} onSelect={handleSelect}
          filter={catFilter} setFilter={setCatFilter} />

        <div className="content">
          {selectedDevice ? (
            <>
              {/* Device header */}
              <div className="device-header">
                <div className="device-icon">{CAT_ICONS[selectedDevice.category]||CAT_ICONS.default}</div>
                <div>
                  <div className="device-title">{selectedDevice.brand} — {selectedDevice.model}</div>
                  <div className="device-badges">
                    <span className="badge badge-cat">{selectedDevice.category}</span>
                    {selectedDevice.brand==='Custom' && <span className="badge badge-custom">custom</span>}
                  </div>
                </div>
                <div className="device-header-actions">
                  <button className="btn" onClick={()=>setSelectedId(null)}>✕</button>
                </div>
              </div>

              {/* Stats */}
              <div className="stats-bar">
                <div className="stat stat-total"><div className="stat-val">{stats.total}</div><div className="stat-lbl">Totale</div></div>
                <div className="stat stat-hr"><div className="stat-val">{stats.hr}</div><div className="stat-lbl">Holding (HR)</div></div>
                <div className="stat stat-ir"><div className="stat-val">{stats.ir}</div><div className="stat-lbl">Input (IR)</div></div>
                <div className="stat stat-co"><div className="stat-val">{stats.co}</div><div className="stat-lbl">Coil / DI</div></div>
                <div className="filter-row">
                  <label>Tipo:</label>
                  <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
                    <option value="">Tutti</option>
                    <option value="HR">HR — Holding</option>
                    <option value="IR">IR — Input</option>
                    <option value="CO">CO — Coil</option>
                    <option value="DI">DI — Discrete</option>
                  </select>
                </div>
              </div>

              {/* Register table */}
              {loadingRegs ? <div className="loading">Caricamento registri...</div> : (
                <div className="table-wrap">
                  <table>
                    <thead><tr>
                      <th style={{width:70}}>Indirizzo</th>
                      <th style={{width:46}}>Tipo</th>
                      <th style={{width:180}}>Nome</th>
                      <th>Descrizione</th>
                      <th style={{width:60}}>Unità</th>
                      <th style={{width:80}}>Data type</th>
                      <th style={{width:36}}>R/W</th>
                    </tr></thead>
                    <tbody>
                      {filteredRegs.map((r,i)=>(
                        <tr key={i}>
                          <td><span className="addr">{r.addr}</span></td>
                          <td><Pill type={r.type}/></td>
                          <td><span className="name-cell">{r.name}</span></td>
                          <td><span className="desc-cell">{r.desc||'—'}</span></td>
                          <td>{r.unit||'—'}</td>
                          <td><span className="dtype">{r.dataType||'—'}</span></td>
                          <td><span className={r.access==='RW'?'access-rw':'access-r'}>{r.access}</span></td>
                        </tr>
                      ))}
                      {filteredRegs.length===0&&<tr><td colSpan={7} style={{textAlign:'center',padding:20,color:'var(--text-3)'}}>Nessun registro trovato</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : globalHits && globalHits.length > 0 ? (
            <div className="global-results">
              <div className="global-header">Ricerca globale — {globalHits.length} risultati nei dispositivi custom</div>
              <table>
                <thead><tr><th>Dispositivo</th><th>Addr</th><th>Tipo</th><th>Nome</th><th>Unità</th></tr></thead>
                <tbody>
                  {globalHits.map((h,i)=>(
                    <tr key={i} style={{cursor:'pointer'}} onClick={()=>handleSelect(h.dev.id)}>
                      <td style={{color:'var(--text-2)'}}>{h.dev.brand} {h.dev.model}</td>
                      <td><span className="addr">{h.reg.addr}</span></td>
                      <td><Pill type={h.reg.type}/></td>
                      <td className="name-cell">{h.reg.name}</td>
                      <td>{h.reg.unit||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="placeholder">
              <div className="placeholder-icon">⚡</div>
              <div className="placeholder-text">Seleziona un dispositivo dalla lista</div>
              <div className="placeholder-sub">oppure cerca tra {devices.length} dispositivi e {totalRegs.toLocaleString()} registri</div>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="statusbar">
        <span>{buildDate ? `Aggiornato il ${buildDate}` : ''}</span>
      </div>
    </div>
  );
}
