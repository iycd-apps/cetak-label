// Uji logika murni. Jalankan: node test.js
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// muat encoder QR (bundel node-qrcode) seperti di browser, yaitu sebagai global QRCore
const qrCtx = { TextEncoder };
vm.createContext(qrCtx);
vm.runInContext(fs.readFileSync(__dirname + '/qr-core.js', 'utf8'), qrCtx);
global.QRCore = qrCtx.QRCore;

const { snap, clamp, alignPos, newEl, elFrom, qrSvg, TEMPLATES } = require('./app.js');

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

const grup = new Set(TEMPLATES.map(t => t.group));
console.log(`OK: semua uji lulus (${names.size} template, ${grup.size} grup, QR terverifikasi)`);
