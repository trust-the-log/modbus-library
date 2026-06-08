const MAX_GAP = 8;
const MAX_SPAN = 100;
const RUNTIME_VER = '3.2.3.59';

function sanitize(name) {
  if (!name) return 'Device';
  return name.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/^_+|_+$/g, '') || 'Device';
}

function makeUniqueName(r) {
  const base = sanitize(r.name || `Reg_${r.addr}`).substring(0, 40);
  return `${base}_${r.addr}`;
}

function mapPointType(r) {
  const writable = r.access === 'RW';
  const integer = /int|word|bitmap/i.test(r.dataType || '');
  switch (r.type) {
    case 'CO': return 'modbus.point.DigitalOutput';
    case 'DI': return 'modbus.point.DigitalInput';
    case 'IR': return 'modbus.point.AnalogInput';
    default:
      if (writable) return integer ? 'modbus.point.IntegerOutput' : 'modbus.point.AnalogOutput';
      return 'modbus.point.AnalogInput';
  }
}

function typeLabel(t) {
  return { HR: 'Holding', IR: 'Input', CO: 'Coil', DI: 'Discrete' }[t] || 'Reg';
}

function splitBlocks(ordered) {
  if (!ordered.length) return [];
  const blocks = [];
  let current = [ordered[0]];
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1].addr;
    const curr = ordered[i].addr;
    const start = current[0].addr;
    if ((curr - prev) > MAX_GAP || (curr - start) >= MAX_SPAN) {
      blocks.push(current);
      current = [];
    }
    current.push(ordered[i]);
  }
  if (current.length) blocks.push(current);
  return blocks;
}

function buildPointEl(doc, r) {
  const pt = mapPointType(r);
  const oi = doc.createElement('OI');
  oi.setAttribute('NAME', makeUniqueName(r));
  oi.setAttribute('TYPE', pt);
  if (r.desc) oi.setAttribute('DESCR', r.desc);

  const addPI = (name, value, extra) => {
    const pi = doc.createElement('PI');
    pi.setAttribute('Name', name);
    if (value !== undefined) pi.setAttribute('Value', String(value));
    if (extra) Object.entries(extra).forEach(([k, v]) => pi.setAttribute(k, v));
    oi.appendChild(pi);
  };

  if (r.type === 'IR') addPI('ReadFunctionCode', '4');
  else if (r.type === 'DI') addPI('ReadFunctionCode', '2');

  addPI('RegisterNumber', r.addr);

  if (pt === 'modbus.point.AnalogInput' || pt === 'modbus.point.AnalogOutput') {
    addPI('RegisterType', '1');
    const pi = doc.createElement('PI');
    pi.setAttribute('Name', 'Value');
    pi.setAttribute('Unit', '0x280001');
    oi.appendChild(pi);
  }
  return oi;
}

export function generateXml(device, registers) {
  const doc = new DOMParser().parseFromString(
    '<?xml version="1.0" encoding="UTF-8"?><ObjectSet/>', 'application/xml');
  const root = doc.documentElement;
  root.setAttribute('ExportMode', 'Special');
  root.setAttribute('Note', 'TypesFirst');
  root.setAttribute('Version', RUNTIME_VER);

  const meta = doc.createElement('MetaInformation');
  [['ExportMode', 'Special'], ['RuntimeVersion', RUNTIME_VER],
   ['SourceVersion', RUNTIME_VER], ['ServerFullPath', '/Server 1']].forEach(([tag, val]) => {
    const el = doc.createElement(tag);
    el.setAttribute('Value', val);
    meta.appendChild(el);
  });
  root.appendChild(meta);

  const exported = doc.createElement('ExportedObjects');
  const deviceOI = doc.createElement('OI');
  deviceOI.setAttribute('DESCR', `${device.brand} ${device.model}`.trim());
  deviceOI.setAttribute('NAME', sanitize(device.model));
  deviceOI.setAttribute('TYPE', 'modbus.network.TCPDevice');

  // Group by type, split into contiguous blocks
  const byType = {};
  registers.forEach(r => { (byType[r.type] = byType[r.type] || []).push(r); });

  Object.keys(byType).sort().forEach(type => {
    const ordered = byType[type].slice().sort((a, b) => a.addr - b.addr);
    splitBlocks(ordered).forEach(block => {
      const first = block[0].addr;
      const last = block[block.length - 1].addr;
      const groupOI = doc.createElement('OI');
      groupOI.setAttribute('NAME', sanitize(`${typeLabel(type)}_${first}-${last}`));
      groupOI.setAttribute('TYPE', 'modbus.point.ModbusRegisterGroup');
      block.forEach(r => groupOI.appendChild(buildPointEl(doc, r)));
      deviceOI.appendChild(groupOI);
    });
  });

  // Time Settings node
  const ts = doc.createElement('OI');
  ts.setAttribute('NAME', 'Time Settings');
  ts.setAttribute('TYPE', 'modbus.complex.TimeSync');
  ts.setAttribute('declared', '1');
  deviceOI.appendChild(ts);

  exported.appendChild(deviceOI);
  root.appendChild(exported);

  const serializer = new XMLSerializer();
  const raw = serializer.serializeToString(doc);
  // Pretty print
  return prettyPrint(raw);
}

function prettyPrint(xml) {
  let formatted = '';
  let indent = 0;
  xml.replace(/>\s*</g, '>\n<').split('\n').forEach(line => {
    line = line.trim();
    if (!line) return;
    if (line.startsWith('</')) indent = Math.max(0, indent - 1);
    formatted += '  '.repeat(indent) + line + '\n';
    if (!line.startsWith('</') && !line.endsWith('/>') && !line.startsWith('<?')) indent++;
  });
  return formatted;
}

export function downloadXml(device, registers) {
  const xml = generateXml(device, registers);
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `modbus_${sanitize(device.model)}.xml`;
  a.click();
  URL.revokeObjectURL(url);
}
