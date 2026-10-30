import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { FAQ_DEFAULT, FEATURES, GATEWAYS, INVITE } from "../content";
import { Public } from "../ui/Shell";
import { useApi } from "../ui/api";

// ───────────────────────── tipos e helpers ─────────────────────────

type FaqItem = (typeof FAQ_DEFAULT)[number];

interface PublicSettings {
  price?: { label?: string };
  faq?: unknown;
  site?: { invite?: string; hero_title?: string; hero_text?: string };
}

/** Variáveis CSS customizadas tipadas (substitui o `["--i" as any]` espalhado). */
const vars = (v: Record<`--${string}`, string | number>) => v as CSSProperties;

/** Dá título à aba por página. Remova se o <Public> já cuida disso. */
function usePageTitle(title?: string) {
  useEffect(() => {
    if (title) document.title = `${title} | ZyraSallers`;
  }, [title]);
}

/** Remove acentos e caixa, pra "configuracao" achar "configuração". */
const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const PRECO_PADRAO = "R$ 5,00 por mês";

const useSettings = () => {
  const { data } = useApi<PublicSettings>("/api/public/settings");
  return useMemo(() => {
    const faq = data?.faq;
    return {
      price: data?.price?.label || PRECO_PADRAO,
      // se a API devolver algo que não é lista, cai no padrão em vez de quebrar o .slice()
      faq: Array.isArray(faq) && faq.length ? (faq as FaqItem[]) : FAQ_DEFAULT,
      invite: data?.site?.invite || INVITE,
      title: data?.site?.hero_title || undefined,
      text: data?.site?.hero_text || undefined,
    };
  }, [data]);
};

function ExternalLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}

// ───────────────────────── prévias demonstrativas ─────────────────────────
// (dados fictícios, sempre identificadas como exemplo)

const BARRAS_EXEMPLO = [32, 46, 38, 62, 52, 78, 70, 92];

function BotMsg({ i, title, children }: { i: number; title: string; children?: ReactNode }) {
  return <div className="msg" style={vars({ "--i": i })}>
    <div className="av">Z</div>
    <div>
      <b>ZyraSallers<span className="tag">BOT</span></b>
      <div className="embed"><strong>{title}</strong>{children}</div>
    </div>
  </div>;
}

function HeroStage() {
  return <div className="stage">
    <div className="dc" role="img" aria-label="Exemplo demonstrativo de um canal de vendas no Discord">
      <div className="dc-head"><span># pedidos</span><i>Exemplo demonstrativo</i></div>
      <div className="dc-body">
        <div className="msg" style={vars({ "--i": 0 })}>
          <div className="av u">M</div>
          <div><b>Marina</b><p>Quero o plano mensal do Produto Exemplo.</p></div>
        </div>
        <BotMsg i={1} title="Carrinho aberto">Produto Exemplo · R$ 20,00<br />Pague com PIX para continuar.</BotMsg>
        <BotMsg i={2} title="Pagamento aprovado">Pedido #1042 confirmado.</BotMsg>
        <BotMsg i={3} title="Entrega realizada">O produto foi enviado para Marina.</BotMsg>
      </div>
      <div className="dc-foot">Dados fictícios, apenas para demonstração.</div>
    </div>
    <div className="mini" aria-hidden="true">
      <div className="mini-head">Visão geral <i>Exemplo</i></div>
      <div className="mini-k">
        <div><span>Faturamento</span><b>R$ 1.240</b></div>
        <div><span>Vendas</span><b>62</b></div>
      </div>
      <div className="bars">
        {BARRAS_EXEMPLO.map((h, i) => <span key={i} style={vars({ "--h": `${h}%`, "--i": i })} />)}
      </div>
    </div>
  </div>;
}

// ───────────────────────── funcionalidades ─────────────────────────

const icone = (d: ReactNode) => <svg viewBox="0 0 24 24" focusable="false">{d}</svg>;

/** Ordem igual à de FEATURES em ../content. Tudo de um card num lugar só. */
const FEATURE_META: { icon: ReactNode; span: string; blurb: string }[] = [
  { span: "s4", blurb: "Do carrinho ao pagamento, sem sair do servidor.",
    icon: icone(<><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></>) },
  { span: "s2", blurb: "Responda clientes sem perder nenhum pedido.",
    icon: icone(<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 1 1 21 11.5Z" />) },
  { span: "s2", blurb: "Mantenha seus produtos e sua comunidade em movimento.",
    icon: icone(<><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>) },
  { span: "s4", blurb: "Controle quem entra e proteja seu servidor.",
    icon: icone(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />) },
  { span: "s6", blurb: "Ferramentas extras para o que o seu servidor precisa.",
    icon: icone(<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8z" />) },
];
const META_PADRAO = { icon: null, span: "s2", blurb: "" };

const Chips = ({ items }: { items: string[] }) =>
  <div className="chips">{items.map((i) => <span className="chip" key={i}>{i}</span>)}</div>;

function Features() {
  return <div className="bento">
    {FEATURES.map((g, i) => {
      const m = FEATURE_META[i] ?? META_PADRAO;
      return <div key={g.title} data-reveal className={`cell spot ${m.span}`}>
        <div className="ico" aria-hidden="true">{m.icon}</div>
        <h3>{g.title}</h3>
        {m.blurb && <p>{m.blurb}</p>}
        <Chips items={g.items} />
      </div>;
    })}
  </div>;
}

function Marquee() {
  const items = useMemo(() => FEATURES.flatMap((f) => f.items).slice(0, 18), []);
  // a 2ª cópia existe só pro loop da animação: some dos leitores de tela
  const row = (copia: "a" | "b") => items.map((i) =>
    <span className="chip" key={`${copia}-${i}`} aria-hidden={copia === "b" || undefined}>{i}</span>);
  return <div className="marquee" role="group" aria-label="Algumas funcionalidades do ZyraSallers">
    <div className="track">{row("a")}{row("b")}</div>
  </div>;
}

// ───────────────────────── pagamentos ─────────────────────────

const GATEWAY_SUB: Record<string, string> = {
  "Automáticos": "Confirmação automática do pagamento",
  "Integração via IMAP": "Leitura de e-mails de confirmação",
  "Modo manual": "Você confere cada pagamento",
};

function Gateways() {
  return <div className="glist">
    {GATEWAYS.map((g) => <div className="grow" data-reveal key={g.title}>
      <div><h3>{g.title}</h3>{GATEWAY_SUB[g.title] && <small>{GATEWAY_SUB[g.title]}</small>}</div>
      <Chips items={g.items} />
    </div>)}
  </div>;
}

// ───────────────────────── FAQ ─────────────────────────

function FaqList({ items, search }: { items: FaqItem[]; search?: boolean }) {
  const [q, setQ] = useState("");
  const indexado = useMemo(() => items.map((item) => ({ item, texto: normalizar(`${item.q} ${item.a}`) })), [items]);
  const lista = useMemo(() => {
    const termo = normalizar(q.trim());
    return termo ? indexado.filter((x) => x.texto.includes(termo)) : indexado;
  }, [indexado, q]);

  return <div className="faqlist">
    {search && <input className="input" type="search" placeholder="Pesquisar nas perguntas" aria-label="Pesquisar nas perguntas"
      value={q} onChange={(e) => setQ(e.target.value)} />}
    {lista.map(({ item }) => <details key={item.q} className="faq"><summary>{item.q}</summary><p>{item.a}</p></details>)}
    {!lista.length && <p className="muted" role="status">Nenhuma pergunta encontrada.</p>}
  </div>;
}

// ───────────────────────── blocos compartilhados ─────────────────────────

const BTN_SOBRE_CLARO: CSSProperties = { color: "#000", borderColor: "#d4d4d8" };

function PriceBox({ price, invite }: { price: string; invite: string }) {
  return <div className="pricebox" data-reveal>
    <div>
      <h2>ZyraSallers</h2>
      <div className="big">{price}</div>
      <p style={{ marginTop: 14 }}>Preço informado do produto.</p>
    </div>
    <div className="side">
      <ExternalLink className="btn ink lg" href={invite}>Adquirir ZyraSallers</ExternalLink>
      <a className="btn lg" style={BTN_SOBRE_CLARO} href="/dashboard">Acessar meu dashboard</a>
    </div>
  </div>;
}

function Hero({ pill, title, lead, actions, note }: {
  pill: string; title: ReactNode; lead: ReactNode; actions: ReactNode; note: ReactNode;
}) {
  return <section className="hero"><div className="wrap">
    <div>
      <span className="pill"><i aria-hidden="true" /> {pill}</span>
      <h1>{title}</h1>
      <p className="lead">{lead}</p>
      <div className="actions">{actions}</div>
      <small>{note}</small>
    </div>
    <HeroStage />
  </div></section>;
}

const PageHead = ({ title, children, narrow }: { title: string; children?: ReactNode; narrow?: boolean }) =>
  <section className="pagehead"><div className={narrow ? "wrap narrow" : "wrap"}><h1>{title}</h1>{children}</div></section>;

// ───────────────────────── páginas ─────────────────────────

const PASSOS = [
  { t: "Adquira o bot", d: "A compra acontece no servidor oficial da Zyra Applications no Discord." },
  { t: "Entre com o Discord", d: "O site identifica os bots vinculados à sua conta." },
  { t: "Acompanhe suas vendas", d: "Veja estatísticas, clientes e histórico de cada bot no dashboard." },
];

export function Home() {
  const s = useSettings();
  const faqResumo = useMemo(() => s.faq.slice(0, 5), [s.faq]);

  return <Public>
    <Hero
      pill="Bot brasileiro de vendas para Discord"
      title={s.title ?? <>Automatize suas vendas <em>dentro do Discord.</em></>}
      lead={s.text ?? "O ZyraSallers é um bot brasileiro desenvolvido pela Zyra Applications para automatizar vendas, gerenciar clientes e facilitar a administração do seu servidor Discord."}
      actions={<>
        <a className="btn solid lg" href="/zyrasallers">Conhecer o ZyraSallers</a>
        <a className="btn lg" href="/zyrasallers#funcionalidades">Ver funcionalidades</a>
      </>}
      note={<>A partir de <b>{s.price}</b></>}
    />

    <Marquee />

    <section className="sec"><div className="wrap">
      <div className="sec-head" data-reveal>
        <h2>Tudo que o seu servidor precisa para vender</h2>
        <p>Pedidos, pagamentos, clientes, divulgação e administração em um único bot.</p>
      </div>
      <Features />
    </div></section>

    <section className="sec rule" id="pagamentos"><div className="wrap">
      <div className="sec-head" data-reveal>
        <h2>Receba pelo método que você já usa</h2>
        <p>Gateways automáticos, integração via IMAP e modo manual.</p>
      </div>
      <Gateways />
    </div></section>

    <section className="sec rule"><div className="wrap">
      <div className="sec-head" data-reveal><h2>Do servidor ao painel em três passos</h2></div>
      <div className="steps">
        {PASSOS.map((p, i) => <div key={p.t} data-reveal className={`step spot${i ? ` d${i}` : ""}`}>
          <h3>{p.t}</h3><p>{p.d}</p>
        </div>)}
      </div>
    </div></section>

    <section className="sec tight"><div className="wrap"><PriceBox price={s.price} invite={s.invite} /></div></section>

    <section className="sec rule"><div className="wrap narrow">
      <div className="sec-head" data-reveal><h2>Perguntas frequentes</h2></div>
      <FaqList items={faqResumo} />
      <p style={{ marginTop: 24 }}><a href="/faq">Ver todas as perguntas</a></p>
    </div></section>

    <section className="cta"><div className="wrap">
      <h2>Pronto para vender mais pelo Discord?</h2>
      <ExternalLink className="btn solid lg" href={s.invite}>Adquirir ZyraSallers</ExternalLink>
    </div></section>
  </Public>;
}

export function Product() {
  const s = useSettings();
  usePageTitle("ZyraSallers");

  return <Public>
    <Hero
      pill="Zyra Applications"
      title="ZyraSallers"
      lead="Bot brasileiro desenvolvido pela Zyra Applications, focado em vendas automatizadas dentro do Discord. Possui ferramentas para gerenciar pedidos, pagamentos, clientes, divulgação de produtos e administração do servidor."
      actions={<>
        <ExternalLink className="btn solid lg" href={s.invite}>Adquirir ZyraSallers</ExternalLink>
        <a className="btn lg" href="/dashboard">Acessar meu dashboard</a>
      </>}
      note={<>Preço informado: <b>{s.price}</b></>}
    />
    <Marquee />

    <section className="sec" id="funcionalidades"><div className="wrap">
      <div className="sec-head" data-reveal>
        <h2>Funcionalidades</h2>
        <p>Funcionalidades informadas do produto. A disponibilidade de cada uma depende da configuração real do seu bot.</p>
      </div>
      <Features />
    </div></section>

    <section className="sec rule"><div className="wrap">
      <div className="sec-head" data-reveal><h2>Bancos e gateways de pagamento</h2></div>
      <Gateways />
    </div></section>

    <section className="sec rule"><div className="wrap narrow">
      <div className="sec-head" data-reveal><h2>Perguntas frequentes</h2></div>
      <FaqList items={s.faq} />
    </div></section>
  </Public>;
}

export function Pricing() {
  const s = useSettings();
  usePageTitle("Preços");

  return <Public>
    <PageHead title="Preços">
      <p>Este é o preço informado. Não há outros planos, taxas ou benefícios comerciais definidos nesta página.</p>
    </PageHead>
    <section className="sec tight"><div className="wrap"><PriceBox price={s.price} invite={s.invite} /></div></section>
  </Public>;
}

export function Faq() {
  const s = useSettings();
  usePageTitle("Perguntas frequentes");

  return <Public>
    <PageHead title="Perguntas frequentes" narrow />
    <section className="sec tight"><div className="wrap narrow"><FaqList items={s.faq} search /></div></section>
  </Public>;
}

// ───────────────────────── login ─────────────────────────

/** Mensagens para o público: sem nomes de variáveis de ambiente nem detalhes de infraestrutura. */
const ERROS_LOGIN: Record<string, string> = {
  state: "A verificação de segurança do login expirou. Tente entrar de novo.",
  token: "O Discord não concluiu o login. Tente novamente em instantes.",
  usuario: "Não foi possível ler seu perfil no Discord. Tente novamente.",
  banco: "Não foi possível salvar seu perfil agora. Tente novamente em instantes.",
  sessao: "Não foi possível criar sua sessão agora. Tente novamente em instantes.",
};
const ERRO_GENERICO = "Não foi possível concluir o login com o Discord. Tente novamente.";

function useMensagemLogin() {
  return useMemo(() => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.search);
    if (p.get("expirada")) return "Sua sessão expirou. Entre novamente.";
    const erro = p.get("erro");
    if (!erro) return null;
    // hasOwnProperty: evita que ?erro=constructor devolva algo de Object.prototype
    const conhecido = Object.prototype.hasOwnProperty.call(ERROS_LOGIN, erro);
    const codigo = erro.replace(/[^\w-]/g, "").slice(0, 32);
    return `${conhecido ? ERROS_LOGIN[erro] : ERRO_GENERICO} (código: ${codigo})`;
  }, []);
}

export function Login() {
  const msg = useMensagemLogin();
  usePageTitle("Entrar");

  return <Public><div className="wrap"><div className="loginbox">
    <h1 style={{ fontSize: "2.2rem" }}>Entrar</h1>
    <p style={{ margin: "14px 0 24px" }}>
      Use sua conta Discord para acessar o painel dos seus bots. Pedimos apenas a permissão de identificação: seu ID, nome e avatar.
    </p>
    {msg && <div className="state err" role="alert">{msg}</div>}
    <a className="btn solid lg" href="/api/auth/discord">Entrar com Discord</a>
  </div></div></Public>;
}

// ───────────────────────── páginas legais ─────────────────────────

/** Troque para false quando o texto jurídico for revisado: hoje esse aviso aparece pra todo visitante. */
const MOSTRAR_AVISO_MODELO = true;

interface SecaoLegal { h?: string; p: string[] }

const LEGAL: Record<"privacidade" | "termos", { titulo: string; secoes: SecaoLegal[] }> = {
  privacidade: {
    titulo: "Política de Privacidade",
    secoes: [
      { h: "Dados que coletamos", p: [
        "Ao entrar com Discord, guardamos seu ID, nome de usuário, nome global, avatar e as datas de primeiro e último acesso. Não guardamos tokens de acesso do Discord.",
        "Das vendas recebidas do Bot Manager guardamos apenas o necessário para gestão: ID, nome e ícone do cliente (quando enviados), produto, valores, método de pagamento, status e datas.",
      ] },
      { h: "Como usamos", p: [
        "Para autenticar você, identificar quais bots estão vinculados à sua conta e exibir estatísticas e histórico de vendas.",
      ] },
      { h: "Seus direitos", p: [
        "Você pode solicitar acesso, correção ou exclusão dos seus dados pelo servidor oficial no Discord, respeitadas as obrigações legais de guarda.",
      ] },
    ],
  },
  termos: {
    titulo: "Termos de Uso",
    secoes: [
      { p: [
        "Ao usar o site você concorda em acessar apenas dados dos bots vinculados à sua conta Discord, em não tentar contornar controles de acesso e em manter sigilo das credenciais de API geradas.",
        "O acesso ao painel depende da propriedade do bot registrada pela integração oficial. Condições comerciais não descritas neste site devem ser tratadas no servidor oficial da Zyra Applications.",
      ] },
    ],
  },
};

export function Legal({ kind }: { kind: "privacidade" | "termos" }) {
  const { titulo, secoes } = LEGAL[kind];
  usePageTitle(titulo);

  return <Public><section className="sec tight"><div className="wrap narrow legal">
    {MOSTRAR_AVISO_MODELO && <div className="state">Modelo inicial. Revise com assessoria jurídica antes de publicar.</div>}
    <h1 style={{ fontSize: "2.6rem" }}>{titulo}</h1>
    {secoes.map((sec, si) => <div key={sec.h ?? si}>
      {sec.h && <h3>{sec.h}</h3>}
      {sec.p.map((texto, pi) =>
        <p key={pi} style={!sec.h && si === 0 && pi === 0 ? { marginTop: 20 } : undefined}>{texto}</p>)}
    </div>)}
  </div></section></Public>;
}
