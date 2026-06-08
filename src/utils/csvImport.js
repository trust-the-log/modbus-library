export function parseImportText(text) {
  const lines = text.trim().split(/\n/);
  const result = [];
  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith('#') || line.trimStart().startsWith('//')) continue;
    const parts = line.split(/[,;\t]+/);
    const addrRaw = parts[0]?.trim();
    if (!addrRaw) continue;
    const addr = parseInt(addrRaw);
    if (isNaN(addr)) continue;

    const typeRaw = (parts[1] || '').trim().toUpperCase();
    const type = typeRaw.includes('HR') || typeRaw === '3' ? 'HR'
               : typeRaw.includes('IR') || typeRaw === '4' ? 'IR'
               : typeRaw.includes('CO') || typeRaw === '1' ? 'CO'
               : typeRaw.includes('DI') || typeRaw === '2' ? 'DI' : 'HR';

    result.push({
      addr,
      type,
      name: (parts[2] || `Register ${addr}`).trim().substring(0, 60),
      desc: (parts[3] || '').trim().substring(0, 80),
      unit: (parts[4] || '').trim().substring(0, 20),
      dataType: (parts[5] || '').trim().substring(0, 20),
      access: (parts[6] || 'R').toUpperCase().includes('W') ? 'RW' : 'R',
    });
  }
  return result;
}
