// The cover renderer: layouts, grades and the poster drawing itself.
// Everything is drawn from a plain state object, so the preview canvas and the
// full-resolution export canvas share exactly the same code path.
//
// state = {
//   layout: 'grid' | 'hero' | 'full',
//   grade: 'sunset' | 'neon' | 'noir' | 'palm',
//   title: string, subtitle: string,
//   panels: [{ img: HTMLImageElement | null, ox: number, oy: number, zoom: number }]
// }
// Panel offsets (ox, oy) are fractions of the panel's own width and height, so a
// pan survives a change of export size; zoom is a multiplier on the cover-fit
// scale (1 = just fills the panel).

export const LAYOUTS = {
  grid: { name: 'Grid 2×2', panels: 4 },
  hero: { name: 'Hero + 3', panels: 4 },
  full: { name: 'Full bleed', panels: 1 },
};

export const GRADES = {
  sunset: { name: 'Sunset', accent: '#ffb347' },
  neon: { name: 'Neon Vice', accent: '#ff2e9a' },
  noir: { name: 'Noir', accent: '#e8e8e8' },
  palm: { name: 'Palm', accent: '#2ee6c8' },
};

/** Panel rectangles for a layout, in canvas pixels. Gutters are cream poster lines. */
export function panelsFor(layout, W, H) {
  const g = Math.max(2, Math.round(W * 0.006)); // gutter / outer margin
  const m = g;
  if (layout === 'full') {
    return [{ x: m, y: m, w: W - 2 * m, h: H - 2 * m }];
  }
  if (layout === 'hero') {
    const availH = H - 2 * m - g;
    const heroH = Math.round(availH * 0.62);
    const rowY = m + heroH + g;
    const rowH = H - m - rowY;
    const pw = Math.round((W - 2 * m - 2 * g) / 3);
    return [
      { x: m, y: m, w: W - 2 * m, h: heroH },
      { x: m, y: rowY, w: pw, h: rowH },
      { x: m + pw + g, y: rowY, w: pw, h: rowH },
      { x: m + 2 * (pw + g), y: rowY, w: W - m - (m + 2 * (pw + g)), h: rowH },
    ];
  }
  // grid 2x2
  const pw = Math.round((W - 2 * m - g) / 2);
  const ph = Math.round((H - 2 * m - g) / 2);
  return [
    { x: m, y: m, w: pw, h: ph },
    { x: m + pw + g, y: m, w: W - m - (m + pw + g), h: ph },
    { x: m, y: m + ph + g, w: pw, h: H - m - (m + ph + g) },
    { x: m + pw + g, y: m + ph + g, w: W - m - (m + pw + g), h: H - m - (m + ph + g) },
  ];
}

/** Draws one photo cover-fit into a panel rect, with the panel's pan/zoom. */
function drawPhoto(ctx, img, rect, panel, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (!img) {
    // Empty slot: a deep gradient so the panel still reads as poster art.
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#3b1d5e');
    grad.addColorStop(0.55, '#1c0f33');
    grad.addColorStop(1, '#12081f');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `700 ${Math.max(14, Math.round(w * 0.05))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('+ add a photo', x + w / 2, y + h / 2);
    ctx.restore();
    return;
  }
  if (grade === 'noir') ctx.filter = 'grayscale(1) contrast(1.12) brightness(1.04)';
  const base = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const scale = base * (panel.zoom || 1);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  // Pan is clamped so the photo can never be dragged out of its panel: at most
  // half the overhang in each direction (zero when the photo just fits).
  const maxOx = Math.max(0, (dw - w) / (2 * w));
  const maxOy = Math.max(0, (dh - h) / (2 * h));
  const ox = Math.max(-maxOx, Math.min(maxOx, panel.ox || 0));
  const oy = Math.max(-maxOy, Math.min(maxOy, panel.oy || 0));
  const dx = x + (w - dw) / 2 + ox * w;
  const dy = y + (h - dh) / 2 + oy * h;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

/** The colour grade: full-canvas overlays drawn after the photos. */
function gradeOverlay(ctx, grade, W, H) {
  let grad;
  if (grade === 'sunset') {
    grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(255,140,60,0)');
    grad.addColorStop(0.55, 'rgba(255,110,60,0.10)');
    grad.addColorStop(1, 'rgba(200,40,120,0.30)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else if (grade === 'neon') {
    grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, 'rgba(255,0,140,0.20)');
    grad.addColorStop(0.55, 'rgba(120,0,180,0.08)');
    grad.addColorStop(1, 'rgba(0,210,255,0.18)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else if (grade === 'noir') {
    grad = ctx.createLinearGradient(0, 0, 0, H * 0.25);
    grad.addColorStop(0, 'rgba(255,255,255,0.07)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H * 0.25);
  } else {
    // palm: teal top, warm gold bottom
    grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(0,190,170,0.16)');
    grad.addColorStop(0.6, 'rgba(0,190,170,0.04)');
    grad.addColorStop(1, 'rgba(255,200,90,0.14)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }
  // Vignette on every grade: darkens the edges, pulls the eye to the middle.
  const vig = ctx.createRadialGradient(
    W / 2, H * 0.45, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, grade === 'noir' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

/** Fits a display font size so the text spans at most maxW. */
function fitSize(ctx, text, maxW, start, family) {
  let size = start;
  ctx.font = `${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

/** Draws the cover: photos in their panels, the grade, then the title block. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = GRADES[state.grade] ? state.grade : 'sunset';
  const accent = GRADES[grade].accent;

  ctx.fillStyle = '#14081f';
  ctx.fillRect(0, 0, W, H);

  const rects = panelsFor(state.layout, W, H);
  rects.forEach((rect, i) => {
    const panel = state.panels[i] || { img: null, ox: 0, oy: 0, zoom: 1 };
    drawPhoto(ctx, panel.img, rect, panel, grade);
  });
  gradeOverlay(ctx, grade, W, H);

  // Cream poster lines: panel separators and the outer frame.
  const line = Math.max(2, Math.round(W * 0.004));
  ctx.strokeStyle = 'rgba(255,244,230,0.9)';
  ctx.lineWidth = line;
  rects.forEach((r) => ctx.strokeRect(r.x, r.y, r.w, r.h));
  ctx.strokeRect(line / 2, line / 2, W - line, H - line);

  // Title block: dark scrim at the foot, title, accent rule, subtitle.
  const scrim = ctx.createLinearGradient(0, H * 0.62, 0, H);
  scrim.addColorStop(0, 'rgba(8,2,14,0)');
  scrim.addColorStop(1, 'rgba(8,2,14,0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H * 0.62, W, H * 0.38);

  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  const family = "Anton, 'Arial Black', 'Archivo Black', system-ui, sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (title) {
    // Fit to the width, then cap by height so a wide canvas never gets a
    // title that swallows the panels below it.
    let size = fitSize(ctx, title, W * 0.92, Math.round(W * 0.11), family);
    size = Math.min(size, Math.round(H * 0.15));
    const ty = H - H * 0.085;
    ctx.font = `${size}px ${family}`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(16,4,28,0.9)';
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.18;
    ctx.shadowOffsetY = size * 0.04;
    ctx.strokeText(title, W / 2, ty);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, W / 2, ty);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    // Accent rule above the subtitle, in the grade's colour.
    const ruleW = Math.min(W * 0.34, ctx.measureText(title).width * 0.5);
    const ruleY = H - H * 0.055;
    const ruleGrad = ctx.createLinearGradient(W / 2 - ruleW / 2, 0, W / 2 + ruleW / 2, 0);
    ruleGrad.addColorStop(0, accent + '00');
    ruleGrad.addColorStop(0.5, accent);
    ruleGrad.addColorStop(1, accent + '00');
    ctx.fillStyle = ruleGrad;
    ctx.fillRect(W / 2 - ruleW / 2, ruleY, ruleW, Math.max(3, H * 0.005));
  }
  if (subtitle) {
    const subSize = Math.max(14, Math.round(W * 0.032));
    ctx.font = `700 ${subSize}px system-ui, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.35)}px`; } catch { /* older canvas: no letter spacing */ }
    ctx.fillStyle = accent;
    ctx.fillText(subtitle, W / 2, H - H * 0.018);
    try { ctx.letterSpacing = '0px'; } catch { /* reset */ }
  }
}
