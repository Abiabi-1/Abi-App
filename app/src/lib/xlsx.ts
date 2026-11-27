// Minimal .xlsx writer (stored zip, inline strings) – same output format as the old app's Excel exports.
export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CRC_T = (() => { const t: number[] = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b: Uint8Array) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const utf8 = (s: string) => new TextEncoder().encode(s);
const xmlEsc = (s: unknown) => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function zipStore(files: { name: string; data: Uint8Array }[]) {
  const parts: BlobPart[] = [], central: Uint8Array[] = []; let offset = 0;
  files.forEach(f => {
    const name = utf8(f.name), data = f.data, crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(12, 0x21, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true);
    parts.push(new Uint8Array(lh.buffer), name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(14, 0x21, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), name); offset += 30 + name.length + data.length;
  });
  let csize = 0; central.forEach(p => { csize += p.length; });
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, csize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: XLSX_MIME });
}
const colLetter = (i: number) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
export function buildXlsx(rows: unknown[][], widths: number[], sheetName = 'Deals') {
  const H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n', NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const RN = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', PR = 'http://schemas.openxmlformats.org/package/2006/relationships';
  let sheet = H + '<worksheet xmlns="' + NS + '"><cols>' + widths.map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join('') + '</cols><sheetData>';
  rows.forEach((r, ri) => {
    sheet += '<row r="' + (ri + 1) + '">';
    r.forEach((v, ci) => { const ref = colLetter(ci) + (ri + 1); if (typeof v === 'number') sheet += '<c r="' + ref + '"><v>' + v + '</v></c>'; else if (v !== '' && v != null) sheet += '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + xmlEsc(v) + '</t></is></c>'; });
    sheet += '</row>';
  });
  sheet += '</sheetData></worksheet>';
  return zipStore([
    { name: '[Content_Types].xml', data: utf8(H + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>') },
    { name: '_rels/.rels', data: utf8(H + '<Relationships xmlns="' + PR + '"><Relationship Id="rId1" Type="' + RN + '/officeDocument" Target="xl/workbook.xml"/></Relationships>') },
    { name: 'xl/workbook.xml', data: utf8(H + '<workbook xmlns="' + NS + '" xmlns:r="' + RN + '"><sheets><sheet name="' + xmlEsc(sheetName) + '" sheetId="1" r:id="rId1"/></sheets></workbook>') },
    { name: 'xl/_rels/workbook.xml.rels', data: utf8(H + '<Relationships xmlns="' + PR + '"><Relationship Id="rId1" Type="' + RN + '/worksheet" Target="worksheets/sheet1.xml"/></Relationships>') },
    { name: 'xl/worksheets/sheet1.xml', data: utf8(sheet) },
  ]);
}
