import { useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError, cacheClear, errMsg } from "./api";

type Q<T> = { data?: T; error?: ApiError; loading: boolean; reload: () => void };

/** Estados de carregamento / erro / sessão expirada em um só lugar. */
export function Async<T>({ q, children }: { q: Q<T>; children: (d: T) => ReactNode }) {
  if (q.loading && !q.data) return <div className="skels" aria-busy="true" aria-label="Carregando"><div className="skel" /><div className="skel" /><div className="skel" /></div>;
  if (q.error) {
    if (q.error.status === 401 && typeof window !== "undefined") { cacheClear(); window.location.href = "/login?expirada=1"; }
    return <div className="state err">{errMsg(q.error)} <button className="btn sm" onClick={q.reload}>Tentar de novo</button></div>;
  }
  return q.data ? <>{children(q.data)}</> : null;
}

export const Empty = ({ children }: { children: ReactNode }) => <div className="state">{children}</div>;
export const Kpi = ({ label, value, hint, extra }: { label: string; value: ReactNode; hint?: string; extra?: ReactNode }) =>
  <div className="kpi"><span>{label}</span><b>{value}</b>{extra}{hint && <small>{hint}</small>}</div>;

export function Pager({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="pager">
    <button className="btn sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</button>
    <span>Página {page} de {pages} · {total} registros</span>
    <button className="btn sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Próxima</button>
  </div>;
}

export const Badge = ({ s }: { s: string }) => {
  const map: Record<string, string> = { approved: "Aprovada", pending: "Pendente", canceled: "Cancelada", refunded: "Reembolsada",
    ativa: "Ativa", aguardando: "Aguardando eventos", sem_eventos_recentes: "Sem eventos recentes", active: "Ativa",
    suspended: "Suspensa", expired: "Expirada", confirmed: "Confirmada", revoked: "Revogada", ok: "Processado", error: "Com erro",
    synced: "Enviado ao bot", awaiting: "Aguardando envio", failed: "Falha no envio", automatic: "Entrega automática", manual: "Entrega manual" };
  return <span className={`badge ${s}`}>{map[s] ?? s}</span>;
};

// Gráficos em SVG puro (sem dependências).
export function BarChart({ data, fmt = String }: { data: { label: string; value: number }[]; fmt?: (n: number) => string }) {
  if (!data.length) return <Empty>Sem dados no período.</Empty>;
  const W = 600, H = 170, max = Math.max(...data.map((d) => d.value), 1), bw = W / data.length;
  return <svg viewBox={`0 0 ${W} ${H + 22}`} className="chart" role="img">
    {data.map((d, i) => { const h = (d.value / max) * H;
      return <g key={i}><rect x={i * bw + 2} y={H - h} width={Math.max(bw - 4, 1)} height={h} rx="2"><title>{d.label}: {fmt(d.value)}</title></rect>
        {i % Math.ceil(data.length / 6) === 0 && <text x={i * bw + bw / 2} y={H + 18} textAnchor="middle">{d.label}</text>}</g>; })}
  </svg>;
}
export function LineChart({ data, fmt = String }: { data: { label: string; value: number }[]; fmt?: (n: number) => string }) {
  if (data.length < 2) return <Empty>Dados insuficientes para a evolução.</Empty>;
  const W = 600, H = 170, max = Math.max(...data.map((d) => d.value), 1);
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * W},${H - (d.value / max) * H}`).join(" ");
  return <svg viewBox={`0 0 ${W} ${H + 22}`} className="chart line" role="img">
    <polyline points={pts} fill="none" strokeWidth="2.5" />
    {data.map((d, i) => i % Math.ceil(data.length / 6) === 0 &&
      <text key={i} x={(i / (data.length - 1)) * W} y={H + 18} textAnchor={i === 0 ? "start" : "middle"}>{d.label}</text>)}
    <title>Total acumulado: {fmt(data[data.length - 1].value)}</title>
  </svg>;
}

export function Avatar({ src, name, size = 28 }: { src?: string | null; name?: string | null; size?: number }) {
  const st = { width: size, height: size };
  return src ? <img className="cav" style={st} src={src} alt="" loading="lazy" referrerPolicy="no-referrer" />
    : <span className="cav ph" style={st}>{(name ?? "?")[0]?.toUpperCase()}</span>;
}

const niceMax = (m: number) => { if (m <= 0) return 1; const e = 10 ** Math.floor(Math.log10(m)), f = m / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 4 ? 4 : f <= 5 ? 5 : 10) * e; };
const compact = (v: number) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(Math.round(v * 10) / 10));

/** Gráfico principal: barras (ou área, com muitos dias), linhas de referência e dica ao passar o mouse/dedo. */
export function TrendChart({ data, fmt = String, yfmt = compact }: { data: { label: string; full: string; value: number }[]; fmt?: (n: number) => string; yfmt?: (n: number) => string }) {
  const [hov, setHov] = useState<number | null>(null);
  const [W, setW] = useState(720); // largura real do cartão: o gráfico se redesenha nela e o texto não encolhe no celular
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const fit = () => setW(Math.max(260, Math.round(el.clientWidth)));
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  }, []);
  if (!data.length) return <Empty>Sem dados no período.</Empty>;
  const H = W < 480 ? 210 : 250, L = W < 480 ? 46 : 58, R = 6, T = 12, B = 28, iw = W - L - R, ih = H - T - B, n = data.length;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0)), bars = n <= 62, step = iw / n;
  const x = (i: number) => (bars ? L + i * step + step / 2 : L + (n === 1 ? iw / 2 : (i * iw) / (n - 1)));
  const y = (v: number) => T + ih - (v / max) * ih;
  const every = Math.max(1, Math.ceil(n / (W < 480 ? 4 : 7)));
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * W;
    if (px < L - 4 || px > W - R) return setHov(null);
    const i = bars ? Math.floor((px - L) / step) : Math.round(((px - L) / iw) * (n - 1));
    setHov(Math.min(n - 1, Math.max(0, i)));
  };
  const line = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const h = hov !== null ? data[hov] : null;
  return <div className="trend" ref={box}>
    <svg viewBox={`0 0 ${W} ${H}`} className="tchart" role="img" aria-label={`Gráfico com ${n} dias. Total no pico: ${fmt(Math.max(...data.map((d) => d.value)))}`}
      onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHov(null)}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(max * t)} y2={y(max * t)} className="grid" />
        <text x={L - 10} y={y(max * t) + 4} textAnchor="end">{yfmt(max * t)}</text></g>)}
      {bars ? data.map((d, i) => { const hh = Math.max((d.value / max) * ih, d.value > 0 ? 2 : 0), gap = Math.min(3, step * 0.18);
        return <rect key={i} x={L + i * step + gap} y={T + ih - hh} width={Math.max(step - gap * 2, 1)} height={hh} rx={Math.min(4, step / 3)} className={`bar${hov === i ? " on" : ""}`} />; })
        : <><polygon points={`${L},${T + ih} ${line} ${x(n - 1)},${T + ih}`} className="area" /><polyline points={line} className="ln" /></>}
      {h && hov !== null && <line x1={x(hov)} x2={x(hov)} y1={T} y2={T + ih} className="cursor" />}
      {data.map((d, i) => i % every === 0 && <text key={i} x={x(i)} y={H - 8} textAnchor="middle">{d.label}</text>)}
    </svg>
    {h && hov !== null && <div className="tip" style={{ left: `${Math.min(88, Math.max(12, (x(hov) / W) * 100))}%` }}><small>{h.full}</small><b>{fmt(h.value)}</b></div>}
  </div>;
}
