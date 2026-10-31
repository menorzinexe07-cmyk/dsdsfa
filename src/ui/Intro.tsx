import { useEffect, useLayoutEffect, useState } from "react";

/**
 * Animação de entrada do site, feita só com código (sem vídeo nem imagem).
 * Um "terminal" digita os comandos, o logo aparece e a cortina sobe.
 * Roda uma vez por visita (sessionStorage), pode ser pulada e some com "reduzir movimento".
 */

const CHAVE = "zs-intro-visto";
const PAUSA = 7; // "caracteres" de pausa entre uma linha e outra
const VELOCIDADE = 22; // ms por caractere

const LINHAS: { t: string; cmd?: boolean }[] = [
  { t: "zyrasallers iniciar", cmd: true },
  { t: "carregando painel de vendas" },
  { t: "conectando ao Discord" },
  { t: "gerando pagamentos PIX" },
  { t: "tudo pronto" },
];
const TOTAL = LINHAS.reduce((a, l) => a + l.t.length + PAUSA, 0);

// useLayoutEffect no navegador evita o "piscar" do site antes da cortina; no servidor cai pro useEffect
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Fase = "off" | "typing" | "logo" | "out";

export function Intro() {
  const [fase, setFase] = useState<Fase>("off");
  const [n, setN] = useState(0);

  // decide se mostra: só na primeira vez da visita e sem "reduzir movimento"
  useIso(() => {
    let visto = false;
    try { visto = sessionStorage.getItem(CHAVE) === "1"; } catch { /* sem storage: mostra */ }
    if (visto || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try { sessionStorage.setItem(CHAVE, "1"); } catch { /* ignora */ }
    setFase("typing");
  }, []);

  // trava a rolagem enquanto a animação roda
  useEffect(() => {
    if (fase === "off") return;
    const el = document.documentElement;
    const antes = el.style.overflow;
    el.style.overflow = "hidden";
    return () => { el.style.overflow = antes; };
  }, [fase]);

  // digitação
  useEffect(() => {
    if (fase !== "typing") return;
    const iv = setInterval(() => setN((v) => Math.min(v + 1, TOTAL)), VELOCIDADE);
    return () => clearInterval(iv);
  }, [fase]);

  // sequência: digitar -> logo -> cortina sobe -> some
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (fase === "typing" && n >= TOTAL) t = setTimeout(() => setFase("logo"), 250);
    else if (fase === "logo") t = setTimeout(() => setFase("out"), 950);
    else if (fase === "out") t = setTimeout(() => setFase("off"), 850);
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

  let resta = n;
  const linhas = LINHAS.map((l) => {
    const mostrar = Math.min(Math.max(resta, 0), l.t.length);
    resta -= l.t.length + PAUSA;
    return { ...l, texto: l.t.slice(0, mostrar), ativa: mostrar > 0 && mostrar < l.t.length };
  });

  return (
    <div className={`intro ${fase}`} role="status" aria-label="Abrindo o site">
      <div className="intro-term" aria-hidden="true">
        {linhas.map((l, i) => l.texto && (
          <div key={i} className={l.cmd ? "cmd" : "ok"}>
            {l.texto}{l.ativa && <span className="intro-cursor" />}
          </div>
        ))}
      </div>
      <div className="intro-logo" aria-hidden="true"><span>Z</span><b>Zyra Apps</b></div>
      <div className="intro-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (n / TOTAL) * 100)}%` }} /></div>
      <button type="button" className="intro-skip" onClick={() => setFase("out")}>Pular</button>
    </div>
  );
}
