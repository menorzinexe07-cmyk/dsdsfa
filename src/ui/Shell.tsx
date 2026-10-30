import type { ReactNode } from "react";
import { ApiError, errMsg } from "./api";

type Q<T> = { data?: T; error?: ApiError; loading: boolean; reload: () => void };

/** Estados de carregamento / erro / sessão expirada em um só lugar. */
export function Async<T>({ q, children }: { q: Q<T>; children: (d: T) => ReactNode }) {
  if (q.loading && !q.data) return <div className="state"><span className="spin" /> Carregando…</div>;
  if (q.error) {
    if (q.error.status === 401 && typeof window !== "undefined") window.location.href = "/login?expirada=1";
    return <div className="state err">{errMsg(q.error)} <button className="btn sm" onClick={q.reload}>Tentar de novo</button></div>;
  }
  return q.data ? <>{children(q.data)}</> : null;
}

export const Empty = ({ children }: { children: ReactNode }) => <div className="state">{children}</div>;
export const Kpi = ({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) =>
  <div className="kpi"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</div>;

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
    suspended: "Suspensa", expired: "Expirada" };
  return <span className={`badge ${s}`}>{map[s] ?? s}</span>;
};

// Gráficos em SVG puro (sem dependências).
export function BarChart({ data, fmt = String }: { data: { label: string; value: number }[]; fmt?: (n: number) => string }) {
  if (!data.length) return <Empty>Sem dados no período.</Empty>;
  const W = 600, H = 170, max = Math.max(...data.map((d) => d.value), 1), bw = W / data.length;
  return <svg viewBox={`0 0 ${W} ${H + 22}`} className="chart" role="img">
    {data.map((d, i) => { const h = (d.value / max) * H;
      return <g key={i}><rect x={i * bw + 2} y={H - h} width={Math.max(bw - 4, 1)} height={h} rx="2"><title>{d.label}: {fmt(d.value)}</title></rect>
        {(data.length <= 12 || i % Math.ceil(data.length / 8) === 0) && <text x={i * bw + bw / 2} y={H + 16} textAnchor="middle">{d.label}</text>}</g>; })}
  </svg>;
}
export function LineChart({ data, fmt = String }: { data: { label: string; value: number }[]; fmt?: (n: number) => string }) {
  if (data.length < 2) return <Empty>Dados insuficientes para a evolução.</Empty>;
  const W = 600, H = 170, max = Math.max(...data.map((d) => d.value), 1);
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * W},${H - (d.value / max) * H}`).join(" ");
  return <svg viewBox={`0 0 ${W} ${H + 22}`} className="chart line" role="img">
    <polyline points={pts} fill="none" strokeWidth="2.5" />
    {data.map((d, i) => (data.length <= 12 || i % Math.ceil(data.length / 8) === 0) &&
      <text key={i} x={(i / (data.length - 1)) * W} y={H + 16} textAnchor="middle">{d.label}</text>)}
    <title>Total acumulado: {fmt(data[data.length - 1].value)}</title>
  </svg>;
}

export function Avatar({ src, name, size = 28 }: { src?: string | null; name?: string | null; size?: number }) {
  const st = { width: size, height: size };
  return src ? <img className="cav" style={st} src={src} alt="" loading="lazy" referrerPolicy="no-referrer" />
    : <span className="cav ph" style={st}>{(name ?? "?")[0]?.toUpperCase()}</span>;
}
