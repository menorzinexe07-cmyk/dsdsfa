import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const reduzido = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const LICENCA: Record<string, [string, string]> = { active: ["Licença ativa", "ok"], suspended: ["Licença suspensa", "bad"], expired: ["Licença expirada", "bad"] };

/**
 * Animação de entrada do painel de um bot: avatar com anel que se desenha, nome, três passos e a tela abrindo em círculo.
 * Aparece uma vez por bot em cada sessão do navegador, dura ~2 s, pode ser pulada (clique, Esc ou Enter) e some com "reduzir movimento".
 */
export function BotIntro({ botId, info }: { botId: string; info: { data?: any; error?: any } }) {
  const [fase, setFase] = useState<"off" | "in" | "out">("off");
  const [minimo, setMinimo] = useState(false);

  useEffect(() => {
    if (reduzido()) return;
    try { const k = `zs-bot-intro:${botId}`; if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, "1"); } catch { /* sem storage: mostra mesmo assim */ }
    setFase("in"); setMinimo(false);
    const t1 = setTimeout(() => setMinimo(true), 1900), t2 = setTimeout(() => setFase("out"), 5200); // nunca prende o usuário
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [botId]);

  useEffect(() => { if (fase === "in" && minimo && (info.data || info.error)) setFase("out"); }, [fase, minimo, info.data, info.error]);
  useEffect(() => {
    if (fase !== "out") return;
    const de = document.documentElement; de.dataset.enter = "1"; // recomeça a entrada em cascata dos blocos da página
    const t = setTimeout(() => setFase("off"), 750), t2 = setTimeout(() => { delete de.dataset.enter; }, 1800);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [fase]);
  useEffect(() => {
    if (fase !== "in") return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") setFase("out"); };
    window.addEventListener("keydown", tecla); return () => window.removeEventListener("keydown", tecla);
  }, [fase]);

  if (fase === "off" || typeof document === "undefined") return null;
  const d = info.data, nome = d?.name ?? "Seu bot", [licTxt, licTom] = LICENCA[d?.license_status] ?? ["Licença verificada", "ok"];
  return createPortal(<div className={`botintro ${fase}`} role="status" aria-live="polite" onClick={() => setFase("out")}>
    <div className="bi-grade" aria-hidden="true" /><div className="bi-glow" aria-hidden="true" />
    <div className="bi-core">
      <div className="bi-ring" aria-hidden="true">
        <svg viewBox="0 0 120 120"><circle className="trilho" cx="60" cy="60" r="56" /><circle className="arco" cx="60" cy="60" r="56" /></svg>
        <span className="bi-av">{d?.avatar_url ? <img src={d.avatar_url} alt="" referrerPolicy="no-referrer" /> : <b>{String(nome)[0]}</b>}</span>
      </div>
      <p className="bi-eyebrow">Abrindo o painel de</p>
      <h2 className="bi-name">{nome}</h2>
      <ul className="bi-steps">
        <li className={`s1 ${d ? "ok" : ""}`}><i />{d ? "Dados do bot carregados" : "Carregando dados do bot…"}</li>
        <li className={`s2 ${d ? licTom : ""}`}><i />{d ? licTxt : "Verificando a licença…"}</li>
        <li className={`s3 ${d ? "ok" : ""}`}><i />{d ? "Painel pronto" : "Preparando o painel…"}</li>
      </ul>
    </div>
    <button type="button" className="bi-skip" onClick={() => setFase("out")}>Pular</button>
  </div>, document.body);
}
