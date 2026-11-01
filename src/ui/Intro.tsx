import { useEffect, useState, type ReactNode } from "react";
import { api, avatarUrl, useApi } from "./api";
import { INVITE } from "../content";
import { Async } from "./kit";
import { Intro } from "./Intro";

export const Logo = () => <a href="/" className="logo"><img src="/zyra.png" alt="" width={30} height={30} />Zyra Apps</a>;

/** Ícone da aba do navegador (usa o ícone do servidor em /public/zyra.png). */
function useFavicon() {
  useEffect(() => {
    let l = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!l) { l = document.createElement("link"); l.rel = "icon"; document.head.appendChild(l); }
    l.type = "image/png"; l.href = "/zyra.png";
  }, []);
}

/** Efeitos do site público: spotlight que segue o mouse e entrada suave ao rolar. */
function useSiteEffects() {
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.(".spot") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", move, { passive: true });
    const rolou = () => document.documentElement.toggleAttribute("data-rolou", window.scrollY > 8);
    rolou();
    window.addEventListener("scroll", rolou, { passive: true });
    let io: IntersectionObserver | undefined;
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
      io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io!.unobserve(en.target); } }),
        { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight) return; // já visível: não esconde
        el.classList.add("rv-pre"); io!.observe(el);
      });
    }
    return () => { document.removeEventListener("pointermove", move); window.removeEventListener("scroll", rolou); document.documentElement.removeAttribute("data-rolou"); io?.disconnect(); };
  }, []);
}

export function Public({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useSiteEffects();
  useFavicon();
  return <div className="site">
    <Intro />
    <header className="nav"><div className="wrap">
      <Logo />
      <button className="burger btn sm" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Abrir menu">Menu</button>
      <nav className={open ? "open" : ""}>
        <a href="/">Início</a><a href="/zyrasallers">ZyraSallers</a><a href="/zyrasallers#funcionalidades">Funcionalidades</a>
        <a href="/precos">Preços</a><a href="/faq">FAQ</a>
        <a className="btn sm" href="/login">Acessar painel</a>
        <a className="btn sm solid" href={INVITE} target="_blank" rel="noreferrer">Adquirir ZyraSallers</a>
      </nav></div></header>
    <main>{children}</main>
    <footer className="foot">
      <div className="wrap cols">
        <div><Logo /><p>Plataforma da Zyra Applications para apresentar, vender e gerenciar o ZyraSallers.</p>
          <a className="btn sm" href={INVITE} target="_blank" rel="noreferrer">Entrar no servidor</a></div>
        <div><b>Produto</b><a href="/zyrasallers">ZyraSallers</a><a href="/zyrasallers#funcionalidades">Funcionalidades</a><a href="/precos">Preços</a><a href="/faq">FAQ</a></div>
        <div><b>Conta</b><a href="/login">Entrar com Discord</a><a href="/dashboard">Dashboard</a></div>
        <div><b>Contato e legal</b><a href={INVITE} target="_blank" rel="noreferrer">Servidor no Discord</a><a href="/privacidade">Privacidade</a><a href="/termos">Termos de uso</a></div>
      </div>
      <div className="wrap copy">
        <span>© {new Date().getFullYear()} Zyra Applications. Todos os direitos reservados.</span>
        <span className="copy-links"><a href="/privacidade">Privacidade</a><a href="/termos">Termos</a></span>
      </div>
      <div className="foot-mark" aria-hidden="true">ZYRASALLERS</div>
    </footer>
  </div>;
}

/** Tela de loading do painel: aparece ao clicar num link e enquanto a página nova carrega. */
export function PageLoader() {
  return <div className="pageloader" role="status" aria-live="polite" aria-label="Carregando">
    <div className="pl-bar" />
    <div className="pl-mark"><img src="/zyra.png" alt="" width={52} height={52} /></div>
    <p>Carregando…</p>
  </div>;
}

export function Dash({ children, bot }: { children: ReactNode; bot?: { id: string; name?: string } }) {
  const me = useApi<any>("/api/me");
  useFavicon();
  const [leaving, setLeaving] = useState(false);
  useEffect(() => { // mostra o loading assim que o usuário clica num link interno
    let t: ReturnType<typeof setTimeout> | undefined;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search)) return;
      setLeaving(true);
      clearTimeout(t); t = setTimeout(() => setLeaving(false), 8000); // segurança: nunca fica preso
    };
    const reset = () => setLeaving(false); // voltar pelo histórico do navegador
    document.addEventListener("click", onClick);
    window.addEventListener("pageshow", reset);
    return () => { document.removeEventListener("click", onClick); window.removeEventListener("pageshow", reset); clearTimeout(t); };
  }, []);
  const [p, setP] = useState(""); // definido após montar: evita divergência entre o HTML do servidor e o navegador
  useEffect(() => { setP(window.location.pathname); }, []);
  const item = (href: string, label: string, ext = false, beta = false) =>
    <a key={href} href={href} className={!ext && p === href ? "on" : ""} aria-current={!ext && p === href ? "page" : undefined} {...(ext ? { target: "_blank", rel: "noreferrer" } : {})}>{label}{beta && <em className="pillbeta">Beta</em>}</a>;
  const base = bot ? `/dashboard/bots/${encodeURIComponent(bot.id)}` : "";
  const outAll = async () => { if (!confirm("Sair de todos os aparelhos? Você precisará entrar de novo em cada um.")) return;
    await api("/api/auth/logout-all", { method: "POST" }).catch(() => {}); window.location.href = "/"; };
  const out = async () => { await api("/api/auth/logout", { method: "POST" }).catch(() => {}); window.location.href = "/"; };
  return <div className="dash">
    {(leaving || (me.loading && !me.data)) && <PageLoader />}
    <aside><Logo />
      <nav>
        {item("/dashboard", "Início")}{item("/dashboard/bots", "Meus bots")}
        {bot && <><hr /><small>{bot.name ?? "Bot"}</small>
          {item(`${base}/visao-geral`, "Visão geral")}{item(`${base}/clientes`, "Meus Clientes")}{item(`${base}/vendas`, "Vendas")}{item(`${base}/produtos`, "Produtos")}{item(`${base}/ticket`, "Ticket", false, true)}
          {item(INVITE, "Suporte", true)}{item(`${base}/configuracoes`, "Configurações")}</>}
        {me.data?.is_admin && <><hr />{item("/admin", "Administração")}</>}
      </nav></aside>
    <section>
      <div className="dtop"><span className="crumb">{bot?.name ?? ""}</span>
        {me.data && <div className="user"><img src={avatarUrl(me.data.discord_id, me.data.avatar)} alt="" />
          <span>{me.data.global_name ?? me.data.username}</span><button className="btn sm" onClick={out}>Sair</button></div>}</div>
      <div className="dbody"><Async q={me}>{() => children}</Async>
        <p className="dfoot">Você permanece conectado neste aparelho por até 60 dias de uso. <button className="linkbtn" onClick={outAll}>Sair de todos os aparelhos</button></p></div>
    </section>
  </div>;
}
