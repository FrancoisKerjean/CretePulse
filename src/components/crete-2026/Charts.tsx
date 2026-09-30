// Graphiques de la page crete-2026, rendus côté serveur en SVG + HTML : aucun JS envoyé,
// aucune dépendance. Chaque graphique porte role="img" et un aria-label ; le tableau de
// données repliable qui l'accompagne (ChartFigure) est la version accessible et exacte.
// Survol : attribut title natif (souris), les valeurs exactes restent dans le tableau.
import type { CSSProperties, ReactNode } from "react";
import s from "./crete-2026.module.css";

type Vars = CSSProperties & Record<`--${string}`, string>;
const pct = (v: number, max: number, min = 0) => `${(((v - min) / (max - min)) * 100).toFixed(2)}%`;

export function ChartFigure({ title, sub, source, seeData, head, rows, children }: {
  title: string; sub: string; source: string; seeData: string; head: string[]; rows: string[][]; children: ReactNode;
}) {
  return (
    <figure className={s.fig}>
      <figcaption>
        <strong className={s.figTitle}>{title}</strong>
        <span className={s.figSub}>{sub}</span>
      </figcaption>
      {children}
      <p className={s.src}>{source}</p>
      <details className={s.dv}>
        <summary>{seeData}</summary>
        <div className={s.tscroll}>
          <table className={s.tbl}>
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r[0]}>
                  <th scope="row">{r[0]}</th>
                  {r.slice(1).map((c, i) => <td key={i}>{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className={s.legend} aria-hidden>
      {items.map((it) => (
        <span key={it.label}><i style={{ background: it.color }} />{it.label}</span>
      ))}
    </div>
  );
}

function YGrid({ ticks, max, min = 0, fmt, className }: { ticks: number[]; max: number; min?: number; fmt: (v: number) => string; className?: string }) {
  return (
    <div className={className} aria-hidden>
      {ticks.map((t) => {
        const top = `calc(100% - ${pct(t, max, min)})`;
        return (
          <span key={t}>
            <i className={s.grid} style={{ top }} />
            <span className={`${s.yTick} ${s.axisLabel}`} style={{ top }}>{fmt(t)}</span>
          </span>
        );
      })}
    </div>
  );
}

// Courbe lissée monotone (Fritsch-Carlson, comme d3.curveMonotoneX) : jamais de dépassement
// au-delà des valeurs réelles entre deux points, coupée sur les valeurs nulles.
function smoothPath(pts: ([number, number] | null)[]): string {
  let d = "";
  let run: [number, number][] = [];
  const f = (v: number) => v.toFixed(1);
  const flush = () => {
    const k = run.length;
    if (k === 0) return;
    const sec = run.slice(0, -1).map((p, i) => (run[i + 1][1] - p[1]) / (run[i + 1][0] - p[0]));
    const tan = run.map((_, i) => {
      if (i === 0) return sec[0] ?? 0;
      if (i === k - 1) return sec[k - 2];
      const s0 = sec[i - 1], s1 = sec[i];
      if (s0 * s1 <= 0) return 0;
      const h0 = run[i][0] - run[i - 1][0], h1 = run[i + 1][0] - run[i][0];
      const pm = (s0 * h1 + s1 * h0) / (h0 + h1);
      return Math.sign(s0) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(pm)) * 2;
    });
    d += `M${f(run[0][0])},${f(run[0][1])}`;
    for (let i = 1; i < k; i++) {
      const [x0, y0] = run[i - 1], [x1, y1] = run[i];
      const dx = (x1 - x0) / 3;
      d += `C${f(x0 + dx)},${f(y0 + dx * tan[i - 1])} ${f(x1 - dx)},${f(y1 - dx * tan[i])} ${f(x1)},${f(y1)}`;
    }
    run = [];
  };
  pts.forEach((p) => { if (p) run.push(p); else flush(); });
  flush();
  return d;
}

export type LineSeries = { label: string; values: (number | null)[]; color: string; width?: number; endAt?: number; endLabel?: string };

export function LineChart({ xLabels, series, ticks, max, min = 0, fmtY, tip, height, padRight = 12, ariaLabel }: {
  xLabels: string[]; series: LineSeries[]; ticks: number[]; max: number; min?: number;
  fmtY: (v: number) => string; tip: (i: number) => string; height: number; padRight?: number; ariaLabel: string;
}) {
  const n = xLabels.length;
  const W = 1000, H = 1000;
  const x = (i: number) => (i / (n - 1)) * W;
  const y = (v: number) => H - ((v - min) / (max - min)) * H;
  const colW = 100 / (n - 1);
  return (
    <div className={s.lc} role="img" aria-label={ariaLabel}>
      <div className={s.lcPlot} style={{ height, marginRight: padRight }}>
        <YGrid ticks={ticks} max={max} min={min} fmt={fmtY} />
        <svg className={s.lcSvg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
          {series.map((se) => (
            <path key={se.label} d={smoothPath(se.values.map((v, i) => (v == null ? null : [x(i), y(v)])))}
              fill="none" style={{ stroke: se.color }} strokeWidth={se.width ?? 2} strokeLinecap="round" strokeLinejoin="round"
              vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        {series.map((se) => se.endAt != null && se.values[se.endAt] != null && (
          <span key={se.label} className={s.endLabel} aria-hidden
            style={{ left: `${(se.endAt / (n - 1)) * 100}%`, top: `calc(100% - ${pct(se.values[se.endAt] as number, max, min)})`, color: se.color }}>
            {se.endLabel}
          </span>
        ))}
        <div className={s.cols}>
          {xLabels.map((_, i) => (
            <span key={i} className={s.col} title={tip(i)}
              style={{ left: `${Math.max(0, i * colW - colW / 2)}%`, width: `${i === 0 || i === n - 1 ? colW / 2 : colW}%`, "--at": i === 0 ? "0%" : i === n - 1 ? "100%" : "50%" } as Vars} />
          ))}
        </div>
      </div>
      <div className={s.xAxis} style={{ marginRight: padRight }} aria-hidden>
        {xLabels.map((l, i) => (
          <span key={l} className={`${s.xTick} ${s.axisLabel} ${i % 2 ? s.xOdd : ""}`} style={{ left: `${(i / (n - 1)) * 100}%` }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

export function VBarChart({ bars, ticks, max, fmtY, height, ariaLabel }: {
  bars: { label: string; value: number; color: string; shown?: string; tip: string }[];
  ticks: number[]; max: number; fmtY: (v: number) => string; height: number; ariaLabel: string;
}) {
  return (
    <div className={s.vb} role="img" aria-label={ariaLabel}>
      <div className={s.vbPlot} style={{ height }}>
        <YGrid ticks={ticks} max={max} fmt={fmtY} />
        <div className={s.vbCols}>
          {bars.map((b) => (
            <div key={b.label} className={s.vbCol} title={b.tip}>
              <span className={s.vbBar} style={{ "--v": pct(b.value, max), background: b.color } as Vars}>
                {b.shown && <em aria-hidden>{b.shown}</em>}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className={s.vbX} aria-hidden>
        {bars.map((b, i) => <span key={b.label} className={`${s.axisLabel} ${i % 2 ? s.xOdd : ""}`}>{b.label}</span>)}
      </div>
    </div>
  );
}

export function GroupedBarChart({ groups, colors, ticks, max, fmtY, fmtV, tip, height, ariaLabel }: {
  groups: { label: string; values: number[] }[]; colors: string[]; ticks: number[]; max: number;
  fmtY: (v: number) => string; fmtV: (v: number) => string; tip: (g: number, i: number) => string; height: number; ariaLabel: string;
}) {
  return (
    <div className={s.gb} role="img" aria-label={ariaLabel} style={{ "--h": `${height}px` } as Vars}>
      <div className={s.gbPlot}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height }} className={s.gbGrid}>
          <YGrid ticks={ticks} max={max} fmt={fmtY} />
        </div>
        <div className={s.gbGroups}>
          {groups.map((g, gi) => (
            <div key={g.label} className={s.gbGroup}>
              <div className={s.gbBars}>
                {g.values.map((v, i) => (
                  <span key={i} className={s.gbBar} title={tip(gi, i)} style={{ "--v": pct(v, max), background: colors[i] } as Vars}>
                    <em aria-hidden>{fmtV(v)}</em>
                  </span>
                ))}
              </div>
              <div className={s.gbLabel} aria-hidden>{g.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HBarChart({ bars, max, ariaLabel }: { bars: { label: string; value: number; shown: string }[]; max: number; ariaLabel: string }) {
  return (
    <div className={s.hb} role="img" aria-label={ariaLabel}>
      {bars.map((b) => (
        <div key={b.label} aria-hidden>
          <span className={s.hbLabel}>{b.label}</span>
          <span className={s.hbTrack}>
            <span className={s.hbBar} style={{ "--v": pct(b.value, max) } as Vars} />
            <span className={s.hbVal}>{b.shown}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
