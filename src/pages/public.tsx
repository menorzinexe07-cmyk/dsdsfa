import { useEffect, useMemo, useState } from "react";
import { FAQ_DEFAULT, FEATURES, GATEWAYS, INVITE } from "../content";
import { Public } from "../ui/Shell";
import { cacheClear, useApi } from "../ui/api";

const useSettings = () => {
  const s = useApi<any>("/api/public/settings");
  return { price: s.data?.price?.label ?? "R$ 5,00 por mês", faq: (s.data?.faq as typeof FAQ_DEFAULT) ?? FAQ_DEFAULT,
    invite: s.data?.site?.invite ?? INVITE, title: s.data?.site?.hero_title, text: s.data?.site?.hero_text };
};

/* ---------- prévias demonstrativas: dados fictícios, sempre marcados como exemplo ---------- */
function Phone() {
  const rows = [["Produto Exemplo", "agora", "+ R$ 20,00"], ["Plano Mensal", "há 4 min", "+ R$ 38,50"], ["Produto Pro", "há 8 min", "+ R$ 59,90"]];
  return <div className="phone" role="img" aria-label="Exemplo demonstrativo do painel no celular">
    <div className="phone-notch" />
    <div className="phone-screen">
      <div className="ph-status"><span>9:41</span><span>5G</span></div>
      <div className="ph-toast"><span className="av">Z</span>
        <div><b>ZyraSallers</b><small>agora</small><p>Venda aprovada de R$ 20,00</p></div></div>
      <div className="ph-wallet"><small>Faturamento do mês</small><b>R$ 1.240,00</b><i>+ R$ 60,00 hoje</i></div>
      <h4>Últimas vendas</h4>
      <ul className="ph-list">{rows.map(([n, t, v]) => <li key={n}><span><b>{n}</b><small>{t}</small></span><em>{v}</em></li>)}</ul>
      <div className="ph-tag">Exemplo demonstrativo</div>
    </div>
  </div>;
}

type Msg = { title: string; text: string; btn?: string };
const MOCKS: { channel: string; lead: string; msgs: Msg[] }[] = [
  { channel: "loja", lead: "Do carrinho ao pagamento, sem sair do servidor.", msgs: [
    { title: "Produto Exemplo", text: "Valor à vista: R$ 20,00", btn: "Comprar" },
    { title: "Carrinho aberto", text: "Escolha a forma de pagamento para continuar." },
    { title: "Pagamento aprovado", text: "Pedido #1042 confirmado." }] },
  { channel: "ticket-0042", lead: "Receba pedidos de ajuda e responda sem perder nenhum.", msgs: [
    { title: "Ticket aberto", text: "Cliente pediu ajuda com um pedido.", btn: "Assumir" },
    { title: "Atendimento", text: "A equipe respondeu no canal do ticket." }] },
  { channel: "sorteios", lead: "Mantenha seus produtos e sua comunidade em movimento.", msgs: [
    { title: "Sorteio", text: "Prêmio: Produto Exemplo", btn: "Participar" },
    { title: "Mensagem automática", text: "Novidades do servidor publicadas no canal." }] },
  { channel: "seguranca", lead: "Controle quem entra e proteja seu servidor.", msgs: [
    { title: "Proteção anti-raid", text: "Entradas em massa monitoradas." },
    { title: "Verificação CAPTCHA", text: "Novo membro aguardando verificação." },
    { title: "Auto cargo", text: "Cargo aplicado ao novo membro." }] },
  { channel: "ferramentas", lead: "Ferramentas extras para o que o seu servidor precisa.", msgs: [
    { title: "Código 2FA", text: "Ferramenta disponível no bot." },
    { title: "Venda de Robux", text: "Ferramenta disponível no bot." }] },
];

function FeatureTabs() {
  const [i, setI] = useState(0);
  const g = FEATURES[i], m = MOCKS[i];
  return <div className="ftabs">
    <div className="ftab-list" role="tablist" aria-label="Categorias de funcionalidades">
      {FEATURES.map((f, k) => <button key={f.title} role="tab" id={`tab-${k}`} aria-selected={k === i} aria-controls="tabpanel"
        className={k === i ? "on" : ""} onClick={() => setI(k)}>{f.title}</button>)}
    </div>
    <div className="ftab-panel" id="tabpanel" role="tabpanel" aria-labelledby={`tab-${i}`}>
      <div className="ftab-info"><h3>{g.title}</h3><p>{m.lead}</p>
        <div className="chips">{g.items.map((it) => <span className="chip" key={it}>{it}</span>)}</div></div>
      <div className="mock" key={i}>
        <div className="mock-head"># {m.channel}<i>Exemplo demonstrativo</i></div>
        <div className="mock-body">{m.msgs.map((x, k) => <div className="mock-msg" key={k} style={{ ["--i" as any]: k }}>
          <div className="av">Z</div><div><b>ZyraSallers<span className="tag">BOT</span></b>
            <div className="embed"><strong>{x.title}</strong>{x.text}</div>{x.btn && <span className="mbtn">{x.btn}</span>}</div></div>)}</div>
      </div>
    </div>
  </div>;
}

function PanelMock() {
  const bars = [30, 44, 36, 58, 50, 74, 66, 88, 70, 94];
  return <div className="win" role="img" aria-label="Exemplo demonstrativo do painel de vendas">
    <div className="win-bar"><i /><i /><i /><span>zyra-apps.xyz/dashboard</span><em>Exemplo demonstrativo</em></div>
    <div className="win-body">
      <div className="win-kpis">
        <div><small>Faturamento</small><b>R$ 1.240,00</b></div><div><small>Vendas</small><b>62</b></div>
        <div><small>Ticket médio</small><b>R$ 20,00</b></div><div><small>Clientes</small><b>38</b></div></div>
      <div className="win-chart">{bars.map((h, k) => <span key={k} style={{ height: `${h}%` }} />)}</div>
      <ul className="win-list"><li><span className="cav ph">M</span>Marina<small>Produto Exemplo</small><em>R$ 20,00</em></li>
        <li><span className="cav ph">L</span>Lucas<small>Plano Mensal</small><em>R$ 38,50</em></li></ul>
    </div>
  </div>;
}

function Marquee() {
  const items = GATEWAYS.flatMap((g) => g.title === "Modo manual" ? ["Pagamento manual"] : g.items);
  const row = (hidden?: boolean) => items.map((i) => <span className="chip" key={i + (hidden ? "b" : "")} aria-hidden={hidden}>{i}</span>);
  return <div className="marquee" aria-label="Gateways de pagamento compatíveis"><div className="track">{row()}{row(true)}</div></div>;
}

const Chips = ({ items }: { items: string[] }) => <div className="chips">{items.map((i) => <span className="chip" key={i}>{i}</span>)}</div>;

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
    {list.map((i, k) => <details key={i.q} className="faq"><summary><span><span className="fnum">{String(k + 1).padStart(2, "0")}</span>{i.q}</span></summary><p>{i.a}</p></details>)}
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

const autoGateways = GATEWAYS[0].items.length, imapBanks = GATEWAYS[1].items.length;
function Stats({ price }: { price: string }) {
  return <div className="stats wrap" data-reveal>
    <div><b>{price.replace(" por mês", "")}</b><span>por mês</span></div>
    <div><b>{autoGateways}</b><span>gateways automáticos</span></div>
    <div><b>{imapBanks}</b><span>bancos via IMAP</span></div>
    <div><b>PT-BR</b><span>bot e painel em português</span></div>
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
          <a className="btn lg" href="#recursos">Ver funcionalidades</a></div></div>
      <Phone /></div></section>

    <Stats price={s.price} />

    <section className="sec" id="recursos"><div className="wrap">
      <div className="sec-head" data-reveal><h2>O bot cuida do servidor inteiro</h2>
        <p>Cada aba mostra uma parte do que o ZyraSallers oferece dentro do seu servidor.</p></div>
      <FeatureTabs /></div></section>

    <section className="sec rule" id="pagamentos"><div className="wrap">
      <div className="sec-head" data-reveal><h2>Receba pelo método que você já usa</h2><p>Gateways automáticos, integração via IMAP e modo manual.</p></div></div>
      <Marquee /><div className="wrap" style={{ marginTop: 40 }}><Gateways /></div></section>

    <section className="sec rule"><div className="wrap two2">
      <div data-reveal><h2>Acompanhe tudo no seu painel</h2>
        <p className="lead2">Entre com o Discord e veja os bots vinculados à sua conta, com estatísticas, clientes e histórico de vendas de cada um.</p>
        <ol className="steps2">
          <li><b>Adquira o bot</b><span>A compra acontece no servidor oficial da Zyra Applications no Discord.</span></li>
          <li><b>Entre com o Discord</b><span>O site identifica os bots vinculados à sua conta.</span></li>
          <li><b>Acompanhe suas vendas</b><span>Estatísticas, clientes e histórico de cada bot, no computador ou no celular.</span></li></ol>
        <a className="btn solid" href="/login">Acessar painel</a></div>
      <div data-reveal><PanelMock /></div></div></section>

    <section className="sec tight"><div className="wrap"><PriceBox price={s.price} invite={s.invite} /></div></section>

    <section className="sec rule"><div className="wrap two2 top">
      <div data-reveal><h2>Antes de começar</h2><p className="lead2">Ficou com alguma pergunta que não está aqui? Fale com a gente no Discord.</p>
        <a className="btn" href={s.invite} target="_blank" rel="noreferrer">Entrar no Discord</a></div>
      <div><FaqList items={s.faq.slice(0, 6)} /><p style={{ marginTop: 22 }}><a href="/faq">Ver todas as perguntas</a></p></div></div></section>

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
        <small className="muted" style={{ display: "block", marginTop: 22 }}>Preço informado: <b style={{ color: "#fff" }}>{s.price}</b></small></div>
      <Phone /></div></section>
    <Stats price={s.price} />
    <section className="sec" id="funcionalidades"><div className="wrap">
      <div className="sec-head" data-reveal><h2>Funcionalidades</h2>
        <p>Funcionalidades informadas do produto. A disponibilidade de cada uma depende da configuração real do seu bot.</p></div><FeatureTabs /></div></section>
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
  const me = useApi<any>("/api/me");
  useEffect(() => { if (me.data?.discord_id) window.location.replace("/dashboard"); }, [me.data]); // já conectado: vai direto
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
    {me.data?.discord_id ? <div className="state">Você já está conectado. Abrindo o painel…</div>
      : <a className="btn solid lg" href="/api/auth/discord">Entrar com Discord</a>}
    <p className="muted" style={{ marginTop: 18, fontSize: ".88rem" }}>Neste aparelho você continua conectado por até 60 dias de uso.</p></div></div></Public>;
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
