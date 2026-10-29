export const INVITE = "https://discord.gg/4ucJwmSgPR";
export const PRICE_LABEL = "R$ 5,00 por mês";

export const FEATURES: { title: string; items: string[] }[] = [
  { title: "Vendas e pagamentos", items: ["Sistema de vendas automatizadas", "Carrinho de compras", "Múltiplos gateways de pagamento",
    "Sistema de saldo", "Revenda de bots", "Templates de painéis de vendas", "Personalização dos painéis de venda"] },
  { title: "Atendimento", items: ["Sistema de tickets", "ZyraAI Helper", "Sistema de suporte e atendimento"] },
  { title: "Divulgação e engajamento", items: ["Sorteios", "Repostagem automática de produtos", "Mensagens automáticas",
    "Sistema de parceria", "Auto reação", "Sistema de afiliados"] },
  { title: "Administração e segurança", items: ["Moderação avançada", "Proteção anti-raid", "Proteção via CAPTCHA",
    "Proteção contra contas comprometidas", "Sistema de auto cargo", "Servidor Manager", "Status do servidor por canal de voz"] },
  { title: "Ferramentas adicionais", items: ["Venda de Robux", "Auth2", "Separação de contas", "Impulso Key", "Nitrada Info",
    "Código 2FA", "Sistema Designer", "Personalização total"] },
];

export const GATEWAYS = [
  { title: "Automáticos", items: ["Mercado Pago", "Efí Bank", "MisticPay", "Banco do Brasil", "PurinCash", "NyxPag"] },
  { title: "Integração via IMAP", items: ["Nubank", "Inter", "PicPay"] },
  { title: "Modo manual", items: ["Pagamento sem confirmação automática, com análise manual"] },
];

export const FAQ_DEFAULT: { q: string; a: string }[] = [
  { q: "O que é o ZyraSallers?", a: "É um bot desenvolvido pela Zyra Applications para automatizar vendas e facilitar a administração de operações comerciais dentro do Discord." },
  { q: "Quanto custa o ZyraSallers?", a: "O preço informado é de R$ 5,00 por mês." },
  { q: "Quais formas de pagamento são compatíveis?", a: "O produto informa suporte a Mercado Pago, Efí Bank, MisticPay, Banco do Brasil, PurinCash e NyxPag no modo automático, além de integrações via IMAP e pagamentos manuais." },
  { q: "Quais funcionalidades estão disponíveis?", a: "O ZyraSallers oferece ferramentas de vendas, tickets, sorteios, Robux, Auth2, divulgação automática, moderação, segurança e diversas outras opções." },
  { q: "Como adquirir o bot?", a: `A aquisição é realizada pelo servidor oficial da Zyra Applications no Discord: ${INVITE}` },
  { q: "Como acessar meu painel?", a: "Entre no site utilizando sua conta Discord. Após a autenticação, o sistema verificará se existe algum bot vinculado ao seu usuário." },
  { q: "Não aparece nenhum bot no meu dashboard. O que faço?", a: "Verifique se está utilizando a conta Discord correta. Caso ainda não tenha adquirido um bot, acesse o servidor da Zyra Applications para realizar a compra." },
  { q: "Como acompanho minhas vendas?", a: "Se houver um bot vinculado à sua conta, selecione-o no dashboard para visualizar as estatísticas e os registros de vendas enviados pela integração." },
];
