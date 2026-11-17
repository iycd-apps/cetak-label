// Uji logika murni. Jalankan: node test.js
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// muat encoder QR (bundel node-qrcode) seperti di browser, yaitu sebagai global QRCore
const qrCtx = { TextEncoder };
vm.createContext(qrCtx);
vm.runInContext(fs.readFileSync(__dirname + '/qr-core.js', 'utf8'), qrCtx);
global.QRCore = qrCtx.QRCore;

const { snap, clamp, alignPos, newEl, elFrom, qrSvg, perintahRaster, buatDaftarId, salinUntukBatch, csvBaris, TEMPLATES } = require('./app.js');

assert.strictEqual(snap(2.4, 1), 2);
assert.strictEqual(snap(2.6, 1), 3);
assert.strictEqual(clamp(-3, 0, 10), 0);
assert.strictEqual(clamp(12, 0, 10), 10);
assert.strictEqual(clamp(5, 2, 1), 2);            // hi < lo: elemen lebih besar dari label

assert.strictEqual(alignPos('left', 40, 50), 0);
assert.strictEqual(alignPos('center', 40, 50), 5);
assert.strictEqual(alignPos('right', 40, 50), 10);
assert.strictEqual(alignPos('top', 10, 30), 0);
assert.strictEqual(alignPos('middle', 10, 30), 10);
assert.strictEqual(alignPos('bottom', 10, 30), 20);

// default elemen: tanpa isi latar, teks hitam, dan id tiap elemen unik
const a = elFrom({ text: 'A' }), b = elFrom({ text: 'B' });
assert.strictEqual(a.fill, '');
assert.strictEqual(a.color, '#000');
assert.notStrictEqual(a.id, b.id);

// tiap template: nama unik, punya grup, semua elemen di dalam label, dan tidak ada yang bertumpuk
const overlap = (p, q) => p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h;
const names = new Set();
for (const t of TEMPLATES) {
  assert(!names.has(t.name), 'nama template ganda: ' + t.name);
  names.add(t.name);
  assert(t.group, 'template tanpa grup: ' + t.name);
  assert(t.w > 0 && t.h > 0, 'ukuran tidak valid: ' + t.name);
  const els = t.els.map(elFrom);
  for (const el of els) {
    assert(el.x >= 0 && el.x + el.w <= t.w, `melewati lebar (${t.name}): ${el.text}`);
    assert(el.y >= 0 && el.y + el.h <= t.h, `melewati tinggi (${t.name}): ${el.text}`);
  }
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    assert(!overlap(els[i], els[j]), `bertumpuk (${t.name}): ${els[i].text} dan ${els[j].text}`);
  }
}

// label alat wajib punya QR, dan kotaknya persegi
for (const t of TEMPLATES.filter(t => t.group === 'Label alat')) {
  const q = t.els.find(e => e.type === 'qr');
  assert(q, 'label alat tanpa QR: ' + t.name);
  assert.strictEqual(q.w, q.h);
}

// QR: ID pendek jadi versi 1 (21 modul); SVG berisi satu subpath per modul hitam
const core = qrCtx.QRCore.create('KAM-01', { errorCorrectionLevel: 'M' });
assert.strictEqual(core.modules.size, 21);
const svg = qrSvg('KAM-01');
assert(svg.startsWith('<svg') && svg.includes('viewBox="0 0 29 29"'));
let hitam = 0;
for (let r = 0; r < 21; r++) for (let c = 0; c < 21; c++) if (core.modules.get(r, c)) hitam++;
const subpath = svg.match(/ d="([^"]*)"/)[1].match(/M/g) || [];
assert.strictEqual(subpath.length, hitam);
// data kosong atau terlalu panjang: tidak error, hasilnya string kosong
assert.strictEqual(qrSvg(''), '');
assert.strictEqual(qrSvg('x'.repeat(5000)), '');

// elemen baru dari tombol "+ Teks" juga harus masuk label 50x30
const fresh = newEl('Teks', 50, 30);
assert(fresh.x >= 0 && fresh.x + fresh.w <= 50 && fresh.y >= 0 && fresh.y + fresh.h <= 30);

// perintah raster: header ESC @ + GS v 0 (48 byte per baris), bit 1 = hitam, footer ESC d 3
{
  const tinggi = 3;
  const rgba = new Uint8ClampedArray(384 * tinggi * 4).fill(255);
  rgba[0] = 0;  // piksel (0,0) hitam
  const d = perintahRaster(rgba, 384, tinggi);
  assert.strictEqual(d.length, 10 + 48 * tinggi + 3);
  assert.deepStrictEqual(Array.from(d.slice(0, 10)), [0x1b, 0x40, 0x1d, 0x76, 0x30, 0x00, 48, 0, tinggi, 0]);
  assert.strictEqual(d[10], 0x80);                // baris 0, bit paling kiri hitam
  assert.deepStrictEqual(Array.from(d.slice(-3)), [0x1b, 0x64, 0x03]);
}
// lebar gambar lebih kecil dari kepala: sisa bit di kanan tetap putih
{
  const rgba = new Uint8ClampedArray(8 * 1 * 4).fill(0);  // 8 piksel hitam, 1 baris
  const d = perintahRaster(rgba, 8, 1);
  assert.strictEqual(d[10], 0xff);
  assert.strictEqual(d[11], 0x00);
}

// cetak beruntun: ID otomatis, salinan desain per baris, dan CSV
assert.deepStrictEqual(buatDaftarId('KAM', 1, 3, 2), ['KAM-01', 'KAM-02', 'KAM-03']);
assert.deepStrictEqual(buatDaftarId('', 5, 2, 1), ['5', '6']);
assert.deepStrictEqual(buatDaftarId('X', 9, 2, 1), ['X-9', 'X-10']);
assert.strictEqual(csvBaris(['KAM-01', 'Fujifilm, X-T4', 'say "hai"']), 'KAM-01,"Fujifilm, X-T4","say ""hai"""');
{
  const s = { w: 50, h: 30, frame: false, els: [
    { role: 'id', text: 'KAM-01' }, { role: 'nama', text: 'Lensa' }, { type: 'qr', role: 'id', text: 'KAM-01' }, { text: 'PH: [nama]' },
  ] };
  const b = salinUntukBatch(s, 'KAM-02', 'Kamera');
  assert.deepStrictEqual(b.els.map(e => e.text), ['KAM-02', 'Kamera', 'KAM-02', 'PH: [nama]']);
  assert.strictEqual(s.els[0].text, 'KAM-01');  // desain asal tidak berubah
}
for (const t of TEMPLATES.filter(t => t.group === 'Label alat')) {
  assert(t.els.some(e => e.role === 'id'), 'label alat tanpa peran id: ' + t.name);
  assert(t.els.some(e => e.role === 'nama'), 'label alat tanpa peran nama: ' + t.name);
}

const grup = new Set(TEMPLATES.map(t => t.group));
console.log(`OK: semua uji lulus (${names.size} template, ${grup.size} grup, QR terverifikasi)`);
