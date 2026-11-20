// Neon Sunset's cover painter: draws the multi-panel cover onto any canvas.
// A cover is a set of photo panels in a layout, a sunset grade washed over
// them, and a bold headline + script subtitle title block at the foot.
// Every size is drawn from the same code, so the preview and the PNG export
// are the same picture at different resolutions.

/** Unit-space panel maps. Each rect is [x, y, w, h] in fractions of the cover. */
export const LAYOUTS = {
  quad: [
    [0, 0, 0.5, 0.42], [0.5, 0, 0.5, 0.42],
    [0, 0.42, 0.5, 0.42], [0.5, 0.42, 0.5, 0.42],
  ],
  hero: [
    [0, 0, 0.62, 0.84], [0.62, 0, 0.38, 0.28],
    [0.62, 0.28, 0.38, 0.28], [0.62, 0.56, 0.38, 0.28],
  ],
  stack: [
    [0, 0, 1, 0.30], [0, 0.30, 0.5, 0.27], [0.5, 0.30, 0.5, 0.27],
    [0, 0.57, 1, 0.27],
  ],
  single: [[0, 0, 1, 0.84]],
};

/** How many panels each layout shows. */
export function panelCount(layout) {
  return (LAYOUTS[layout] ?? LAYOUTS.quad).length;
}

/** The grade recipes: sky wash, foot wash, edge vignette and lettering ink. */
export const GRADES = {
  sunset: {
    sky: ['rgba(255, 122, 61, 0.30)', 'rgba(255, 46, 154, 0.10)'],
    foot: ['rgba(255, 46, 154, 0.00)', 'rgba(90, 10, 70, 0.55)'],
    vignette: 'rgba(40, 8, 40, 0.42)',
    ink: '#ffffff', accent: '#ffb347', outline: '#ff2e9a',
  },
  neon: {
    sky: ['rgba(0, 229, 255, 0.26)', 'rgba(255, 46, 154, 0.22)'],
    foot: ['rgba(123, 47, 247, 0.00)', 'rgba(20, 4, 60, 0.60)'],
    vignette: 'rgba(6, 4, 40, 0.46)',
    ink: '#ffffff', accent: '#00e5ff', outline: '#ff2e9a',
  },
  vice: {
    sky: ['rgba(139, 47, 224, 0.32)', 'rgba(255, 120, 200, 0.14)'],
    foot: ['rgba(139, 47, 224, 0.00)', 'rgba(30, 4, 60, 0.62)'],
    vignette: 'rgba(28, 4, 52, 0.48)',
    ink: '#ffffff', accent: '#e9a7ff', outline: '#7b2ff7',
  },
  mono: {
    sky: ['rgba(200, 205, 215, 0.18)', 'rgba(30, 34, 44, 0.20)'],
    foot: ['rgba(30, 34, 44, 0.00)', 'rgba(8, 10, 16, 0.66)'],
    vignette: 'rgba(5, 6, 10, 0.50)',
    ink: '#f2f2f2', accent: '#c8cdd7', outline: '#22262e',
  },
};

/** A tiny deterministic random stream, so the grain looks the same every draw. */
export function seededRandom(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Paints one photo into a panel rect, honouring its zoom and pan.
 * `slot` is { img, zoom, dx, dy } — zoom 1..2.6, dx/dy in -1..1.
 */
export function paintPhoto(ctx, slot, rx, ry, rw, rh) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();
  if (!slot || !slot.img) {
    const g = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
    g.addColorStop(0, '#3a1c5e');
    g.addColorStop(1, '#160a24');
    ctx.fillStyle = g;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = Math.max(2, rw * 0.006);
    ctx.beginPath();
    ctx.moveTo(rx + rw * 0.2, ry + rh * 0.75);
    ctx.lineTo(rx + rw * 0.45, ry + rh * 0.35);
    ctx.lineTo(rx + rw * 0.62, ry + rh * 0.6);
    ctx.lineTo(rx + rw * 0.85, ry + rh * 0.3);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const img = slot.img;
  const zoom = slot.zoom ?? 1;
  const base = Math.max(rw / img.naturalWidth, rh / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * base;
  const ph = img.naturalHeight * base;
  const maxShiftX = Math.max(0, (pw - rw) / 2);
  const shiftX = Math.max(-maxShiftX, Math.min(maxShiftX, (slot.dx ?? 0) * rw * 0.28));
  const cx = rx + rw / 2 + shiftX;
  // Faces sit in the top half of a photo, so a wide panel's crop leans to
  // the top: shift the photo down by part of the vertical overhang, so the
  // panel shows the head instead of the middle of the torso. The shift is
  // clamped so the photo can never be panned out of its own panel.
  const topBias = Math.max(0, ph - rh) * 0.3;
  const maxShift = Math.max(0, (ph - rh) / 2);
  const shift = Math.max(-maxShift, Math.min(maxShift, (slot.dy ?? 0) * rh * 0.28 + topBias));
  const cy = ry + rh / 2 + shift;
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.restore();
}

/** Washes a grade over the whole cover and darkens the corners. */
export function washGrade(ctx, grade, w, h) {
  // Golden Hour gets a soft warm glow high in the frame, like low sun
  // just out of shot — a wash, never a disc, so it cannot land on a face.
  if (grade === GRADES.sunset) {
    const glow = ctx.createRadialGradient(w * 0.5, -h * 0.08, 0, w * 0.5, -h * 0.08, Math.max(w, h) * 0.7);
    glow.addColorStop(0, 'rgba(255, 190, 90, 0.20)');
    glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }
  const top = ctx.createLinearGradient(0, 0, 0, h * 0.62);
  top.addColorStop(0, grade.sky[0]);
  top.addColorStop(1, grade.sky[1]);
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, h);
  const foot = ctx.createLinearGradient(0, h * 0.45, 0, h);
  foot.addColorStop(0, grade.foot[0]);
  foot.addColorStop(1, grade.foot[1]);
  ctx.fillStyle = foot;
  ctx.fillRect(0, 0, w, h);
  const vig = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, grade.vignette);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

/** Sprinkles film grain over the cover, seeded so it never flickers. */
export function sprinkleGrain(ctx, w, h, seed) {
  const rnd = seededRandom(seed);
  const dots = Math.floor((w * h) / 2600);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < dots; i++) {
    const d = 1 + rnd() * 2;
    ctx.fillRect(rnd() * w, rnd() * h, d, d);
  }
  ctx.restore();
}

/**
 * Fits text to a width by shrinking the font, then draws it centred.
 * Returns the size actually used.
 */
export function fitText(ctx, text, maxWidth, startSize, fontFor) {
  let size = startSize;
  ctx.font = fontFor(size);
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = fontFor(size);
  }
  return size;
}

/** The title block: a band, the Anton headline, the Pacifico subtitle. */
export function paintTitleBlock(ctx, opts, w, h) {
  const { headline, subtitle, grade, scale } = opts;
  const bandTop = h * 0.84;
  const band = ctx.createLinearGradient(0, bandTop, 0, h);
  band.addColorStop(0, 'rgba(12, 4, 26, 0)');
  band.addColorStop(0.35, 'rgba(12, 4, 26, 0.82)');
  band.addColorStop(1, 'rgba(12, 4, 26, 0.96)');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandTop, w, h - bandTop);

  // A thin neon rule above the headline.
  ctx.fillStyle = grade.accent;
  ctx.fillRect(w * 0.06, bandTop + h * 0.018, w * 0.16, Math.max(3, h * 0.004));

  const head = (headline || 'NEON SUNSET').trim().toUpperCase() || 'NEON SUNSET';
  const headSize = fitText(
    ctx, head, w * 0.88, h * 0.085 * scale,
    (s) => `${s}px Anton, 'Arial Black', sans-serif`,
  );
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = Math.max(2, headSize * 0.07);
  ctx.strokeStyle = grade.outline;
  ctx.fillStyle = grade.ink;
  ctx.shadowColor = grade.outline;
  ctx.shadowBlur = headSize * 0.22;
  const headY = bandTop + h * 0.085 * scale + h * 0.012;
  ctx.strokeText(head, w * 0.06, headY);
  ctx.fillText(head, w * 0.06, headY);
  ctx.shadowBlur = 0;

  const sub = (subtitle || '').trim();
  if (sub) {
    const subSize = fitText(
      ctx, sub, w * 0.7, h * 0.038 * scale,
      (s) => `${s}px Pacifico, cursive`,
    );
    ctx.fillStyle = grade.accent;
    ctx.fillText(sub, w * 0.065, headY + subSize * 1.15);
  }
}

/**
 * Draws the whole cover. `state` carries layout, grade name, slots (one per
 * panel), headline, subtitle and title scale; `seed` fixes the grain.
 */
export function paintCover(canvas, state, seed = 7) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const rects = LAYOUTS[state.layout] ?? LAYOUTS.quad;
  const gap = Math.max(4, Math.round(w * 0.008));

  ctx.fillStyle = '#0c041a';
  ctx.fillRect(0, 0, w, h);

  rects.forEach(([fx, fy, fw, fh], i) => {
    const rx = fx * w + (fx > 0 ? gap / 2 : 0);
    const ry = fy * h + (fy > 0 ? gap / 2 : 0);
    const rw = fw * w - (fx > 0 ? gap / 2 : 0) - (fx + fw < 1 ? gap / 2 : 0);
    const rh = fh * h - (fy > 0 ? gap / 2 : 0) - (fy + fh < 1 ? gap / 2 : 0);
    paintPhoto(ctx, state.slots[i], rx, ry, rw, rh);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(2, w * 0.003);
    ctx.strokeRect(rx, ry, rw, rh);
  });

  washGrade(ctx, grade, w, h);
  sprinkleGrain(ctx, w, h, seed);
  paintTitleBlock(ctx, {
    headline: state.headline,
    subtitle: state.subtitle,
    grade,
    scale: state.titleScale ?? 1,
  }, w, h);
}
