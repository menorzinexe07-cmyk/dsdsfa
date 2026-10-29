import { useMemo, useState } from "react";
import { FAQ_DEFAULT, FEATURES, GATEWAYS, INVITE } from "../content";
import { Public } from "../ui/Shell";
import { useApi } from "../ui/api";

const useSettings = () => {
  const s = useApi<any>("/api/public/settings");
  return { price: s.data?.price?.label ?? "R$ 5,00 por mês", faq: (s.data?.faq as typeof FAQ_DEFAULT) ?? FAQ_DEFAULT,
    invite: s.data?.site?.invite ?? INVITE, title: s.data?.site?.hero_title, text: s.data?.site?.hero_text };
};

// Prévia demonstrativa: canal de vendas de um servidor. Dados fictícios, identificados como exemplo.
function DiscordDemo() {
  return <div className="dc" role="img" aria-label="Exemplo demonstrativo de um canal de vendas no Discord">
    <div className="dc-head"><span># pedidos</span><i>Exemplo demonstrativo</i></div>
    <div className="dc-body">
      <div className="msg" style={{ ["--i" as any]: 0 }}><div className="av u">M</div>
        <div><b>Marina</b><p>Quero o plano mensal do Produto Exemplo.</p></div></div>
      <div className="msg" style={{ ["--i" as any]: 1 }}><div className="av">Z</div>
        <div><b>ZyraSallers<span className="tag">BOT</span></b>
          <div className="embed"><strong>Carrinho aberto</strong>Produto Exemplo · R$ 20,00<br />Pague com PIX para continuar.</div></div></div>
      <div className="msg" style={{ ["--i" as any]: 2 }}><div className="av">Z</div>
        <div><b>ZyraSallers<span className="tag">BOT</span></b>
          <div className="embed"><strong>Pagamento aprovado</strong>Pedido #1042 confirmado.</div></div></div>
      <div className="msg" style={{ ["--i" as any]: 3 }}><div className="av">Z</div>
        <div><b>ZyraSallers<span className="tag">BOT</span></b>
          <div className="embed"><strong>Entrega realizada</strong>O produto foi enviado para Marina.</div></div></div>
    </div>
    <div className="dc-foot">Dados fictícios, apenas para demonstração.</div>
  </div>;
}

const Chips = ({ items }: { items: string[] }) => <div className="chips">{items.map((i) => <span className="chip" key={i}>{i}</span>)}</div>;

const SPAN = ["s4", "s2", "s2", "s4", "s6"];
const BLURB = [
  "Do carrinho ao pagamento, sem sair do servidor.",
  "Responda clientes sem perder nenhum pedido.",
  "Mantenha seus produtos e sua comunidade em movimento.",
  "Controle quem entra e proteja seu servidor.",
  "Ferramentas extras para o que o seu servidor precisa.",
];
function Features() {
  return <div className="bento">{FEATURES.map((g, i) => <div key={g.title} className={`cell ${SPAN[i] ?? "s2"}`}>
    <h3>{g.title}</h3><p>{BLURB[i]}</p><Chips items={g.items} /></div>)}</div>;
}

const GSUB: Record<string, string> = { "Automáticos": "Confirmação automática do pagamento", "Integração via IMAP": "Leitura de e-mails de confirmação", "Modo manual": "Você confere cada pagamento" };
function Gateways() {
  return <div className="glist">{GATEWAYS.map((g) => <div className="grow" key={g.title}>
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
  return <div className="pricebox">
    <div><h2>ZyraSallers</h2><div className="big">{price}</div><p style={{ marginTop: 14 }}>Preço informado do produto.</p></div>
    <div className="side"><a className="btn ink lg" href={invite} target="_blank" rel="noreferrer">Adquirir ZyraSallers</a>
      <a className="btn lg" style={{ color: "#000", borderColor: "#d4d4d8" }} href="/dashboard">Acessar meu dashboard</a></div>
  </div>;
}

export function Home() {
  const s = useSettings();
  return <Public>
    <section className="hero"><div className="wrap">
      <div><h1>{s.title ?? "Automatize suas vendas dentro do Discord."}</h1>
        <p className="lead">{s.text ?? "O ZyraSallers é um bot brasileiro desenvolvido pela Zyra Applications para automatizar vendas, gerenciar clientes e facilitar a administração do seu servidor Discord."}</p>
        <div className="actions"><a className="btn solid lg" href="/zyrasallers">Conhecer o ZyraSallers</a>
          <a className="btn lg" href="/zyrasallers#funcionalidades">Ver funcionalidades</a></div>
        <small>A partir de <b>{s.price}</b></small></div>
      <DiscordDemo /></div></section>

    <section className="sec rule"><div className="wrap">
      <div className="sec-head"><h2>Tudo que o seu servidor precisa para vender</h2>
        <p>Pedidos, pagamentos, clientes, divulgação e administração em um único bot.</p></div>
      <Features /></div></section>

    <section className="sec rule" id="pagamentos"><div className="wrap">
      <div className="sec-head"><h2>Receba pelo método que você já usa</h2><p>Gateways automáticos, integração via IMAP e modo manual.</p></div>
      <Gateways /></div></section>

    <section className="sec rule"><div className="wrap">
      <div className="sec-head"><h2>Do servidor ao painel em três passos</h2></div>
      <div className="steps">
        <div className="step"><h3>Adquira o bot</h3><p>A compra acontece no servidor oficial da Zyra Applications no Discord.</p></div>
        <div className="step"><h3>Entre com o Discord</h3><p>O site identifica os bots vinculados à sua conta.</p></div>
        <div className="step"><h3>Acompanhe suas vendas</h3><p>Veja estatísticas, clientes e histórico de cada bot no dashboard.</p></div>
      </div></div></section>

    <section className="sec tight"><div className="wrap"><PriceBox price={s.price} invite={s.invite} /></div></section>

    <section className="sec rule"><div className="wrap narrow">
      <div className="sec-head"><h2>Perguntas frequentes</h2></div>
      <FaqList items={s.faq.slice(0, 5)} /><p style={{ marginTop: 24 }}><a href="/faq">Ver todas as perguntas</a></p></div></section>

    <section className="cta"><div className="wrap"><h2>Pronto para vender mais pelo Discord?</h2>
      <a className="btn solid lg" href={s.invite} target="_blank" rel="noreferrer">Adquirir ZyraSallers</a></div></section>
  </Public>;
}

export function Product() {
  const s = useSettings();
  return <Public>
    <section className="hero"><div className="wrap">
      <div><h1>ZyraSallers</h1>
        <p className="lead">Bot brasileiro desenvolvido pela Zyra Applications, focado em vendas automatizadas dentro do Discord. Possui ferramentas para gerenciar pedidos, pagamentos, clientes, divulgação de produtos e administração do servidor.</p>
        <div className="actions"><a className="btn solid lg" href={s.invite} target="_blank" rel="noreferrer">Adquirir ZyraSallers</a>
          <a className="btn lg" href="/dashboard">Acessar meu dashboard</a></div>
        <small>Preço informado: <b>{s.price}</b></small></div>
      <DiscordDemo /></div></section>
    <section className="sec rule" id="funcionalidades"><div className="wrap">
      <div className="sec-head"><h2>Funcionalidades</h2>
        <p>Funcionalidades informadas do produto. A disponibilidade de cada uma depende da configuração real do seu bot.</p></div><Features /></div></section>
    <section className="sec rule"><div className="wrap">
      <div className="sec-head"><h2>Bancos e gateways de pagamento</h2></div><Gateways /></div></section>
    <section className="sec rule"><div className="wrap narrow"><div className="sec-head"><h2>Perguntas frequentes</h2></div><FaqList items={s.faq} /></div></section>
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
  const p = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const msg = p.get("expirada") ? "Sua sessão expirou. Entre novamente."
    : p.get("erro") ? "Não foi possível concluir o login com o Discord. Tente novamente." : null;
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
      <p>Das vendas recebidas do Bot Manager guardamos apenas o necessário para gestão: ID e nome do cliente (quando enviados), produto, valores, status e datas.</p>
      <h3>Como usamos</h3><p>Para autenticar você, identificar quais bots estão vinculados à sua conta e exibir estatísticas e histórico de vendas.</p>
      <h3>Seus direitos</h3><p>Você pode solicitar acesso, correção ou exclusão dos seus dados pelo servidor oficial no Discord, respeitadas as obrigações legais de guarda.</p>
    </> : <>
      <h1 style={{ fontSize: "2.6rem" }}>Termos de Uso</h1>
      <p style={{ marginTop: 20 }}>Ao usar o site você concorda em acessar apenas dados dos bots vinculados à sua conta Discord, em não tentar contornar controles de acesso e em manter sigilo das credenciais de API geradas.</p>
      <p>O acesso ao painel depende da propriedade do bot registrada pela integração oficial. Condições comerciais não descritas neste site devem ser tratadas no servidor oficial da Zyra Applications.</p>
    </>}
  </div></section></Public>;
}