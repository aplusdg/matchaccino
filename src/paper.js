function clip(poly, dx, dy, k, keepFront) {
  const out = [];
  const signed = (p) => (p[0] * dx + p[1] * dy - k) * (keepFront ? 1 : -1);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i],
      b = poly[(i + 1) % poly.length],
      sa = signed(a),
      sb = signed(b);
    if (sa <= 0) out.push(a);
    if (sa <= 0 !== sb <= 0) {
      const t = sa / (sa - sb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}
export function pageFold(w, h, dx, dy) {
  const rectangle = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  dx = Math.max(0, Math.min(w * 1.4, dx));
  dy = Math.max(0, Math.min(h * 1.4, dy));
  const norm = dx * dx + dy * dy;
  if (norm < 1) return { front: rectangle, back: [], tip: [w, h] };
  const k = w * dx + h * dy - norm / 2;
  const front = clip(rectangle, dx, dy, k, true);
  const back = clip(rectangle, dx, dy, k, false).map(([x, y]) => {
    const distance = (2 * (x * dx + y * dy - k)) / norm;
    return [x - distance * dx, y - distance * dy];
  });
  return { front, back, tip: [w - dx, h - dy] };
}
export const polygonCSS = (points, w, h) =>
  `polygon(${points.map(([x, y]) => `${(x / w) * 100}% ${(y / h) * 100}%`).join(",")})`;
export function pullProgress(w, h, dx, dy) {
  return Math.min(
    135,
    (Math.max(0, (dx + dy) / Math.SQRT2) /
      Math.min(190, Math.hypot(w, h) * 0.36)) *
      100,
  );
}
