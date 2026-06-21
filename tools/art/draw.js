/* Procedural GBA-style pixel-art generator. Draws every game asset onto a small
 * canvas (1 unit = 1 pixel); render-art.mjs exports each to a PNG. All original
 * art — no third-party sprites. */
(function () {
  // ---- palette ----------------------------------------------------------
  const P = {
    skyT: '#74c0fc', skyB: '#c9ecff', cloud: '#ffffff', cloudSh: '#dbeeff',
    water: '#3d7ad6', waterHi: '#62a0ea', waterLo: '#2a5cc0', foam: '#bfe3ff',
    grass: '#6cc24a', grassDk: '#52a836', grassHi: '#8fe06a', grassEdge: '#3f8f2c',
    path: '#e3c578', pathDk: '#c9a557', pathEdge: '#a9863f',
    tree: '#2f9e44', treeHi: '#49c267', treeDk: '#1f7a34', trunk: '#7a4a1e', trunkDk: '#5a3514',
    fR: '#ff6b6b', fY: '#ffd43b', fP: '#da77f2', fW: '#ffffff',
    roofR: '#e8463a', roofRDk: '#b02b22', roofB: '#4a7be8', roofBDk: '#2c52b0',
    roofG: '#3aa657', roofGDk: '#247a3c',
    wall: '#f3ead2', wallDk: '#d8caa6', wallLn: '#b29a64', door: '#7a4a1e', win: '#8fd0ff',
    rock: '#9a8f86', rockDk: '#6e655d', rockHi: '#bcb2a8', cave: '#3a3340', caveDk: '#241f29',
    snow: '#eef6ff', mtn: '#8b8f9a', mtnDk: '#5f6470',
    ink: '#23202a', white: '#ffffff', sign: '#f0e6d0',
    skin: '#f1c79a', skinDk: '#d49b6a', capR: '#e8463a', capB: '#4a7be8',
    shirt: '#4a7be8', shirtR: '#e8463a', shirtG: '#3aa657', shirtP: '#9b5de5',
    hair: '#6b4423', hairBlond: '#e8b84a', hairBlk: '#2b2b33', jeans: '#3a55a0',
    gold: '#ffd43b', goldDk: '#caa12a',
  };

  // ---- primitives -------------------------------------------------------
  function r(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x | 0, y | 0, w | 0, h | 0); }
  function px(c, x, y, col) { c.fillStyle = col; c.fillRect(x | 0, y | 0, 1, 1); }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function outline(c, x, y, w, h, col) { r(c, x, y, w, 1, col); r(c, x, y + h - 1, w, 1, col); r(c, x, y, 1, h, col); r(c, x + w - 1, y, 1, h, col); }

  // ---- terrain tiles ----------------------------------------------------
  function grass(c, x, y, w, h, seed) {
    r(c, x, y, w, h, P.grass);
    const rd = rng(seed || 7);
    for (let i = 0; i < (w * h) / 26; i++) {
      const gx = x + ((rd() * w) | 0), gy = y + ((rd() * h) | 0);
      const col = rd() < 0.5 ? P.grassDk : P.grassHi;
      px(c, gx, gy, col); px(c, gx, gy - 1, col);
    }
  }
  function water(c, x, y, w, h, seed) {
    r(c, x, y, w, h, P.water);
    const rd = rng(seed || 11);
    for (let yy = y + 2; yy < y + h; yy += 4) {
      for (let xx = x; xx < x + w; xx += 6) {
        const o = (rd() * 3) | 0;
        r(c, xx + o, yy, 3, 1, P.waterHi);
        r(c, xx + o + 3, yy + 2, 2, 1, P.waterLo);
      }
    }
  }
  function tree(c, x, y, s) {
    const w = s, h = s;
    r(c, x + w / 2 - 1, y + h - 4, 2, 4, P.trunkDk);
    r(c, x + w / 2 - 1, y + h - 4, 1, 4, P.trunk);
    // canopy
    r(c, x + 2, y + 2, w - 4, h - 6, P.tree);
    r(c, x + 1, y + 4, w - 2, h - 9, P.tree);
    r(c, x + 3, y + 2, w - 8, 2, P.treeHi);
    r(c, x + 2, y + h - 6, w - 4, 2, P.treeDk);
    // dapples
    px(c, x + 4, y + 5, P.treeHi); px(c, x + w - 6, y + 6, P.treeDk);
  }
  function flower(c, x, y, col) { px(c, x, y, col); px(c, x + 1, y, col); px(c, x, y + 1, col); px(c, x + 1, y + 1, col); px(c, x, y, P.fW); }
  function pathH(c, x, y, w, h) { r(c, x, y, w, h, P.path); r(c, x, y, w, 1, P.pathDk); r(c, x, y + h - 1, w, 1, P.pathEdge); }

  // ---- buildings --------------------------------------------------------
  function building(c, x, y, w, h, roof, roofDk, withSign) {
    const wallY = y + (h * 0.42) | 0;
    // body
    r(c, x, wallY, w, y + h - wallY, P.wall);
    outline(c, x, wallY, w, y + h - wallY, P.wallLn);
    // roof (trapezoid-ish)
    for (let i = 0; i < (wallY - y); i++) {
      const inset = Math.round((1 - i / (wallY - y)) * (w * 0.18));
      r(c, x + inset, y + i, w - inset * 2, 1, roof);
    }
    r(c, x, wallY - 2, w, 2, roofDk);
    // door
    const dw = Math.max(4, (w * 0.22) | 0), dx = x + (w - dw) / 2;
    r(c, dx, y + h - (h * 0.28), dw, (h * 0.28), P.door);
    r(c, dx, y + h - (h * 0.28), dw, 1, P.ink);
    // windows
    r(c, x + 3, wallY + 3, 4, 4, P.win); r(c, x + w - 7, wallY + 3, 4, 4, P.win);
    outline(c, x + 3, wallY + 3, 4, 4, P.wallLn); outline(c, x + w - 7, wallY + 3, 4, 4, P.wallLn);
    if (withSign) { r(c, x + w / 2 - 4, y + 2, 8, 4, P.sign); outline(c, x + w / 2 - 4, y + 2, 8, 4, P.ink); }
  }
  function pokecenter(c, x, y, w, h) {
    building(c, x, y, w, h, P.roofR, P.roofRDk, true);
    // red cross on sign
    const sx = x + w / 2, sy = y + 4;
    r(c, sx - 1, sy - 1, 2, 4, P.roofR); r(c, sx - 2, sy, 4, 2, P.roofR);
  }
  function pokemart(c, x, y, w, h) {
    building(c, x, y, w, h, P.roofB, P.roofBDk, true);
    r(c, x + w / 2 - 2, y + 2, 4, 4, P.gold); // mart mark
  }
  function house(c, x, y, w, h, roof) { building(c, x, y, w, h, roof || P.roofR, roof ? P.roofBDk : P.roofRDk, false); }
  function gym(c, x, y, w, h) {
    building(c, x, y, w, h, P.roofG, P.roofGDk, true);
    // banner
    r(c, x + w / 2 - 5, y - 1, 10, 3, P.roofRDk);
    // big doors
    r(c, x + w / 2 - 4, y + h - 8, 8, 8, P.door); r(c, x + w / 2, y + h - 8, 1, 8, P.ink);
  }

  // ---- scenes -----------------------------------------------------------
  function sky(c, W, H, hSky) {
    const g = c.createLinearGradient(0, 0, 0, hSky); g.addColorStop(0, P.skyT); g.addColorStop(1, P.skyB);
    c.fillStyle = g; c.fillRect(0, 0, W, hSky);
    const rd = rng(99);
    for (let i = 0; i < W / 40; i++) {
      const cx = (rd() * W) | 0, cy = ((rd() * hSky * 0.7) | 0) + 4, cw = 14 + (rd() * 18 | 0);
      r(c, cx, cy, cw, 4, P.cloud); r(c, cx + 3, cy - 2, cw - 8, 3, P.cloud); r(c, cx + 2, cy + 4, cw - 4, 1, P.cloudSh);
    }
  }
  function overworld(c, W, H) {
    const hSky = (H * 0.42) | 0; sky(c, W, H, hSky);
    water(c, 0, hSky, W, 8, 5); r(c, 0, hSky, W, 1, P.foam);
    grass(c, 0, hSky + 8, W, H - hSky - 8, 3);
    r(c, 0, hSky + 8, W, 2, P.grassHi);
    // path
    pathH(c, W * 0.3, hSky + 8, W * 0.14, H - hSky - 8);
    // trees + flowers
    const rd = rng(21);
    for (let i = 0; i < W / 26; i++) tree(c, (rd() * (W - 18)) | 0, hSky + 10 + (rd() * (H - hSky - 26) | 0), 16);
    for (let i = 0; i < W / 8; i++) flower(c, (rd() * W) | 0, hSky + 12 + (rd() * (H - hSky - 14) | 0), [P.fR, P.fY, P.fP][i % 3]);
  }
  function zone(c, W, H, type) {
    if (type === 'cave') {
      r(c, 0, 0, W, H, P.caveDk);
      const rd = rng(31);
      for (let i = 0; i < W * H / 60; i++) { const x = rd() * W | 0, y = rd() * H | 0; r(c, x, y, 3, 3, rd() < .5 ? P.rockDk : P.cave); }
      for (let i = 0; i < W / 30; i++) { const x = rd() * W | 0, y = rd() * H | 0; r(c, x, y, 10, 8, P.rock); r(c, x, y, 10, 2, P.rockHi); r(c, x, y + 8, 10, 2, P.rockDk); }
      return;
    }
    if (type === 'mountain') {
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#9fb2c9'); g.addColorStop(1, P.mtn); c.fillStyle = g; c.fillRect(0, 0, W, H);
      const rd = rng(41);
      for (let i = 0; i < 5; i++) { const bx = (i * W / 4 - 20) | 0, bh = 60 + rd() * 50; c.fillStyle = P.mtnDk; c.beginPath(); c.moveTo(bx, H); c.lineTo(bx + 50, H - bh); c.lineTo(bx + 100, H); c.fill(); r(c, bx + 42, H - bh, 16, 10, P.snow); }
      grass(c, 0, H - 20, W, 20, 9);
      return;
    }
    if (type === 'forest') {
      grass(c, 0, 0, W, H, 3); r(c, 0, 0, W, H, 'rgba(20,80,30,0.12)');
      const rd = rng(51); for (let i = 0; i < W * H / 220; i++) tree(c, rd() * (W - 18) | 0, rd() * (H - 18) | 0, 16 + (rd() * 6 | 0));
      return;
    }
    if (type === 'city') {
      r(c, 0, 0, W, H, '#9aa3ad'); // pavement
      for (let y = 0; y < H; y += 24) r(c, 0, y, W, 6, '#8089924'.slice(0, 7));
      r(c, W * 0.45, 0, W * 0.1, H, '#7a828c'); // road
      const rd = rng(61); for (let i = 0; i < W / 40; i++) { const x = rd() * (W - 40) | 0, y = rd() * (H - 40) | 0; (i % 2 ? pokemart : house)(c, x, y, 30, 34, i % 3 ? P.roofB : P.roofR); }
      return;
    }
    if (type === 'town') {
      grass(c, 0, 0, W, H, 3);
      pathH(c, 0, H * 0.6, W, 14);
      r(c, W * 0.5 - 7, 0, 14, H, P.path); r(c, W * 0.5 - 7, 0, 1, H, P.pathEdge); r(c, W * 0.5 + 6, 0, 1, H, P.pathEdge);
      house(c, W * 0.12, H * 0.16, 36, 38, P.roofR); house(c, W * 0.64, H * 0.16, 36, 38, P.roofB);
      pokecenter(c, W * 0.16, H * 0.66, 34, 34); pokemart(c, W * 0.62, H * 0.66, 30, 32);
      const rd = rng(71); for (let i = 0; i < 6; i++) tree(c, rd() * (W - 16) | 0, rd() * (H - 16) | 0, 14);
      return;
    }
    // route (default)
    grass(c, 0, 0, W, H, 3);
    pathH(c, 0, H * 0.45, W, 16);
    const rd = rng(81);
    for (let i = 0; i < W / 22; i++) tree(c, rd() * (W - 16) | 0, (rd() < .5 ? rd() * (H * 0.4) : H * 0.62 + rd() * (H * 0.34)) | 0, 16);
    for (let i = 0; i < W / 7; i++) flower(c, rd() * W | 0, rd() * H | 0, [P.fR, P.fY, P.fP][i % 3]);
    // tall-grass patch
    r(c, W * 0.6, H * 0.1, 40, 26, P.grassDk); for (let gx = 0; gx < 40; gx += 4) for (let gy = 0; gy < 26; gy += 4) r(c, W * 0.6 + gx, H * 0.1 + gy + (gx % 8 ? 0 : 2), 3, 4, P.grassEdge);
  }
  // Clean, full-bleed map backdrops — mostly texture so node markers stand out.
  function terrain(c, W, H, type) {
    if (type === 'cave') {
      r(c, 0, 0, W, H, '#2e2838'); const rd = rng(131);
      for (let i = 0; i < W * H / 120; i++) { const x = rd() * W | 0, y = rd() * H | 0; px(c, x, y, rd() < .5 ? '#3a3346' : '#241f2e'); }
      for (let i = 0; i < W / 36; i++) { const x = rd() * W | 0, y = rd() * H | 0; r(c, x, y, 8, 6, '#43394f'); }
      return;
    }
    if (type === 'mountain') {
      r(c, 0, 0, W, H, '#8b7f72'); const rd = rng(137);
      for (let i = 0; i < W * H / 110; i++) { const x = rd() * W | 0, y = rd() * H | 0; px(c, x, y, rd() < .5 ? '#9c9082' : '#766a5e'); }
      for (let i = 0; i < W / 44; i++) { const x = rd() * W | 0, y = rd() * H | 0; r(c, x, y, 6, 4, '#d8d0c4'); }
      return;
    }
    if (type === 'beach') {
      water(c, 0, 0, W, H * 0.32, 5); r(c, 0, H * 0.32, W, 2, P.foam);
      r(c, 0, H * 0.32 + 2, W, H, '#e6cf92'); const rd = rng(139);
      for (let i = 0; i < W * H / 140; i++) { const x = rd() * W | 0, y = (H * 0.4 + rd() * H * 0.6) | 0; px(c, x, y, '#d4ba78'); }
      return;
    }
    if (type === 'forest') {
      grass(c, 0, 0, W, H, 3); r(c, 0, 0, W, H, 'rgba(20,70,30,0.18)');
      const rd = rng(141); for (let i = 0; i < W * H / 1100; i++) tree(c, rd() * (W - 14) | 0, rd() * (H - 14) | 0, 14);
      return;
    }
    if (type === 'route') {
      grass(c, 0, 0, W, H, 3);
      pathH(c, 0, H * 0.46, W, 14); r(c, W * 0.46, 0, 12, H, P.path); r(c, W * 0.46, 0, 1, H, P.pathEdge); r(c, W * 0.46 + 11, 0, 1, H, P.pathEdge);
      const rd = rng(143);
      for (let i = 0; i < 4; i++) tree(c, (i < 2 ? rd() * W * 0.28 : W * 0.72 + rd() * W * 0.24) | 0, rd() * H | 0, 14);
      for (let i = 0; i < W / 14; i++) flower(c, rd() * W | 0, rd() * H | 0, [P.fR, P.fY, P.fP][i % 3]);
      return;
    }
    grass(c, 0, 0, W, H, 3); const rd = rng(145);
    for (let i = 0; i < W / 16; i++) flower(c, rd() * W | 0, rd() * H | 0, [P.fR, P.fY, P.fP][i % 3]);
    for (let i = 0; i < 3; i++) tree(c, rd() * (W - 14) | 0, rd() * (H - 14) | 0, 14);
  }

  function battleBg(c, W, H, type) {
    const top = type === 'cave' ? P.cave : type === 'water' ? P.waterLo : type === 'city' ? '#9aa3ad' : P.skyB;
    r(c, 0, 0, W, H * 0.62, top);
    if (type === 'grass') { sky(c, W, H * 0.62, H * 0.62); }
    if (type === 'water') water(c, 0, 0, W, H * 0.62, 5);
    // ground
    const gy = H * 0.62; r(c, 0, gy, W, H - gy, type === 'cave' ? P.rockDk : type === 'water' ? '#caa86a' : P.grass);
    if (type === 'grass') grass(c, 0, gy, W, H - gy, 3);
    // two oval platforms
    function plat(cx, cy, rw) { c.fillStyle = 'rgba(0,0,0,0.16)'; c.beginPath(); c.ellipse(cx, cy, rw, rw * 0.34, 0, 0, 7); c.fill(); c.fillStyle = type === 'cave' ? P.rock : P.grassDk; c.beginPath(); c.ellipse(cx, cy - 2, rw, rw * 0.34, 0, 0, 7); c.fill(); }
    plat(W * 0.24, H * 0.86, W * 0.18); plat(W * 0.76, H * 0.68, W * 0.16);
  }

  // ---- mode cards (scenes) ---------------------------------------------
  function modeStory(c, W, H) { zone(c, W, H, 'town'); r(c, 0, 0, W, H, 'rgba(0,0,0,0)'); }
  function modeTower(c, W, H) {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.skyT); g.addColorStop(1, P.grass); c.fillStyle = g; c.fillRect(0, 0, W, H);
    grass(c, 0, H * 0.7, W, H * 0.3, 3);
    // tower
    const tw = W * 0.34, tx = (W - tw) / 2;
    for (let i = 0; i < 6; i++) { const yy = H * 0.12 + i * (H * 0.62 / 6); r(c, tx + i, yy, tw - i * 2, H * 0.62 / 6 - 1, i % 2 ? '#b9c6d6' : '#cfdae8'); outline(c, tx + i, yy, tw - i * 2, H * 0.62 / 6 - 1, '#8593a5'); }
    r(c, tx + tw / 2 - 4, H * 0.06, 8, H * 0.08, P.roofB);
  }
  function modeChallenge(c, W, H) {
    // Warm gym interior: wall band on top, subtle tiled floor below.
    r(c, 0, 0, W, H, '#caa86a');
    r(c, 0, 0, W, H * 0.32, '#9a6f3a');
    for (let y = H * 0.32 | 0; y < H; y += 18) for (let x = 0; x < W; x += 18) { r(c, x, y, 17, 17, (x / 18 + y / 18) % 2 ? '#d8b87a' : '#c6a566'); }
    gym(c, W * 0.3, H * 0.22, W * 0.4, H * 0.48);
    // banner with battle mark
    r(c, W * 0.32, H * 0.06, W * 0.36, 12, P.roofRDk); r(c, W * 0.5 - 4, H * 0.07, 8, 8, P.gold);
  }

  // ---- logo -------------------------------------------------------------
  const FONT = {
    P: ['1110', '1001', '1001', '1110', '1000', '1000', '1000'],
    K: ['1001', '1010', '1100', '1100', '1010', '1001', '1001'],
    E: ['1111', '1000', '1000', '1110', '1000', '1000', '1111'],
    L: ['1000', '1000', '1000', '1000', '1000', '1000', '1111'],
    I: ['111', '010', '010', '010', '010', '010', '111'],
  };
  function glyph(c, ch, x, y, s, col, ink) {
    const g = FONT[ch]; if (!g) return (4 * s);
    const w = g[0].length;
    for (let row = 0; row < g.length; row++) for (let col2 = 0; col2 < w; col2++) if (g[row][col2] === '1') {
      r(c, x + col2 * s - 1, y + row * s - 1, s + 1, s + 1, ink); // shadow/outline
    }
    for (let row = 0; row < g.length; row++) for (let col2 = 0; col2 < w; col2++) if (g[row][col2] === '1') r(c, x + col2 * s, y + row * s, s, s, col);
    return w * s + s;
  }
  function ball(c, x, y, d, ink) {
    c.save(); c.beginPath(); c.arc(x + d / 2, y + d / 2, d / 2, 0, 7); c.clip();
    r(c, x, y, d, d / 2, P.roofR); r(c, x, y + d / 2, d, d / 2, P.white);
    c.restore();
    c.strokeStyle = ink; c.lineWidth = Math.max(1, d / 14); c.beginPath(); c.arc(x + d / 2, y + d / 2, d / 2 - 0.5, 0, 7); c.stroke();
    r(c, x, y + d / 2 - d / 14, d, d / 7, ink);
    c.fillStyle = P.white; c.beginPath(); c.arc(x + d / 2, y + d / 2, d / 6, 0, 7); c.fill();
    c.strokeStyle = ink; c.beginPath(); c.arc(x + d / 2, y + d / 2, d / 6, 0, 7); c.stroke();
  }
  function logo(c, W, H) {
    c.clearRect(0, 0, W, H);
    const s = 5, ink = P.ink, col = P.gold, y = 12;
    let x = 6;
    x += glyph(c, 'P', x, y, s, col, ink);
    ball(c, x - 2, y - 2, s * 4 + 4, ink); x += s * 4 + 4;
    x += glyph(c, 'K', x, y, s, col, ink);
    x += glyph(c, 'E', x, y, s, col, ink);
    x += glyph(c, 'L', x, y, s, col, ink);
    x += glyph(c, 'I', x, y, s, col, ink);
    x += glyph(c, 'K', x, y, s, col, ink);
    x += glyph(c, 'E', x, y, s, col, ink);
  }

  // ---- trainers ---------------------------------------------------------
  function trainer(c, W, H, o) {
    c.clearRect(0, 0, W, H);
    const cx = W / 2, ink = P.ink;
    // legs
    r(c, cx - 5, H - 14, 4, 12, P.jeans); r(c, cx + 1, H - 14, 4, 12, P.jeans);
    r(c, cx - 6, H - 4, 6, 4, ink); r(c, cx + 1, H - 4, 6, 4, ink); // shoes
    // body
    r(c, cx - 7, H - 26, 14, 14, o.shirt); outline(c, cx - 7, H - 26, 14, 14, ink);
    // arms
    r(c, cx - 9, H - 24, 3, 10, o.shirt); r(c, cx + 7, H - 24, 3, 10, o.shirt);
    r(c, cx - 9, H - 15, 3, 3, P.skin); r(c, cx + 7, H - 15, 3, 3, P.skin);
    // head
    r(c, cx - 6, H - 38, 12, 12, P.skin); outline(c, cx - 6, H - 38, 12, 12, P.skinDk);
    // eyes
    r(c, cx - 3, H - 32, 2, 2, ink); r(c, cx + 1, H - 32, 2, 2, ink);
    // hair / cap
    if (o.cap) {
      r(c, cx - 7, H - 40, 14, 5, o.cap); r(c, cx - 9, H - 36, 6, 2, o.cap); // brim
      r(c, cx - 6, H - 41, 12, 2, o.cap);
      r(c, cx - 2, H - 39, 4, 2, P.white); // cap front patch
    } else {
      r(c, cx - 7, H - 41, 14, 6, o.hair);
      if (o.long) { r(c, cx - 8, H - 36, 3, 12, o.hair); r(c, cx + 5, H - 36, 3, 12, o.hair); }
      r(c, cx - 7, H - 41, 14, 2, o.hair);
    }
  }

  // ---- icons ------------------------------------------------------------
  function icon(c, W, H, kind) {
    c.clearRect(0, 0, W, H); const m = 4, ink = P.ink;
    const box = () => { r(c, 1, 1, W - 2, H - 2, '#2b2f3a'); outline(c, 1, 1, W - 2, H - 2, ink); };
    box();
    if (kind === 'pokedex') { r(c, m, m, W - 2 * m, H - 2 * m, P.roofR); r(c, m, m, 3, H - 2 * m, P.roofRDk); r(c, W / 2, m + 2, 1, H - 2 * m - 4, P.white); }
    else if (kind === 'achievements') { c.fillStyle = P.gold; c.beginPath(); c.moveTo(W / 2, m); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; c.lineTo(W / 2 + Math.cos(a) * (W / 3), H / 2 + Math.sin(a) * (H / 3)); const a2 = a + Math.PI / 5; c.lineTo(W / 2 + Math.cos(a2) * (W / 7), H / 2 + Math.sin(a2) * (H / 7)); } c.fill(); }
    else if (kind === 'map') { r(c, m, m, W - 2 * m, H - 2 * m, P.grass); r(c, W / 2 - 1, m, 2, H - 2 * m, P.path); r(c, m, H / 2 - 1, W - 2 * m, 2, P.water); }
    else if (kind === 'settings') { c.fillStyle = '#cfd6e0'; c.beginPath(); c.arc(W / 2, H / 2, W / 3, 0, 7); c.fill(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; r(c, W / 2 + Math.cos(a) * (W / 3) - 1, H / 2 + Math.sin(a) * (H / 3) - 1, 3, 3, '#cfd6e0'); } r(c, W / 2 - 2, H / 2 - 2, 4, 4, '#2b2f3a'); }
    else if (kind === 'pokemart') { r(c, m, H / 2, W - 2 * m, H / 2 - m, P.roofB); r(c, m, m + 2, W - 2 * m, 3, P.gold); r(c, m + 2, H / 2 + 2, 3, 3, P.white); }
    else if (kind === 'reset') { c.strokeStyle = P.gold; c.lineWidth = 3; c.beginPath(); c.arc(W / 2, H / 2, W / 4, 0.6, 6); c.stroke(); r(c, W / 2 + 4, m + 2, 4, 4, P.gold); }
    else if (kind === 'exit') { r(c, m, m, W / 2 - m, H - 2 * m, '#7a4a1e'); r(c, W / 2 - 2, H / 2 - 1, 3, 3, P.gold); r(c, W / 2 + 1, m, W / 2 - m, H - 2 * m, '#5a3514'); }
    else if (kind === 'lock') { r(c, W / 2 - 5, H / 2 - 1, 10, 8, P.gold); outline(c, W / 2 - 5, H / 2 - 1, 10, 8, ink); c.strokeStyle = '#cfd6e0'; c.lineWidth = 2; c.beginPath(); c.arc(W / 2, H / 2 - 1, 4, Math.PI, 0); c.stroke(); r(c, W / 2 - 1, H / 2 + 2, 2, 3, ink); }
    else if (kind === 'grass') { r(c, m, m, W - 2 * m, H - 2 * m, P.grass); for (let gx = m; gx < W - m; gx += 4) { r(c, gx, H - m - 6, 2, 6, P.grassEdge); r(c, gx + 1, H - m - 9, 1, 3, P.grassDk); } }
    else if (kind === 'party') { const d = (W - 2 * m) / 2 - 2; for (let i = 0; i < 4; i++) { const bx = m + (i % 2) * ((W - 2 * m) / 2), by = m + ((i / 2 | 0)) * ((H - 2 * m) / 2); r(c, bx, by, d, d / 2, P.roofR); r(c, bx, by + d / 2, d, d / 2, P.white); outline(c, bx, by, d, d, ink); r(c, bx, by + d / 2 - 1, d, 1, ink); } }
  }

  function tmDisk(c, W, H) {
    c.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 2;
    c.fillStyle = '#2bb3c0'; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
    c.fillStyle = '#7fe3ec'; c.beginPath(); c.arc(cx, cy, R * 0.62, 0, 7); c.fill();
    c.strokeStyle = P.ink; c.beginPath(); c.arc(cx, cy, R * 0.62, 0, 7); c.stroke();
    c.fillStyle = P.ink; c.beginPath(); c.arc(cx, cy, R * 0.18, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(cx - R * 0.32, cy - R * 0.32, R * 0.12, 0, 7); c.fill();
  }

  // ---- registry ---------------------------------------------------------
  window.ART = {
    assets: [
      { file: 'img/background.png', w: 256, h: 176, draw: (c) => overworld(c, 256, 176) },
      { file: 'img/regions/kanto.png', w: 256, h: 176, draw: (c) => overworld(c, 256, 176) },
      { file: 'img/regions/johto.png', w: 256, h: 176, draw: (c) => zone(c, 256, 176, 'mountain') },
      { file: 'img/zones/town.png', w: 240, h: 200, draw: (c) => zone(c, 240, 200, 'town') },
      { file: 'img/zones/route.png', w: 240, h: 200, draw: (c) => zone(c, 240, 200, 'route') },
      { file: 'img/zones/forest.png', w: 240, h: 200, draw: (c) => zone(c, 240, 200, 'forest') },
      { file: 'img/zones/cave.png', w: 240, h: 200, draw: (c) => zone(c, 240, 200, 'cave') },
      { file: 'img/zones/mountain.png', w: 240, h: 200, draw: (c) => zone(c, 240, 200, 'mountain') },
      { file: 'img/zones/city.png', w: 240, h: 200, draw: (c) => zone(c, 240, 200, 'city') },
      { file: 'img/terrain/grass.png', w: 240, h: 200, draw: (c) => terrain(c, 240, 200, 'grass') },
      { file: 'img/terrain/route.png', w: 240, h: 200, draw: (c) => terrain(c, 240, 200, 'route') },
      { file: 'img/terrain/forest.png', w: 240, h: 200, draw: (c) => terrain(c, 240, 200, 'forest') },
      { file: 'img/terrain/cave.png', w: 240, h: 200, draw: (c) => terrain(c, 240, 200, 'cave') },
      { file: 'img/terrain/mountain.png', w: 240, h: 200, draw: (c) => terrain(c, 240, 200, 'mountain') },
      { file: 'img/terrain/beach.png', w: 240, h: 200, draw: (c) => terrain(c, 240, 200, 'beach') },
      { file: 'img/battle/grass.png', w: 256, h: 144, draw: (c) => battleBg(c, 256, 144, 'grass') },
      { file: 'img/battle/cave.png', w: 256, h: 144, draw: (c) => battleBg(c, 256, 144, 'cave') },
      { file: 'img/battle/water.png', w: 256, h: 144, draw: (c) => battleBg(c, 256, 144, 'water') },
      { file: 'img/battle/city.png', w: 256, h: 144, draw: (c) => battleBg(c, 256, 144, 'city') },
      { file: 'img/modeImages/story-mode.png', w: 200, h: 200, draw: (c) => modeStory(c, 200, 200) },
      { file: 'img/modeImages/battle-tower.png', w: 200, h: 200, draw: (c) => modeTower(c, 200, 200) },
      { file: 'img/modeImages/challenges.png', w: 200, h: 200, draw: (c) => modeChallenge(c, 200, 200) },
      { file: 'img/logo.png', w: 210, h: 60, draw: (c) => logo(c, 210, 60) },
      { file: 'img/sprites/pokecenter.png', w: 56, h: 56, draw: (c) => { c.clearRect(0, 0, 56, 56); pokecenter(c, 6, 8, 44, 44); } },
      { file: 'img/sprites/pokemart.png', w: 56, h: 56, draw: (c) => { c.clearRect(0, 0, 56, 56); pokemart(c, 8, 10, 40, 42); } },
      { file: 'img/sprites/gym.png', w: 56, h: 56, draw: (c) => { c.clearRect(0, 0, 56, 56); gym(c, 6, 8, 44, 46); } },
      { file: 'img/sprites/grass-encounter.png', w: 48, h: 48, draw: (c) => { c.clearRect(0, 0, 48, 48); for (let gx = 4; gx < 44; gx += 5) { r(c, gx, 30, 3, 14, P.grassDk); r(c, gx + 1, 26, 2, 8, P.grass); } } },
      { file: 'img/sprites/tm.png', w: 40, h: 40, draw: (c) => tmDisk(c, 40, 40) },
      { file: 'img/menu/party.png', w: 28, h: 28, draw: (c) => icon(c, 28, 28, 'party') },
      { file: 'img/sprites/lock.png', w: 28, h: 28, draw: (c) => icon(c, 28, 28, 'lock') },
      { file: 'img/trainers/boy.png', w: 48, h: 56, draw: (c) => trainer(c, 48, 56, { cap: P.capR, shirt: P.shirt }) },
      { file: 'img/trainers/girl.png', w: 48, h: 56, draw: (c) => trainer(c, 48, 56, { hair: P.hair, long: true, shirt: P.shirtR }) },
      { file: 'img/trainers/leader-1.png', w: 48, h: 56, draw: (c) => trainer(c, 48, 56, { hair: P.hairBlk, shirt: P.shirtG }) },
      { file: 'img/trainers/leader-2.png', w: 48, h: 56, draw: (c) => trainer(c, 48, 56, { hair: P.hairBlond, long: true, shirt: P.shirtP }) },
      { file: 'img/trainers/leader-3.png', w: 48, h: 56, draw: (c) => trainer(c, 48, 56, { cap: P.capB, shirt: P.shirtR }) },
      { file: 'img/trainers/leader-4.png', w: 48, h: 56, draw: (c) => trainer(c, 48, 56, { hair: P.hair, shirt: P.shirtG }) },
      { file: 'img/trainers/leader-5.png', w: 48, h: 56, draw: (c) => trainer(c, 48, 56, { hair: P.hairBlk, long: true, shirt: P.shirt }) },
      { file: 'img/trainers/leader-6.png', w: 48, h: 56, draw: (c) => trainer(c, 48, 56, { cap: P.roofGDk, shirt: P.shirtP }) },
      { file: 'img/trainers/champion.png', w: 48, h: 56, draw: (c) => trainer(c, 48, 56, { hair: P.hairBlond, shirt: P.gold }) },
      { file: 'img/menu/pokedex.png', w: 28, h: 28, draw: (c) => icon(c, 28, 28, 'pokedex') },
      { file: 'img/menu/achievements.png', w: 28, h: 28, draw: (c) => icon(c, 28, 28, 'achievements') },
      { file: 'img/menu/map.png', w: 28, h: 28, draw: (c) => icon(c, 28, 28, 'map') },
      { file: 'img/menu/settings.png', w: 28, h: 28, draw: (c) => icon(c, 28, 28, 'settings') },
      { file: 'img/menu/pokemart.png', w: 28, h: 28, draw: (c) => icon(c, 28, 28, 'pokemart') },
      { file: 'img/menu/reset.png', w: 28, h: 28, draw: (c) => icon(c, 28, 28, 'reset') },
      { file: 'img/menu/exit.png', w: 28, h: 28, draw: (c) => icon(c, 28, 28, 'exit') },
    ],
  };
})();
