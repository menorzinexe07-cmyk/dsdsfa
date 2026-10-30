import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FAQ_DEFAULT, FEATURES, GATEWAYS, INVITE } from "../content";
import { Public } from "../ui/Shell";
import { cacheClear, useApi } from "../ui/api";

const useSettings = () => {
  const s = useApi<any>("/api/public/settings");
  return { price: s.data?.price?.label ?? "R$ 5,00 por mês", faq: (s.data?.faq as typeof FAQ_DEFAULT) ?? FAQ_DEFAULT,
    invite: s.data?.site?.invite ?? INVITE, title: s.data?.site?.hero_title, text: s.data?.site?.hero_text };
};

// ---- prévias demonstrativas (dados fictícios, sempre identificadas como exemplo) ----
function HeroStage() {
  const bars = [32, 46, 38, 62, 52, 78, 70, 92];
  return <div className="stage">
    <div className="dc" role="img" aria-label="Exemplo demonstrativo de um canal de vendas no Discord">
      <div className="dc-head"><span># pedidos</span><i>Exemplo demonstrativo</i></div>
      <div className="dc-body">
        <div className="msg" style={{ ["--i" as any]: 0 }}><div className="av u">M</div><div><b>Marina</b><p>Quero o plano mensal do Produto Exemplo.</p></div></div>
        <div className="msg" style={{ ["--i" as any]: 1 }}><div className="av">Z</div><div><b>ZyraSallers<span className="tag">BOT</span></b>
          <div className="embed"><strong>Carrinho aberto</strong>Produto Exemplo · R$ 20,00<br />Pague com PIX para continuar.</div></div></div>
        <div className="msg" style={{ ["--i" as any]: 2 }}><div className="av">Z</div><div><b>ZyraSallers<span className="tag">BOT</span></b>
          <div className="embed"><strong>Pagamento aprovado</strong>Pedido #1042 confirmado.</div></div></div>
        <div className="msg" style={{ ["--i" as any]: 3 }}><div className="av">Z</div><div><b>ZyraSallers<span className="tag">BOT</span></b>
          <div className="embed"><strong>Entrega realizada</strong>O produto foi enviado para Marina.</div></div></div>
      </div>
      <div className="dc-foot">Dados fictícios, apenas para demonstração.</div>
    </div>
    <div className="mini" aria-hidden="true">
      <div className="mini-head">Visão geral <i>Exemplo</i></div>
      <div className="mini-k"><div><span>Faturamento</span><b>R$ 1.240</b></div><div><span>Vendas</span><b>62</b></div></div>
      <div className="bars">{bars.map((h, i) => <span key={i} style={{ ["--h" as any]: `${h}%`, ["--i" as any]: i }} />)}</div>
    </div>
  </div>;
}

const ICONS: ReactNode[] = [
  <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>,
  <svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 1 1 21 11.5Z" /></svg>,
  <svg viewBox="0 0 24 24"><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>,
  <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  <svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8z" /></svg>,
];
const SPAN = ["s4", "s2", "s2", "s4", "s6"];
const BLURB = ["Do carrinho ao pagamento, sem sair do servidor.", "Responda clientes sem perder nenhum pedido.",
  "Mantenha seus produtos e sua comunidade em movimento.", "Controle quem entra e proteja seu servidor.", "Ferramentas extras para o que o seu servidor precisa."];

const Chips = ({ items }: { items: string[] }) => <div className="chips">{items.map((i) => <span className="chip" key={i}>{i}</span>)}</div>;

function Features() {
  return <div className="bento">{FEATURES.map((g, i) => <div key={g.title} data-reveal className={`cell spot ${SPAN[i] ?? "s2"}`}>
    <div className="ico">{ICONS[i]}</div><h3>{g.title}</h3><p>{BLURB[i]}</p><Chips items={g.items} /></div>)}</div>;
}

function Marquee() {
  const items = FEATURES.flatMap((f) => f.items).slice(0, 18);
  const row = (hidden?: boolean) => items.map((i) => <span className="chip" key={i + (hidden ? "b" : "")} aria-hidden={hidden}>{i}</span>);
  return <div className="marquee" aria-label="Algumas funcionalidades do ZyraSallers"><div className="track">{row()}{row(true)}</div></div>;
}

const GSUB: Record<string, string> = { "Automáticos": "Confirmação automática do pagamento", "Integração via IMAP": "Leitura de e-mails de confirmação", "Modo manual": "Você confere cada pagamento" };
function Gateways() {
  return <div className="glist">{GATEWAYS.map((g) => <div className="grow" data-reveal key={g.title}>
    <div><h3>{g.title}</h3><small>{GSUB[g.title]}</small></div><Chips items={g.items} /></div>)}</div>;
}

function FaqList({ items, search }: { items: typeof FAQ_DEFAULT; search?: boolean }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => items.filter((i) => (i.q + i.a).toLowerCase().includes(q.toLowerCase())), [items, q]);
  return <div className="faqlist">
    {search && <input className="input" placeholder="Pesquisar nas perguntas" value={q} onChange={(e) => setQ(e.target.value)} />}
    {list.map((i) => <details key={i.q} className="faq"><summary>{i.q}</summary><p>{i.a}</p></details>)}
    {!list.length && <p className="muted">Nenhuma pergunta encontrada.</p>}
  </div>;
}

function PriceBox({ price, invite }: { price: string; invite: string }) {
  return <div className="pricebox" data-reveal>
    <div><h2>ZyraSallers</h2><div className="big">{price}</div><p style={{ marginTop: 14 }}>Preço informado do produto.</p></div>
    <div className="side"><a className="btn ink lg" href={invite} target="_blank" rel="noreferrer">Adquirir ZyraSallers</a>
      <a className="btn lg" style={{ color: "#000", borderColor: "#d4d4d8" }} href="/dashboard">Acessar meu dashboard</a></div>
  </div>;
}

export function Home() {
  const s = useSettings();
  return <Public>
    <section className="hero"><div className="wrap">
      <div><span className="pill"><i /> Bot brasileiro de vendas para Discord</span>
        <h1>{s.title ?? <>Automatize suas vendas <em>dentro do Discord.</em></>}</h1>
        <p className="lead">{s.text ?? "O ZyraSallers é um bot brasileiro desenvolvido pela Zyra Applications para automatizar vendas, gerenciar clientes e facilitar a administração do seu servidor Discord."}</p>
        <div className="actions"><a className="btn solid lg" href="/zyrasallers">Conhecer o ZyraSallers</a>
          <a className="btn lg" href="/zyrasallers#funcionalidades">Ver funcionalidades</a></div>
        <small>A partir de <b>{s.price}</b></small></div>
      <HeroStage /></div></section>

    <Marquee />

    <section className="sec"><div className="wrap">
      <div className="sec-head" data-reveal><h2>Tudo que o seu servidor precisa para vender</h2>
        <p>Pedidos, pagamentos, clientes, divulgação e administração em um único bot.</p></div>
      <Features /></div></section>

    <section className="sec rule" id="pagamentos"><div className="wrap">
      <div className="sec-head" data-reveal><h2>Receba pelo método que você já usa</h2><p>Gateways automáticos, integração via IMAP e modo manual.</p></div>
      <Gateways /></div></section>

    <section className="sec rule"><div className="wrap">
      <div className="sec-head" data-reveal><h2>Do servidor ao painel em três passos</h2></div>
      <div className="steps">
        <div className="step spot" data-reveal><h3>Adquira o bot</h3><p>A compra acontece no servidor oficial da Zyra Applications no Discord.</p></div>
        <div className="step spot d1" data-reveal><h3>Entre com o Discord</h3><p>O site identifica os bots vinculados à sua conta.</p></div>
        <div className="step spot d2" data-reveal><h3>Acompanhe suas vendas</h3><p>Veja estatísticas, clientes e histórico de cada bot no dashboard.</p></div>
      </div></div></section>

    <section className="sec tight"><div className="wrap"><PriceBox price={s.price} invite={s.invite} /></div></section>

    <section className="sec rule"><div className="wrap narrow">
      <div className="sec-head" data-reveal><h2>Perguntas frequentes</h2></div>
      <FaqList items={s.faq.slice(0, 5)} /><p style={{ marginTop: 24 }}><a href="/faq">Ver todas as perguntas</a></p></div></section>

    <section className="cta"><div className="wrap"><h2>Pronto para vender mais pelo Discord?</h2>
      <a className="btn solid lg" href={s.invite} target="_blank" rel="noreferrer">Adquirir ZyraSallers</a></div></section>
  </Public>;
}

export function Product() {
  const s = useSettings();
  return <Public>
    <section className="hero"><div className="wrap">
      <div><span className="pill"><i /> Zyra Applications</span><h1>ZyraSallers</h1>
        <p className="lead">Bot brasileiro desenvolvido pela Zyra Applications, focado em vendas automatizadas dentro do Discord. Possui ferramentas para gerenciar pedidos, pagamentos, clientes, divulgação de produtos e administração do servidor.</p>
        <div className="actions"><a className="btn solid lg" href={s.invite} target="_blank" rel="noreferrer">Adquirir ZyraSallers</a>
          <a className="btn lg" href="/dashboard">Acessar meu dashboard</a></div>
        <small>Preço informado: <b>{s.price}</b></small></div>
      <HeroStage /></div></section>
    <Marquee />
    <section className="sec" id="funcionalidades"><div className="wrap">
      <div className="sec-head" data-reveal><h2>Funcionalidades</h2>
        <p>Funcionalidades informadas do produto. A disponibilidade de cada uma depende da configuração real do seu bot.</p></div><Features /></div></section>
    <section className="sec rule"><div className="wrap">
      <div className="sec-head" data-reveal><h2>Bancos e gateways de pagamento</h2></div><Gateways /></div></section>
    <section className="sec rule"><div className="wrap narrow"><div className="sec-head" data-reveal><h2>Perguntas frequentes</h2></div><FaqList items={s.faq} /></div></section>
  </Public>;
}

export function Pricing() {
  const s = useSettings();
  return <Public>
    <section className="pagehead"><div className="wrap"><h1>Preços</h1>
      <p>Este é o preço informado. Não há outros planos, taxas ou benefícios comerciais definidos nesta página.</p></div></section>
    <section className="sec tight"><div className="wrap"><PriceBox price={s.price} invite={s.invite} /></div></section>
  </Public>;
}

export function Faq() {
  const s = useSettings();
  return <Public>
    <section className="pagehead"><div className="wrap narrow"><h1>Perguntas frequentes</h1></div></section>
    <section className="sec tight"><div className="wrap narrow"><FaqList items={s.faq} search /></div></section>
  </Public>;
}

export function Login() {
  useEffect(() => { cacheClear(); }, []); // nunca mostrar dados em cache de outra conta
  const p = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const erro = p.get("erro");
  const HINT: Record<string, string> = {
    state: "A verificação de segurança do login expirou. Tente entrar de novo.",
    token: "O Discord recusou o código de login. Confira o DISCORD_CLIENT_SECRET e o redirect cadastrado.",
    usuario: "Não foi possível ler seu perfil no Discord. Tente novamente.",
    banco: "Não foi possível salvar seu perfil. Confira SUPABASE_URL, a chave de serviço e as migrações do banco.",
    sessao: "Não foi possível criar sua sessão. Confira as migrações do banco.",
  };
  const msg = p.get("expirada") ? "Sua sessão expirou. Entre novamente."
    : erro ? `${HINT[erro] ?? "Não foi possível concluir o login com o Discord. Tente novamente."} (código: ${erro})` : null;
  return <Public><div className="wrap"><div className="loginbox"><h1 style={{ fontSize: "2.2rem" }}>Entrar</h1>
    <p style={{ margin: "14px 0 24px" }}>Use sua conta Discord para acessar o painel dos seus bots. Pedimos apenas a permissão de identificação: seu ID, nome e avatar.</p>
    {msg && <div className="state err">{msg}</div>}
    <a className="btn solid lg" href="/api/auth/discord">Entrar com Discord</a></div></div></Public>;
}

export function Legal({ kind }: { kind: "privacidade" | "termos" }) {
  return <Public><section className="sec tight"><div className="wrap narrow legal">
    <div className="state">Modelo inicial. Revise com assessoria jurídica antes de publicar.</div>
    {kind === "privacidade" ? <>
      <h1 style={{ fontSize: "2.6rem" }}>Política de Privacidade</h1>
      <h3>Dados que coletamos</h3><p>Ao entrar com Discord, guardamos seu ID, nome de usuário, nome global, avatar e as datas de primeiro e último acesso. Não guardamos tokens de acesso do Discord.</p>
      <p>Das vendas recebidas do Bot Manager guardamos apenas o necessário para gestão: ID, nome e ícone do cliente (quando enviados), produto, valores, método de pagamento, status e datas.</p>
      <h3>Como usamos</h3><p>Para autenticar você, identificar quais bots estão vinculados à sua conta e exibir estatísticas e histórico de vendas.</p>
      <h3>Seus direitos</h3><p>Você pode solicitar acesso, correção ou exclusão dos seus dados pelo servidor oficial no Discord, respeitadas as obrigações legais de guarda.</p>
    </> : <>
      <h1 style={{ fontSize: "2.6rem" }}>Termos de Uso</h1>
      <p style={{ marginTop: 20 }}>Ao usar o site você concorda em acessar apenas dados dos bots vinculados à sua conta Discord, em não tentar contornar controles de acesso e em manter sigilo das credenciais de API geradas.</p>
      <p>O acesso ao painel depende da propriedade do bot registrada pela integração oficial. Condições comerciais não descritas neste site devem ser tratadas no servidor oficial da Zyra Applications.</p>
    </>}
  </div></section></Public>;
}
