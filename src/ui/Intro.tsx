import { useEffect, useLayoutEffect, useState } from "react";

/**
 * Animação de entrada do site, feita só com código (sem vídeo nem imagem).
 * Sequência curta e limpa: a marca "Z" aparece, o nome sobe letra por letra,
 * e a tela sobe como uma cortina revelando o site.
 * Roda uma vez por visita (sessionStorage), pode ser pulada (botão ou Esc)
 * e não aparece para quem usa "reduzir movimento".
 */

const CHAVE = "zs-intro-visto";
const NOME = "ZyraSallers";
const DURACAO_LOGO = 2200; // ms até a cortina começar a subir
const DURACAO_SAIDA = 900; // ms da cortina subindo

// useLayoutEffect no navegador evita o "piscar" do site antes da animação; no servidor cai pro useEffect
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect; 

type Fase = "off" | "in" | "out";

export function Intro() {
  const [fase, setFase] = useState<Fase>("off");

  // decide se mostra: só na primeira vez da visita e sem "reduzir movimento"
  useIso(() => {
    let visto = false;
    try { visto = sessionStorage.getItem(CHAVE) === "1"; } catch { /* sem storage: mostra */ }
    if (visto || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try { sessionStorage.setItem(CHAVE, "1"); } catch { /* ignora */ }
    setFase("in");
  }, []);

  // trava a rolagem enquanto a animação roda
  useEffect(() => {
    if (fase === "off") return;
    const el = document.documentElement;
    const antes = el.style.overflow;
    el.style.overflow = "hidden";
    return () => { el.style.overflow = antes; };
  }, [fase]);

  // sequência: marca -> cortina sobe -> some
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (fase === "in") t = setTimeout(() => setFase("out"), DURACAO_LOGO);
    else if (fase === "out") t = setTimeout(() => setFase("off"), DURACAO_SAIDA);
    return () => clearTimeout(t);
  }, [fase]);

  // Esc pula
  useEffect(() => {
    if (fase === "off") return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setFase("out"); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [fase]);

  // avisa o resto do site que a cortina começou a subir (a Home reinicia as animações do topo)
  useEffect(() => {
    if (fase === "out") window.dispatchEvent(new Event("zs-intro-fim"));
  }, [fase]);

  if (fase === "off") return null;

  return (
    <div className={`intro ${fase}`} role="status" aria-label="Abrindo o site">
      <div className="intro-center" aria-hidden="true">
        <img className="intro-mark" src="/zyra.png" alt="" width={84} height={84} />
        <div className="intro-word">
          {NOME.split("").map((c, i) => <span key={i} style={{ animationDelay: `${0.55 + i * 0.045}s` }}>{c}</span>)}
        </div>
        <i className="intro-line" />
        <p>Vendas automáticas dentro do Discord</p>
      </div>
      <button type="button" className="intro-skip" onClick={() => setFase("out")}>Pular</button>
    </div>
  );
}
