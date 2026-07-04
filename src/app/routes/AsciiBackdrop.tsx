import { useEffect, useRef } from 'react';
import styles from './AsciiBackdrop.module.css';

/**
 * Интерактивное ASCII-поле главного меню — порт дизайн-компонента <ascii-bg>.
 *
 * В покое по экрану медленно дрейфует «созвездие» интеллект-карты (узлы +
 * ближайшие рёбра). Курсор оставляет инерционный кометный след с гауссовым
 * затуханием, который подсвечивает поле акцентом и «активирует» ближние узлы.
 *
 * Цвета приходят пропсами (зависят от темы) и обновляются вживую без пересева
 * узлов. Анимация крутится на ~30fps и только пока элемент виден; при
 * prefers-reduced-motion рисуется один статичный кадр.
 */

const RAMP = " .`':,-~=+*=#%@";
const TECH = '01<>/\\{}[]|=+*'.split('');

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  let h = (hex || '#5fd4ff').replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  act: number;
}
interface TrailPoint {
  x: number;
  y: number;
  life: number;
}

interface AsciiBackdropProps {
  /** Акцентный цвет следа/узлов (hex). */
  accent: string;
  /** Базовый цвет символов в покое (hex). */
  base: string;
}

export function AsciiBackdrop({ accent, base }: AsciiBackdropProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentRef = useRef<RGB>(hexToRgb(accent));
  const baseRef = useRef<RGB>(hexToRgb(base));

  // Цвета обновляем через ref, чтобы петля рендера подхватывала их без пересоздания.
  useEffect(() => {
    accentRef.current = hexToRgb(accent);
  }, [accent]);
  useEffect(() => {
    baseRef.current = hexToRgb(base);
  }, [base]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let step = 16;
    let cssW = canvas.clientWidth || 1400;
    let cssH = canvas.clientHeight || 860;
    let cols = 0;
    let rows = 0;
    const mouse = { x: -9999, y: -9999, active: 0 };
    const follow = { x: -9999, y: -9999 };
    let trail: TrailPoint[] = [];
    let nodes: Node[] = [];
    let edges: [Node, Node][] = [];
    let t = 0;
    let raf: number | null = null;
    let visible = false;
    let frameToggle = false;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const resize = (): void => {
      const w = canvas.clientWidth || 1400;
      const h = canvas.clientHeight || 860;
      step = Math.max(16, Math.round(w / 88));
      const dpr = w > 1500 ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      cssW = w;
      cssH = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / step) + 1;
      rows = Math.ceil(h / step) + 1;
      ctx.font = `${Math.round(step * 0.75)}px ui-monospace, Menlo, monospace`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
    };

    const seedNodes = (): void => {
      const w = cssW || 1400;
      const h = cssH || 860;
      const N = 11;
      nodes = [];
      for (let i = 0; i < N; i++) {
        nodes.push({
          x: 60 + Math.random() * (w - 120),
          y: 60 + Math.random() * (h - 120),
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          act: 0.35,
        });
      }
    };

    const stepNodes = (dt: number): void => {
      const w = cssW;
      const h = cssH;
      const m = 40;
      for (const n of nodes) {
        n.x += n.vx * dt;
        n.y += n.vy * dt;
        if (n.x < m) {
          n.x = m;
          n.vx = Math.abs(n.vx);
        }
        if (n.x > w - m) {
          n.x = w - m;
          n.vx = -Math.abs(n.vx);
        }
        if (n.y < m) {
          n.y = m;
          n.vy = Math.abs(n.vy);
        }
        if (n.y > h - m) {
          n.y = h - m;
          n.vy = -Math.abs(n.vy);
        }
        // след активирует ближние узлы — они разгораются ярче
        let boost = 0;
        for (const p of trail) {
          const dx = n.x - p.x;
          const dy = n.y - p.y;
          const d2 = dx * dx + dy * dy;
          boost = Math.max(boost, p.life * Math.exp(-d2 / 9000));
        }
        n.act += (0.32 + boost * 2.4 - n.act) * 0.15;
      }
      // рёбра к ближайшему соседу (пересчёт дёшев)
      edges = [];
      for (let i = 0; i < nodes.length; i++) {
        let best = -1;
        let bd = Infinity;
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = dx * dx + dy * dy;
          if (d < bd) {
            bd = d;
            best = j;
          }
        }
        if (best >= 0) edges.push([nodes[i], nodes[best]]);
      }
    };

    const segDist = (px: number, py: number, a: Node, b: Node): number => {
      const vx = b.x - a.x;
      const vy = b.y - a.y;
      const wx = px - a.x;
      const wy = py - a.y;
      const len2 = vx * vx + vy * vy || 1;
      let tt = (wx * vx + wy * vy) / len2;
      tt = tt < 0 ? 0 : tt > 1 ? 1 : tt;
      const dx = px - (a.x + tt * vx);
      const dy = py - (a.y + tt * vy);
      return dx * dx + dy * dy;
    };

    const render = (): void => {
      const s = step;
      const [ar, ag, ab] = accentRef.current;
      const [br, bg, bb] = baseRef.current;
      ctx.clearRect(0, 0, cssW, cssH);

      const SN2 = 2 * 24 * 24;
      const SL2 = 2 * 8 * 8;
      const ST2 = 2 * 42 * 42;

      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          const px = gx * s;
          const py = gy * s;

          // спокойный фоновый поток
          const baseFlow =
            (0.5 + 0.5 * Math.sin(gx * 0.26 + t * 0.7) * Math.cos(gy * 0.3 - t * 0.5)) * 0.13;

          // ближайший узел
          let nodeGlow = 0;
          for (const n of nodes) {
            const dx = px - n.x;
            const dy = py - n.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < SN2 * 3) {
              const g = Math.exp(-d2 / SN2) * n.act;
              if (g > nodeGlow) nodeGlow = g;
            }
          }
          // ближайшее ребро (коннекторы карты)
          let lineGlow = 0;
          for (const e of edges) {
            const d2 = segDist(px, py, e[0], e[1]);
            if (d2 < SL2 * 4) {
              const g = Math.exp(-d2 / SL2);
              if (g > lineGlow) lineGlow = g;
            }
          }
          // кометный след — гладкая сумма гауссиан, без резкого кольца
          let tr = 0;
          for (const p of trail) {
            const dx = px - p.x;
            const dy = py - p.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < ST2 * 3) tr += p.life * Math.exp(-d2 / ST2);
          }
          if (tr > 1.5) tr = 1.5;

          const intensity = baseFlow + nodeGlow * 0.5 + lineGlow * 0.28 + tr * 1.15;
          if (intensity < 0.05) continue;

          const mix = Math.min(1, tr * 1.25 + nodeGlow * 0.8);
          const a = Math.min(0.96, baseFlow * 0.85 + nodeGlow * 0.55 + lineGlow * 0.3 + tr * 1.0);
          const r = Math.round(br * (1 - mix) + ar * mix);
          const g = Math.round(bg * (1 - mix) + ag * mix);
          const b = Math.round(bb * (1 - mix) + ab * mix);

          let ch: string;
          if (tr > 0.18) ch = TECH[(gx * 7 + gy * 3 + Math.floor(t * 7)) % TECH.length];
          else if (nodeGlow > 0.34) ch = '#';
          else if (nodeGlow > 0.16) ch = '*';
          else ch = RAMP[Math.min(RAMP.length - 1, Math.floor(Math.min(1, intensity) * RAMP.length))];

          ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
          ctx.fillText(ch, px, py);
        }
      }
    };

    const loop = (): void => {
      if (!visible) {
        raf = null;
        return;
      }
      // ~30fps: пропускаем каждый второй кадр
      frameToggle = !frameToggle;
      if (frameToggle) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const dt = 0.032;
      t += dt;
      stepNodes(dt);

      // инерционный преследователь + кометный след
      if (mouse.active) {
        if (follow.x < -1000) {
          follow.x = mouse.x;
          follow.y = mouse.y;
        }
        follow.x += (mouse.x - follow.x) * 0.18;
        follow.y += (mouse.y - follow.y) * 0.18;
        trail.push({ x: follow.x, y: follow.y, life: 1 });
      }
      for (const p of trail) p.life *= 0.9;
      trail = trail.filter((p) => p.life > 0.04).slice(-22);

      render();
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent): void => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (x >= 0 && y >= 0 && x <= r.width && y <= r.height) {
        mouse.x = x;
        mouse.y = y;
        mouse.active = 1;
      } else {
        mouse.active = 0;
      }
    };

    resize();
    seedNodes();

    if (reduceMotion) {
      // Один статичный кадр — без движения.
      stepNodes(0);
      render();
      return;
    }

    window.addEventListener('pointermove', onMove);

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          visible = e.isIntersecting;
          if (visible && raf === null) raf = requestAnimationFrame(loop);
        }
      },
      { rootMargin: '100px' },
    );
    io.observe(canvas);

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
