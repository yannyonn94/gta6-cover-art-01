// Neon Sunset Cover Studio — the cover engine.
// Draws a GTA-style multi-panel cover on a 2D canvas: six layouts, five colour
// grades, bold Anton title lettering with a neon Pacifico subtitle, film grain
// and a vignette. Everything is drawn from the caller's state; no network, no
// Rockstar art, logos or fonts.

// ---------------------------------------------------------------- layouts
// A layout is a function of (W, H) returning panel rects (absolute pixels) and
// a title rect where the caption block lives.
export const LAYOUTS = {
  grid: {
    name: 'Four Panel',
    describe(W, H) {
      const gap = W * 0.012;
      const titleH = H * 0.2;
      const top = H - titleH;
      const cw = (W - gap * 3) / 2;
      const ch = (top - gap * 3) / 2;
      return {
        panels: [
          { x: gap, y: gap, w: cw, h: ch },
          { x: gap * 2 + cw, y: gap, w: cw, h: ch },
          { x: gap, y: gap * 2 + ch, w: cw, h: ch },
          { x: gap * 2 + cw, y: gap * 2 + ch, w: cw, h: ch },
        ],
        title: { x: 0, y: top, w: W, h: titleH },
      };
    },
  },
  hero: {
    name: 'Hero + Three',
    describe(W, H) {
      const gap = W * 0.012;
      const titleH = H * 0.18;
      const top = H - titleH;
      const heroH = top * 0.58;
      const rowH = top - heroH - gap * 3;
      const cw = (W - gap * 4) / 3;
      return {
        panels: [
          { x: gap, y: gap, w: W - gap * 2, h: heroH },
          { x: gap, y: heroH + gap * 2, w: cw, h: rowH },
          { x: gap * 2 + cw, y: heroH + gap * 2, w: cw, h: rowH },
          { x: gap * 3 + cw * 2, y: heroH + gap * 2, w: cw, h: rowH },
        ],
        title: { x: 0, y: top, w: W, h: titleH },
      };
    },
  },
  full: {
    name: 'Full Bleed',
    describe(W, H) {
      return {
        panels: [{ x: 0, y: 0, w: W, h: H }],
        title: { x: 0, y: H * 0.72, w: W, h: H * 0.28 },
      };
    },
  },
  nine: {
    name: 'Nine Panel',
    describe(W, H) {
      const gap = W * 0.01;
      const titleH = H * 0.18;
      const top = H - titleH;
      const cw = (W - gap * 4) / 3;
      const ch = (top - gap * 4) / 3;
      const panels = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          panels.push({ x: gap * (c + 1) + cw * c, y: gap * (r + 1) + ch * r, w: cw, h: ch });
        }
      }
      return { panels, title: { x: 0, y: top, w: W, h: titleH } };
    },
  },
  tilt: {
    name: 'Tilted Snapshots',
    describe(W, H) {
      const titleH = H * 0.22;
      const top = H - titleH;
      const pw = W * 0.34;
      const ph = top * 0.82;
      return {
        panels: [
          { x: W * 0.06, y: top * 0.06, w: pw, h: ph, rot: -0.07, snap: true },
          { x: W * 0.33, y: top * 0.1, w: pw, h: ph, rot: 0.045, snap: true },
          { x: W * 0.6, y: top * 0.05, w: pw, h: ph, rot: -0.03, snap: true },
        ],
        title: { x: 0, y: top, w: W, h: titleH },
      };
    },
  },
  duo: {
    name: 'Split Duo',
    describe(W, H) {
      const gap = W * 0.012;
      const titleH = H * 0.2;
      const top = H - titleH;
      const cw = (W - gap * 3) / 2;
      return {
        panels: [
          { x: gap, y: gap, w: cw, h: top - gap * 2 },
          { x: gap * 2 + cw, y: gap, w: cw, h: top - gap * 2 },
        ],
        title: { x: 0, y: top, w: W, h: titleH },
      };
    },
  },
};

// ---------------------------------------------------------------- grades
// A grade is a colour treatment: a vertical gradient washed over the photo with
// an overlay blend, a faint tint, a canvas filter for the photo, and an accent
// colour for the subtitle.
export const GRADES = {
  sunset: {
    name: 'Sunset',
    top: '#ff7a3d', bottom: '#c2187a', tint: 'rgba(255,110,60,0.10)',
    filter: 'saturate(1.25) contrast(1.06)', accent: '#ffd166',
  },
  neon: {
    name: 'Neon Night',
    top: '#ff2e88', bottom: '#00e5ff', tint: 'rgba(255,46,136,0.12)',
    filter: 'saturate(1.45) contrast(1.12)', accent: '#00e5ff',
  },
  gold: {
    name: 'Vice Gold',
    top: '#ffb703', bottom: '#fb8500', tint: 'rgba(255,183,3,0.10)',
    filter: 'saturate(1.3) contrast(1.06)', accent: '#fff3b0',
  },
  noir: {
    name: 'Mono Noir',
    top: '#ffffff', bottom: '#111111', tint: 'rgba(0,0,0,0.08)',
    filter: 'grayscale(1) contrast(1.28) brightness(1.06)', accent: '#ffffff',
  },
  teal: {
    name: 'Palm Teal',
    top: '#06d6a0', bottom: '#118ab2', tint: 'rgba(6,214,160,0.10)',
    filter: 'saturate(1.3) contrast(1.06)', accent: '#90e0ef',
  },
};

// ---------------------------------------------------------------- helpers
function hexToRgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Draws one photo cover-fit inside a rect, with a zoom factor and pan offset.
 *  The pan is clamped so the photo can never be dragged out of its panel: at
 *  most half the overhang in each direction (zero when the photo just fits). */
function drawPanelPhoto(ctx, photo, rect, zoom, dx, dy, filter) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (!photo) {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    g.addColorStop(0, '#3a2340');
    g.addColorStop(1, '#171021');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    return;
  }
  const base = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight);
  const scale = base * (zoom || 1);
  const pw = photo.naturalWidth * scale;
  const ph = photo.naturalHeight * scale;
  const maxDx = Math.max(0, (pw - rect.w) / (2 * rect.w));
  const maxDy = Math.max(0, (ph - rect.h) / (2 * rect.h));
  const clDx = Math.max(-maxDx, Math.min(maxDx, dx || 0));
  const clDy = Math.max(-maxDy, Math.min(maxDy, dy || 0));
  const cx = rect.x + rect.w / 2 + clDx * rect.w;
  const cy = rect.y + rect.h / 2 + clDy * rect.h;
  ctx.filter = filter || 'none';
  ctx.drawImage(photo, cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.filter = 'none';
  ctx.restore();
}

/** Washes a grade over a rect: an overlay gradient plus a faint tint. */
function washGrade(ctx, rect, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, hexToRgba(grade.top, 0.34));
  g.addColorStop(1, hexToRgba(grade.bottom, 0.42));
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = grade.tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** A small random-noise canvas, used as the grain pattern for one draw. */
function makeGrainTile() {
  const t = document.createElement('canvas');
  t.width = 140;
  t.height = 140;
  const c = t.getContext('2d');
  const data = c.createImageData(140, 140);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 100 + Math.floor(Math.random() * 80);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  c.putImageData(data, 0, 0);
  return t;
}

function fitFont(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

// ---------------------------------------------------------------- the cover
/**
 * Draws the whole cover.
 * `state`: { layout, grade, title, subtitle, panels: [{ photo, zoom, dx, dy }],
 *            grain: boolean, vignette: boolean }
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const layout = LAYOUTS[state.layout] || LAYOUTS.grid;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const { panels, title } = layout.describe(W, H);

  ctx.fillStyle = '#120a18';
  ctx.fillRect(0, 0, W, H);

  const grainTile = state.grain === false ? null : makeGrainTile();

  panels.forEach((panel, i) => {
    const p = state.panels[i] || {};
    const r = { x: panel.x, y: panel.y, w: panel.w, h: panel.h };
    ctx.save();
    if (panel.rot) {
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.rotate(panel.rot);
      ctx.translate(-r.w / 2, -r.h / 2);
      r.x = 0;
      r.y = 0;
    }
    if (panel.snap) {
      // Polaroid-style white border and a soft drop shadow.
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = Math.max(8, W * 0.02);
      ctx.shadowOffsetY = Math.max(4, H * 0.008);
      ctx.fillStyle = '#f8f4ec';
      ctx.fillRect(r.x - W * 0.008, r.y - H * 0.008, r.w + W * 0.016, r.h + H * 0.016);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
    drawPanelPhoto(ctx, p.photo || null, r, p.zoom || 1, p.dx || 0, p.dy || 0, grade.filter);
    washGrade(ctx, r, grade);
    // Thin white frame around each panel (poster gutters).
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, W * 0.002);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.restore();
  });

  // Title band: a dark gradient so the lettering reads on any photo.
  const band = ctx.createLinearGradient(0, title.y, 0, title.y + title.h);
  band.addColorStop(0, 'rgba(10,6,16,0)');
  band.addColorStop(0.45, 'rgba(10,6,16,0.62)');
  band.addColorStop(1, 'rgba(10,6,16,0.85)');
  ctx.fillStyle = band;
  ctx.fillRect(title.x, title.y, title.w, title.h);

  const titleText = (state.title || '').trim().toUpperCase();
  const subText = (state.subtitle || '').trim();
  const midX = title.x + title.w / 2;
  if (titleText) {
    const size = fitFont(ctx, titleText, title.w * 0.92, title.h * 0.52, 'Anton, sans-serif');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = size * 0.16;
    const ty = title.y + title.h * (subText ? 0.38 : 0.52);
    ctx.strokeText(titleText, midX, ty);
    ctx.fillText(titleText, midX, ty);
    ctx.shadowBlur = 0;
  }
  if (subText) {
    const size = fitFont(ctx, subText, title.w * 0.8, title.h * 0.26, 'Pacifico, cursive');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = grade.accent;
    ctx.shadowColor = grade.accent;
    ctx.shadowBlur = size * 0.5;
    ctx.font = `${size}px Pacifico, cursive`;
    ctx.fillText(subText, midX, title.y + title.h * 0.76);
    ctx.shadowBlur = 0;
  }

  // Grain, then vignette.
  if (grainTile) {
    const pattern = ctx.createPattern(grainTile, 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (state.vignette !== false) {
    const v = ctx.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * 0.42,
      W / 2, H / 2, Math.max(W, H) * 0.75,
    );
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }
}

/** The export sizes the app offers (post sizes). */
export const EXPORT_SIZES = [
  { id: '1080x1080', label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: 'Landscape 1920 x 1080', w: 1920, h: 1080 },
];

/** One-tap caption pairs: [title, subtitle]. */
export const CAPTION_PAIRS = [
  ['Sunset Heist', 'neon nights'],
  ['Boulevard Queen', 'vice city'],
  ['Pier Pressure', 'golden hour'],
  ['Neon Getaway', 'leonida'],
  ['Palm Paradise', 'vice city'],
  ['Vice City Nights', 'grand theft auto vi'],
];
