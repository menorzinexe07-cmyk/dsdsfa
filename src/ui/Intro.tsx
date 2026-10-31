import { useEffect, useLayoutEffect, useState } from "react";

/**
 * Animação de entrada do site, feita só com código (sem vídeo nem imagem).
 *   1. "boot": terminal digitando comandos + contador de porcentagem gigante
 *   2. "logo": anel se desenhando, marca Z e o nome entrando letra por letra
 *   3. "out":  a tela se abre ao meio, revelando o site
 * Roda uma vez por visita (sessionStorage), pode ser pulada (botão ou Esc)
 * e não aparece para quem usa "reduzir movimento".
 */

const CHAVE = "zs-intro-visto";
const PAUSA = 7; // "caracteres" de pausa entre uma linha e outra
const VELOCIDADE = 16; // ms por caractere
const NOME = "ZYRASALLERS";

const LINHAS: { t: string; cmd?: boolean }[] = [
  { t: "zyrasallers iniciar", cmd: true },
  { t: "carregando painel de vendas" },
  { t: "conectando ao Discord" },
  { t: "gerando pagamentos PIX" },
  { t: "protegendo seu servidor" },
  { t: "tudo pronto" },
];
const TOTAL = LINHAS.reduce((a, l) => a + l.t.length + PAUSA, 0);

// useLayoutEffect no navegador evita o "piscar" do site antes da animação; no servidor cai pro useEffect
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Fase = "off" | "boot" | "logo" | "out";

export function Intro() {
  const [fase, setFase] = useState<Fase>("off");
  const [n, setN] = useState(0);

  // decide se mostra: só na primeira vez da visita e sem "reduzir movimento"
  useIso(() => {
    let visto = false;
    try { visto = sessionStorage.getItem(CHAVE) === "1"; } catch { /* sem storage: mostra */ }
    if (visto || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try { sessionStorage.setItem(CHAVE, "1"); } catch { /* ignora */ }
    setFase("boot");
  }, []);

  // trava a rolagem enquanto a animação roda
  useEffect(() => {
    if (fase === "off") return;
    const el = document.documentElement;
    const antes = el.style.overflow;
    el.style.overflow = "hidden";
    return () => { el.style.overflow = antes; };
  }, [fase]);

  // digitação e contador
  useEffect(() => {
    if (fase !== "boot") return;
    const iv = setInterval(() => setN((v) => Math.min(v + 1, TOTAL)), VELOCIDADE);
    return () => clearInterval(iv);
  }, [fase]);

  // sequência: boot -> logo -> abre -> some
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (fase === "boot" && n >= TOTAL) t = setTimeout(() => setFase("logo"), 300);
    else if (fase === "logo") t = setTimeout(() => setFase("out"), 1900);
    else if (fase === "out") t = setTimeout(() => setFase("off"), 1200);
    return () => clearTimeout(t);
  }, [fase, n]);

  // Esc pula
  useEffect(() => {
    if (fase === "off") return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setFase("out"); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [fase]);

  if (fase === "off") return null;

  const pct = Math.round((n / TOTAL) * 100);
  let resta = n;
  const linhas = LINHAS.map((l) => {
    const mostrar = Math.min(Math.max(resta, 0), l.t.length);
    resta -= l.t.length + PAUSA;
    return { ...l, texto: l.t.slice(0, mostrar), ativa: mostrar > 0 && mostrar < l.t.length };
  });

  return (
    <div className={`intro ${fase}`} role="status" aria-label="Abrindo o site">
      <div className="intro-half top" aria-hidden="true" />
      <div className="intro-half bottom" aria-hidden="true" />
      <div className="intro-flash" aria-hidden="true" />

      <div className="intro-content">
        <div className="intro-scan" aria-hidden="true" />

        <div className="intro-boot" aria-hidden="true">
          <div className="intro-term">
            {linhas.map((l, i) => l.texto && (
              <div key={i} className={l.cmd ? "cmd" : "ok"}>
                {l.texto}{l.ativa && <span className="intro-cursor" />}
              </div>
            ))}
          </div>
          <div className="intro-pct">{String(pct).padStart(3, "0")}<small>%</small></div>
        </div>

        <div className="intro-logo" aria-hidden="true">
          <div className="intro-mark">
            <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="55" pathLength={1} /></svg>
            <span>Z</span>
          </div>
          <div className="intro-word">
            {NOME.split("").map((c, i) => <span key={i} style={{ animationDelay: `${0.55 + i * 0.05}s` }}>{c}</span>)}
          </div>
          <p>Vendas automáticas dentro do Discord</p>
        </div>

        <div className="intro-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
        <button type="button" className="intro-skip" onClick={() => setFase("out")}>Pular</button>
      </div>
    </div>
  );
}
