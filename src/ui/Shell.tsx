import { useEffect, useState, type ReactNode } from "react";
import { api, avatarUrl, useApi } from "./api";
import { INVITE } from "../content";
import { Async } from "./kit";

export const Logo = () => <a href="/" className="logo"><span>Z</span>Zyra Apps</a>;

export function Public({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div className="site">
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
    <footer className="foot"><div className="wrap cols">
      <div><Logo /><p>Plataforma da Zyra Applications para apresentar, vender e gerenciar o ZyraSallers.</p></div>
      <div><b>Produto</b><a href="/zyrasallers">ZyraSallers</a><a href="/precos">Preços</a><a href="/faq">FAQ</a></div>
      <div><b>Conta</b><a href="/login">Entrar com Discord</a><a href="/dashboard">Dashboard</a></div>
      <div><b>Contato e legal</b><a href={INVITE} target="_blank" rel="noreferrer">Servidor no Discord</a><a href="/privacidade">Privacidade</a><a href="/termos">Termos de uso</a></div>
    </div><div className="wrap copy">© {new Date().getFullYear()} Zyra Applications</div></footer>
  </div>;
}

export function Dash({ children, bot }: { children: ReactNode; bot?: { id: string; name?: string } }) {
  const me = useApi<any>("/api/me");
  const p = typeof window !== "undefined" ? window.location.pathname : "";
  const item = (href: string, label: string, ext = false) =>
    <a key={href} href={href} className={!ext && p === href ? "on" : ""} {...(ext ? { target: "_blank", rel: "noreferrer" } : {})}>{label}</a>;
  const base = bot ? `/dashboard/bots/${encodeURIComponent(bot.id)}` : "";
  const out = async () => { await api("/api/auth/logout", { method: "POST" }).catch(() => {}); window.location.href = "/"; };
  return <div className="dash">
    <aside><Logo />
      <nav>
        {item("/dashboard", "Início")}{item("/dashboard/bots", "Meus bots")}
        {bot && <><hr /><small>{bot.name ?? "Bot"}</small>
          {item(`${base}/visao-geral`, "Visão geral")}{item(`${base}/clientes`, "Meus Clientes")}{item(`${base}/vendas`, "Vendas")}
          {item(INVITE, "Suporte", true)}{item(`${base}/integracao`, "API e integração")}{item(`${base}/configuracoes`, "Configurações")}</>}
        {me.data?.is_admin && <><hr />{item("/admin", "Administração")}</>}
      </nav></aside>
    <section>
      <div className="dtop"><span />
        {me.data && <div className="user"><img src={avatarUrl(me.data.discord_id, me.data.avatar)} alt="" />
          <span>{me.data.global_name ?? me.data.username}</span><button className="btn sm" onClick={out}>Sair</button></div>}</div>
      <div className="dbody"><Async q={me}>{() => children}</Async></div>
    </section>
  </div>;
}