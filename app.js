// Cetak Label: editor label untuk printer stiker termal (AIMO T02).
// Semua posisi dan ukuran dalam mm. Cetak lewat dialog print browser.

const MM = 96 / 25.4;          // px per mm pada zoom 100 %
const KEY = 'cetak-label-v1';  // autosave di localStorage

// ---------- logika murni (diuji di test.js) ----------
const round2 = v => Math.round(v * 100) / 100;
const snap = (v, step) => Math.round(v / step) * step;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
const ALIGN_FACTOR = { left: 0, top: 0, center: 0.5, middle: 0.5, right: 1, bottom: 1 };
const alignPos = (mode, size, total) => round2((total - size) * ALIGN_FACTOR[mode]);
// elemen teks di dalam kotak; isi latar dan warna teks opsional (untuk blok ID dan pita kategori)
const elFrom = spec => ({
  id: Math.random().toString(36).slice(2, 9),
  text: '', x: 2, y: 2, w: 10, h: 5, pt: 24, bold: true, align: 'center', fill: '', color: '#000', ...spec,
});
const newEl = (text, w, h) => elFrom({ text, w: w - 4, h: h - 4 });

// QR untuk label alat: matriks dari qr-core.js (node-qrcode, MIT), digambar sebagai SVG hitam tanpa anti-alias
function qrSvg(data) {
  if (!data) return '';
  let qr;
  try { qr = QRCore.create(String(data), { errorCorrectionLevel: 'M' }); } catch (e) { return ''; }  // data terlalu panjang
  const n = qr.modules.size, q = 4;  // zona tenang 4 modul di tiap sisi
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.modules.get(r, c)) d += `M${c + q} ${r + q}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 2 * q} ${n + 2 * q}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges"><path fill="#000" d="${d}"/></svg>`;
}

// ---------- template ----------
// label kabel: ID di blok hitam, rute asal-tujuan di tengah, spesifikasi di bawahnya
const kabel = (id, rute, spek) => [
  { text: id, x: 0, y: 0, w: 12, h: 12, pt: 14, fill: '#000', color: '#fff' },
  { text: rute, x: 13, y: 0.5, w: 46, h: 7, pt: 12 },
  { text: spek, x: 13, y: 7.5, w: 46, h: 4, pt: 8, bold: false, align: 'left' },
];
// label alat gaya PH/lokasi produksi: kategori di pita hitam, ID besar, nama alat, dan pemilik
const alat = (kategori, id, nama) => [
  { text: kategori, x: 0, y: 0, w: 50, h: 7, pt: 12, fill: '#000', color: '#fff' },
  { text: id, role: 'id', x: 1, y: 8, w: 30, h: 10, pt: 20 },
  { text: nama, role: 'nama', x: 1, y: 18.5, w: 30, h: 5.5, pt: 9, bold: false },
  { type: 'qr', role: 'id', text: id, x: 32, y: 7.5, w: 16.5, h: 16.5 },
  { text: 'PH: [nama]', x: 1, y: 24.5, w: 48, h: 4.5, pt: 6.5, bold: false },
];
// template event: hanya nama yang umum untuk semua acara (Ngunduh Mantu dan nama kamera CAM tidak dipakai)
const EVENT = ['Photo', 'Video Clip', 'Panggung', 'BOTH', 'Job 1', 'Job 2'];
const TEMPLATES = [
  ...EVENT.map(t => ({ group: 'Event', name: t, w: 50, h: 30, els: [{ text: t, x: 2, y: 2, w: 46, h: 26 }] })),
  { group: 'Label kabel', name: 'Kabel HDMI', w: 60, h: 12, els: kabel('K-01', 'KAMERA → MONITOR', 'HDMI · 5 m') },
  { group: 'Label kabel', name: 'Kabel power', w: 60, h: 12, els: kabel('P-01', 'ADAPTOR → STOP KONTAK', 'Power · 5 m') },
  { group: 'Label kabel', name: 'Kabel audio', w: 60, h: 12, els: kabel('A-01', 'MIC → RECORDER', 'XLR · 10 m') },
  { group: 'Label kabel', name: 'Kabel kosong', w: 60, h: 12, els: kabel('K-00', 'ASAL → TUJUAN', 'Jenis · panjang') },
  { group: 'Label alat', name: 'Alat: Kamera', w: 50, h: 30, frame: true, els: alat('KAMERA', 'KAM-01', 'Fujifilm X-T4 body') },
  { group: 'Label alat', name: 'Alat: Lensa', w: 50, h: 30, frame: true, els: alat('LENSA', 'LEN-01', 'Lensa 16-55 f/2.8') },
  { group: 'Label alat', name: 'Alat: Baterai', w: 50, h: 30, frame: true, els: alat('BATERAI', 'BAT-01', 'Baterai NP-W126S') },
  { group: 'Label alat', name: 'Alat: Mic', w: 50, h: 30, frame: true, els: alat('AUDIO', 'MIC-01', 'Mic shotgun') },
  { group: 'Label alat', name: 'Alat: Lampu', w: 50, h: 30, frame: true, els: alat('LAMPU', 'LMP-01', 'Lampu LED 100 W') },
  { group: 'Label alat', name: 'Alat: Monitor', w: 50, h: 30, frame: true, els: alat('MONITOR', 'MON-01', 'Monitor 7 inch') },
  { group: 'Label alat', name: 'Alat: Tripod', w: 50, h: 30, frame: true, els: alat('TRIPOD', 'TRP-01', 'Tripod video') },
  { group: 'Label alat', name: 'Alat: Memori', w: 50, h: 30, frame: true, els: alat('MEMORI', 'SD-01', 'SD card 64 GB') },
  { group: 'Lainnya', name: 'Kosong 50x30 mm', w: 50, h: 30, els: [] },
];

// ---------- keadaan ----------
let state = { w: 50, h: 30, zoom: 'auto', snap: true, els: [] };
let selId = null;
let Z = 3;  // skala tampilan aktif: px layar per mm = MM * Z
let drag = null;
let D = {};
const nodes = new Map();  // id elemen -> node DOM
const byId = id => state.els.find(e => e.id === id);

function place(el, n) {
  Object.assign(n.style, { left: el.x + 'mm', top: el.y + 'mm', width: el.w + 'mm', height: el.h + 'mm' });
}

// isi teks, lalu cari ukuran font terbesar (sampai pt maks) yang masih muat di kotak
function paint(el, n) {
  place(el, n);
  n.style.background = el.fill || '';
  const t = n.firstChild;
  if (el.type === 'qr') {  // kotak QR: gambar SVG, tidak ada teks yang perlu diukur
    t.style.height = '100%';
    t.innerHTML = qrSvg(el.text);
    return;
  }
  t.style.height = '';
  t.textContent = el.text;
  t.style.color = el.color || '#000';
  t.style.textAlign = el.align;
  t.style.fontWeight = el.bold ? 700 : 400;
  let pt = el.pt;
  t.style.fontSize = pt + 'pt';
  while (pt > 3 && (n.scrollWidth > n.clientWidth || n.scrollHeight > n.clientHeight)) {
    pt = round2(pt - 0.5);
    t.style.fontSize = pt + 'pt';
  }
}

function makeNode(id) {
  const n = document.createElement('div');
  n.className = 'el';
  n.dataset.id = id;
  n.innerHTML = '<div class="t"></div><div class="rz"></div>';
  n.addEventListener('pointerdown', down);
  n.addEventListener('pointermove', move);
  n.addEventListener('pointerup', up);
  n.addEventListener('pointercancel', up);
  return n;
}

function down(ev) {
  ev.stopPropagation();
  const el = byId(ev.currentTarget.dataset.id);
  select(el.id);
  drag = { id: el.id, rz: ev.target.classList.contains('rz'), sx: ev.clientX, sy: ev.clientY, ox: el.x, oy: el.y, ow: el.w, oh: el.h };
  ev.currentTarget.setPointerCapture(ev.pointerId);
}

function move(ev) {
  if (!drag) return;
  const el = byId(drag.id), n = nodes.get(drag.id);
  const k = MM * Z;                                // px layar per mm
  const dx = (ev.clientX - drag.sx) / k, dy = (ev.clientY - drag.sy) / k;
  const q = v => round2(state.snap ? snap(v, 1) : v);
  if (drag.rz) {
    el.w = clamp(q(drag.ow + dx), 2, state.w - el.x);
    el.h = clamp(q(drag.oh + dy), 2, state.h - el.y);
    paint(el, n);
  } else {
    el.x = clamp(q(drag.ox + dx), 0, state.w - el.w);
    el.y = clamp(q(drag.oy + dy), 0, state.h - el.h);
    place(el, n);
  }
}

function up() {
  if (!drag) return;
  drag = null;
  save();
  fillForm();
}

function select(id) {
  selId = id;
  for (const [k, n] of nodes) n.classList.toggle('sel', k === id);
  fillForm();
}

function fillForm() {
  const el = byId(selId);
  D.none.hidden = !!el;
  D.form.hidden = !el;
  if (!el) return;
  D.text.value = el.text; D.pt.value = el.pt; D.bold.checked = el.bold; D.align.value = el.align;
  D.fill.value = el.fill || ''; D.color.value = el.color || '#000';
  D.qrHint.hidden = el.type !== 'qr';
  D.x.value = el.x; D.y.value = el.y; D.w.value = el.w; D.h.value = el.h;
}

// ubah elemen terpilih lalu gambar ulang
function edit(fn) {
  const el = byId(selId);
  if (!el) return;
  fn(el);
  paint(el, nodes.get(el.id));
  save();
}

function removeSel() {
  if (!byId(selId)) return;
  nodes.get(selId).remove();
  nodes.delete(selId);
  state.els = state.els.filter(e => e.id !== selId);
  select(null);
  save();
}

function addText() {
  const el = newEl('Teks', state.w, state.h);
  state.els.push(el);
  renderAll();
  select(el.id);
}

function addQr() {
  const el = elFrom({ type: 'qr', text: 'ID-01', x: 2, y: 2, w: 16, h: 16 });
  state.els.push(el);
  renderAll();
  select(el.id);
}

function loadTemplate(i) {
  const t = TEMPLATES[i];
  if (state.els.length && !confirm(`Ganti isi label dengan template "${t.name}"? Elemen sekarang akan hilang.`)) return;
  Object.assign(state, { w: t.w, h: t.h, frame: !!t.frame, els: t.els.map(elFrom) });
  selId = null;
  renderAll();
}

// setelah ukuran label diubah, elemen yang keluar dari label ditarik masuk
function fitAll() {
  for (const el of state.els) {
    el.w = Math.min(el.w, state.w);
    el.h = Math.min(el.h, state.h);
    el.x = clamp(el.x, 0, state.w - el.w);
    el.y = clamp(el.y, 0, state.h - el.h);
  }
}

function renderAll() {
  const { w, h } = state;
  // Otomatis: label dipas ke lebar layar (maks 3x) supaya muat di HP
  Z = state.zoom === 'auto' ? clamp((D.view.clientWidth - 64) / (w * MM), 0.5, 3) : +state.zoom;
  D.page.textContent = `@page { size: ${w}mm ${h}mm; margin: 0; }`;
  Object.assign(D.label.style, { width: w + 'mm', height: h + 'mm', transform: `scale(${Z})` });
  Object.assign(D.wrap.style, { width: w * MM * Z + 'px', height: h * MM * Z + 'px' });
  D.lw.value = w; D.lh.value = h; D.snap.checked = state.snap; D.zoom.value = state.zoom;
  D.frame.checked = !!state.frame; D.label.classList.toggle('frame', !!state.frame);
  const keep = new Set(state.els.map(e => e.id));
  for (const [id, n] of nodes) if (!keep.has(id)) { n.remove(); nodes.delete(id); }
  for (const el of state.els) {
    let n = nodes.get(el.id);
    if (!n) { n = makeNode(el.id); nodes.set(el.id, n); D.label.appendChild(n); }
    paint(el, n);
    n.classList.toggle('sel', el.id === selId);
  }
  fillForm();
  save();
}

// ---------- ekspor PNG hitam-putih untuk aplikasi printer (sekitar 203 dpi) ----------
const PX_PER_MM = 8;                          // 8 px per mm, sekitar 203 dpi
const PX_PER_PT = PX_PER_MM * 25.4 / 72;      // 1 pt = 2,82 px pada 203 dpi

function lipatBaris(g, teks, lebar) {
  const baris = [];
  for (const paragraf of teks.split('\n')) {
    let cur = '';
    for (const kata of paragraf.split(' ')) {
      const uji = cur ? cur + ' ' + kata : kata;
      if (!cur || g.measureText(uji).width <= lebar) cur = uji;
      else { baris.push(cur); cur = kata; }
    }
    baris.push(cur);
  }
  return baris;
}

function gambarTeks(g, el, x, y, w, h) {
  let px = Math.min(el.pt, 200) * PX_PER_PT;   // mulai dari ukuran maks, lalu dikecilkan sampai muat
  let baris;
  for (;;) {
    g.font = `${el.bold ? 'bold ' : ''}${px}px system-ui, sans-serif`;
    baris = lipatBaris(g, el.text, w);
    const lebarMaks = Math.max(0, ...baris.map(b => g.measureText(b).width));
    if ((baris.length * px * 1.05 <= h && lebarMaks <= w) || px <= 3 * PX_PER_PT) break;
    px *= 0.95;
  }
  const align = el.align || 'center';
  g.fillStyle = el.color || '#000';
  g.textBaseline = 'top';
  g.textAlign = align;
  const xx = align === 'left' ? x : align === 'right' ? x + w : x + w / 2;
  let yy = y + (h - baris.length * px * 1.05) / 2;
  for (const b of baris) { g.fillText(b, xx, yy); yy += px * 1.05; }
}

function gambarQr(g, teks, x, y, w, h) {
  if (!teks) return;
  let qr;
  try { qr = QRCore.create(String(teks), { errorCorrectionLevel: 'M' }); } catch (e) { return; }
  const n = qr.modules.size, q = 4, sisi = Math.min(w, h), sel = sisi / (n + 2 * q);
  const ox = x + (w - sisi) / 2 + q * sel, oy = y + (h - sisi) / 2 + q * sel;
  g.fillStyle = '#000';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (qr.modules.get(r, c)) g.fillRect(ox + c * sel, oy + r * sel, sel + 0.5, sel + 0.5);
  }
}

function kanvasLabel(s = state) {
  const c = document.createElement('canvas');
  c.width = Math.round(s.w * PX_PER_MM);
  c.height = Math.round(s.h * PX_PER_MM);
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, c.width, c.height);
  for (const el of s.els) {
    const x = el.x * PX_PER_MM, y = el.y * PX_PER_MM, w = el.w * PX_PER_MM, h = el.h * PX_PER_MM;
    if (el.fill) { g.fillStyle = el.fill; g.fillRect(x, y, w, h); }
    if (el.type === 'qr') gambarQr(g, el.text, x, y, w, h);
    else gambarTeks(g, el, x, y, w, h);
  }
  if (s.frame) {
    const lw = 0.35 * PX_PER_MM;
    g.strokeStyle = '#000';
    g.lineWidth = lw;
    g.strokeRect(lw / 2, lw / 2, c.width - lw, c.height - lw);
  }
  // hitam-putih murni: printer termal hanya bisa mencetak titik hitam atau kosong
  const img = g.getImageData(0, 0, c.width, c.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = lum < 128 ? 0 : 255;
    d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function unduhPng() {
  kanvasLabel().toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `label-${state.w}x${state.h}mm.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, 'image/png');
}

// ---------- cetak langsung ke T02 lewat Web Bluetooth (Chrome/Edge; tidak di Safari/iPad) ----------
const UUID_LAYANAN_T02 = '0000ff00-0000-1000-8000-00805f9b34fb';
const UUID_TULIS_T02 = '0000ff02-0000-1000-8000-00805f9b34fb';
const LEBAR_KEPALA_T02 = 384;  // 384 titik = 48 mm pada 203 dpi

// piksel RGBA (hitam = R < 128) -> ESC @, lalu GS v 0 (48 byte per baris, bit 1 = hitam), lalu ESC d 3
function perintahRaster(rgba, lebarPx, tinggiPx) {
  const bpr = LEBAR_KEPALA_T02 / 8;
  const out = new Uint8Array(10 + bpr * tinggiPx + 3);
  out.set([0x1b, 0x40, 0x1d, 0x76, 0x30, 0x00, bpr, 0, tinggiPx & 0xff, tinggiPx >> 8], 0);
  let p = 10;
  for (let y = 0; y < tinggiPx; y++) {
    for (let x = 0; x < bpr; x++) {
      let b = 0;
      for (let bit = 0; bit < 8; bit++) {
        const kolom = x * 8 + bit;
        if (kolom < lebarPx && rgba[(y * lebarPx + kolom) * 4] < 128) b |= 0x80 >> bit;
      }
      out[p++] = b;
    }
  }
  out.set([0x1b, 0x64, 0x03], p);
  return out;
}

// satu label -> bytes raster 48 mm (dikecilkan bila lebih lebar; sisi kanan diberi putih)
function rasterLabel(s) {
  const asal = kanvasLabel(s);
  const skala = Math.min(1, LEBAR_KEPALA_T02 / asal.width);
  const c = document.createElement('canvas');
  c.width = LEBAR_KEPALA_T02;
  c.height = Math.round(asal.height * skala);
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, c.width, c.height);
  g.imageSmoothingEnabled = false;
  g.drawImage(asal, 0, 0, asal.width * skala, asal.height * skala);
  return perintahRaster(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
}

// kirim beberapa label berurutan dalam satu koneksi; tiap label diberi jeda agar printer selesai mencetak
async function kirimKeT02(daftarRaster) {
  if (!navigator.bluetooth) {
    alert('Browser ini tidak mendukung Web Bluetooth. Pakai Chrome atau Edge di Mac atau Android.');
    return;
  }
  let perangkat = null;
  try {
    perangkat = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [UUID_LAYANAN_T02] });
    const server = await perangkat.gatt.connect();
    const layanan = await server.getPrimaryService(UUID_LAYANAN_T02);
    const karakteristik = await layanan.getCharacteristic(UUID_TULIS_T02);
    for (const data of daftarRaster) {
      for (let i = 0; i < data.length; i += 100) {
        await karakteristik.writeValueWithoutResponse(data.slice(i, i + 100));
        await new Promise(r => setTimeout(r, 25));
      }
      await new Promise(r => setTimeout(r, 1500));  // beri waktu printer mencetak sebelum label berikutnya
    }
  } catch (e) {
    alert(`Gagal mencetak: ${e.name}: ${e.message}`);
  } finally {
    if (perangkat && perangkat.gatt.connected) perangkat.gatt.disconnect();
  }
}

function cetakBluetooth() {
  kirimKeT02([rasterLabel(state)]);
}

// ---------- cetak beruntun dan daftar CSV ----------
// daftar ID beruntun, mis. KAM-01, KAM-02, ...
function buatDaftarId(awalan, mulai, jumlah, digit) {
  const hasil = [];
  for (let i = 0; i < jumlah; i++) {
    hasil.push((awalan ? awalan + '-' : '') + String(mulai + i).padStart(digit, '0'));
  }
  return hasil;
}

// salinan desain untuk satu baris: bagian ber-peran 'id' dan 'nama' diganti (QR ikut ID)
function salinUntukBatch(s, id, nama) {
  return {
    w: s.w, h: s.h, frame: s.frame,
    els: s.els.map(el => ({ ...el, text: el.role === 'id' ? id : el.role === 'nama' ? nama : el.text })),
  };
}

// satu baris CSV; nilai yang berisi koma, kutip, atau baris baru diberi kutip ganda
function csvBaris(nilai) {
  return nilai.map(v => (/[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v)).join(',');
}

function bacaTabel() {
  return [...document.querySelectorAll('#tabelBatch tbody tr')]
    .map(tr => ({ id: tr.querySelector('.bid').value.trim(), nama: tr.querySelector('.bnama').value }))
    .filter(b => b.id);
}

function buatTabel() {
  const awalan = document.getElementById('bprefix').value.trim();
  const mulai = +document.getElementById('bmulai').value || 1;
  const jumlah = Math.min(200, +document.getElementById('bjumlah').value || 1);
  const digit = +document.getElementById('bdigit').value || 2;
  const namaAwal = (state.els.find(el => el.role === 'nama') || { text: '' }).text;
  const tbody = document.querySelector('#tabelBatch tbody');
  tbody.textContent = '';
  for (const id of buatDaftarId(awalan, mulai, jumlah, digit)) {
    const tr = document.createElement('tr');
    const tdId = document.createElement('td');
    const tdNama = document.createElement('td');
    const inpId = document.createElement('input');
    const inpNama = document.createElement('input');
    inpId.className = 'bid';
    inpId.value = id;
    inpNama.className = 'bnama';
    inpNama.value = namaAwal;
    tdId.appendChild(inpId);
    tdNama.appendChild(inpNama);
    tr.append(tdId, tdNama);
    tbody.appendChild(tr);
  }
}

function unduhCsv() {
  const baris = bacaTabel();
  if (baris.length === 0) { alert('Daftar masih kosong. Klik Buat daftar dulu.'); return; }
  // BOM di awal agar Excel membaca huruf Indonesia dengan benar
  const teks = '﻿' + ['ID,Nama', ...baris.map(b => csvBaris([b.id, b.nama]))].join('\n') + '\n';
  const url = URL.createObjectURL(new Blob([teks], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'daftar-label.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function cetakBatchBluetooth() {
  const baris = bacaTabel();
  if (baris.length === 0) { alert('Daftar masih kosong. Klik Buat daftar dulu.'); return; }
  kirimKeT02(baris.map(b => rasterLabel(salinUntukBatch(state, b.id, b.nama))));
}

function onKey(e) {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
  if (e.key === 'Escape') return select(null);
  if (!byId(selId)) return;
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); return removeSel(); }
  const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (!d) return;
  e.preventDefault();
  const s = e.shiftKey ? 1 : 0.5;
  edit(el => {
    el.x = clamp(el.x + d[0] * s, 0, state.w - el.w);
    el.y = clamp(el.y + d[1] * s, 0, state.h - el.h);
  });
  fillForm();
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* penyimpanan diblokir: tetap jalan tanpa autosave */ }
}

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
}

function init() {
  const $ = id => document.getElementById(id);
  D = {
    page: $('page'), tpl: $('tpl'), lw: $('lw'), lh: $('lh'), snap: $('snap'), zoom: $('zoom'),
    add: $('add'), print: $('print'), view: $('view'), wrap: $('wrap'), label: $('label'),
    none: $('none'), form: $('form'), text: $('text'), pt: $('pt'), bold: $('bold'), align: $('align'),
    x: $('x'), y: $('y'), w: $('w'), h: $('h'), del: $('del'), printArea: $('printArea'),
    frame: $('frame'), fill: $('fill'), color: $('color'),
    addqr: $('addqr'), qrHint: $('qrHint'),
  };
  // dropdown dikelompokkan per grup (TEMPLATES disusun berurutan per grup)
  let grup = null, grupAkhir = '';
  TEMPLATES.forEach((t, i) => {
    if (t.group !== grupAkhir) { grup = document.createElement('optgroup'); grup.label = t.group; D.tpl.appendChild(grup); grupAkhir = t.group; }
    grup.appendChild(new Option(t.name, i));
  });
  D.tpl.onchange = () => { if (D.tpl.value !== '') loadTemplate(+D.tpl.value); D.tpl.value = ''; };
  D.lw.onchange = () => { state.w = clamp(+D.lw.value || 50, 5, 300); fitAll(); renderAll(); };
  D.lh.onchange = () => { state.h = clamp(+D.lh.value || 30, 5, 300); fitAll(); renderAll(); };
  D.snap.onchange = () => { state.snap = D.snap.checked; save(); };
  D.zoom.onchange = () => { state.zoom = D.zoom.value; renderAll(); };
  D.add.onclick = addText;
  D.addqr.onclick = addQr;
  document.getElementById('png').onclick = unduhPng;
  document.getElementById('btcetak').onclick = cetakBluetooth;
  document.getElementById('bbuat').onclick = buatTabel;
  document.getElementById('bcetak').onclick = cetakBatchBluetooth;
  document.getElementById('bcsv').onclick = unduhCsv;
  D.print.onclick = () => {
    select(null);
    const c = D.label.cloneNode(true);   // cetak salinan bersih, tanpa handle dan outline
    c.removeAttribute('id');
    c.style.transform = 'none';
    D.printArea.replaceChildren(c);
    window.print();
  };
  window.addEventListener('afterprint', () => D.printArea.replaceChildren());
  D.view.addEventListener('pointerdown', e => { if (e.target === D.view || e.target === D.wrap || e.target === D.label) select(null); });
  D.text.oninput = () => edit(el => { el.text = D.text.value; });
  D.pt.onchange = () => { edit(el => { el.pt = clamp(+D.pt.value || 4, 4, 200); }); fillForm(); };
  D.bold.onchange = () => edit(el => { el.bold = D.bold.checked; });
  D.align.onchange = () => edit(el => { el.align = D.align.value; });
  D.fill.onchange = () => edit(el => { el.fill = D.fill.value; });
  D.color.onchange = () => edit(el => { el.color = D.color.value; });
  D.frame.onchange = () => { state.frame = D.frame.checked; renderAll(); };
  D.x.onchange = () => { edit(el => { el.x = clamp(+D.x.value || 0, 0, state.w - el.w); }); fillForm(); };
  D.y.onchange = () => { edit(el => { el.y = clamp(+D.y.value || 0, 0, state.h - el.h); }); fillForm(); };
  D.w.onchange = () => { edit(el => { el.w = clamp(+D.w.value || 2, 2, state.w - el.x); }); fillForm(); };
  D.h.onchange = () => { edit(el => { el.h = clamp(+D.h.value || 2, 2, state.h - el.y); }); fillForm(); };
  D.del.onclick = removeSel;
  document.querySelectorAll('[data-al]').forEach(b => b.onclick = () => {
    const m = b.dataset.al;
    edit(el => {
      if (m === 'top' || m === 'middle' || m === 'bottom') el.y = alignPos(m, el.h, state.h);
      else el.x = alignPos(m, el.w, state.w);
    });
    fillForm();
  });
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', () => { if (state.zoom === 'auto') renderAll(); });
  const s = loadSaved();
  if (s && Array.isArray(s.els)) Object.assign(state, s);
  renderAll();
}

if (typeof module !== 'undefined') module.exports = { snap, clamp, alignPos, newEl, elFrom, qrSvg, perintahRaster, buatDaftarId, salinUntukBatch, csvBaris, TEMPLATES };
else init();
