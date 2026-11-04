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

// Comandos do bot (55 slash + 4 menus de contexto). `menu: true` = menu de contexto (clique direito numa mensagem), não começa com "/".
export interface Comando { nome: string; desc: string; menu?: boolean }
export const COMANDOS: { id: string; titulo: string; curto: string; itens: Comando[] }[] = [
  { id: "admin", titulo: "Administração e moderação", curto: "Administração", itens: [
    { nome: "panel", desc: "Painel principal para configurar as funções e os módulos do bot." },
    { nome: "perms", desc: "Gerencia os usuários autorizados a administrar o sistema." },
    { nome: "resetar-tudo", desc: "Restaura o bot para as configurações de fábrica." },
    { nome: "backup", desc: "Configura o sistema de proteção e backup do servidor." },
    { nome: "ban", desc: "Bane um membro do servidor." },
    { nome: "kick", desc: "Expulsa um membro do servidor." },
    { nome: "mute", desc: "Silencia temporariamente um membro." },
    { nome: "clear", desc: "Limpa mensagens de um canal." },
    { nome: "lock", desc: "Tranca um canal de texto." },
    { nome: "unlock", desc: "Destranca um canal de texto." },
    { nome: "nuke", desc: "Executa a ação de nuke em um canal." },
    { nome: "cargo-all", desc: "Atribui um cargo aos membros que ainda não o possuem." },
    { nome: "say", desc: "Envia uma mensagem como o bot." },
    { nome: "create_emojis", desc: "Cria os emojis padrão do bot." },
    { nome: "criar_cupom", desc: "Cria um cupom de desconto." },
    { nome: "apagar-cupom", desc: "Apaga um cupom de desconto." },
    { nome: "vincular_clientes", desc: "Vincula clientes ao servidor." },
    { nome: "deletartickets", desc: "Deleta todos os tickets." },
    { nome: "checker_entrega", desc: "Consulta os dados de um pedido pelo código do pedido." },
    { nome: "entregar", desc: "Aprova um carrinho." },
    { nome: "gerar_pix", desc: "Gera uma cobrança/pagamento via Pix." },
    { nome: "image_save", desc: "Salva uma imagem e gera um link público." },
    { nome: "webhook", desc: "Cria um webhook e envia a URL por mensagem privada." },
    { nome: "calladd", desc: "Entra no canal de voz indicado e toca uma música." },
  ] },
  { id: "zyragram", titulo: "ZyraGram", curto: "ZyraGram", itens: [
    { nome: "zyragram", desc: "Instala o ZyraGram no servidor Discord." },
    { nome: "zyragram-config", desc: "Configura o sistema ZyraGram." },
    { nome: "post", desc: "Publica e gerencia postagens do ZyraGram." },
    { nome: "buscar", desc: "Busca contas, postagens ou hashtags no ZyraGram." },
    { nome: "comentario", desc: "Lista, edita ou exclui comentários." },
    { nome: "minha-conta", desc: "Mostra seu perfil do ZyraGram." },
    { nome: "editar-conta", desc: "Edita o nome, a bio ou o avatar da conta." },
    { nome: "desinstalar", desc: "Exclui sua conta do ZyraGram." },
  ] },
  { id: "banco", titulo: "ZyraBank e jogos", curto: "ZyraBank e jogos", itens: [
    { nome: "zyrabank", desc: "Mostra seu saldo de Zcoins e Zpay e sua classificação no banco." },
    { nome: "daily", desc: "Resgata os Zcoins diários." },
    { nome: "pay", desc: "Transfere Zcoins para outro usuário." },
    { nome: "transferir-zcoin", desc: "Transfere valores entre Zcoins e Zpay." },
    { nome: "roubar", desc: "Tenta roubar Zpay de outro usuário; a chance de sucesso é de 25%." },
    { nome: "apostar", desc: "Aposta Zpay no ZyraAp e tenta escapar das bombas." },
    { nome: "cara-coroa", desc: "Desafia alguém para Cara ou Coroa apostando Zpay." },
    { nome: "rank", desc: "Mostra a classificação de gastos do servidor." },
    { nome: "jogo-velha", desc: "Joga jogo da velha contra outra pessoa ou contra o robô." },
    { nome: "ship", desc: "Calcula a compatibilidade entre duas pessoas." },
  ] },
  { id: "util", titulo: "Utilidades e comunidade", curto: "Utilidades", itens: [
    { nome: "afk", desc: "Marca você como ausente e informa o motivo." },
    { nome: "unafk", desc: "Encerra seu status de ausência." },
    { nome: "calculadora", desc: "Calcula expressões; sem expressão, abre o teclado da calculadora." },
    { nome: "motivação", desc: "Envia uma frase motivacional aleatória." },
    { nome: "clear-dm", desc: "Apaga, na sua DM, mensagens enviadas pelo bot." },
    { nome: "convites", desc: "Mostra quantas pessoas um usuário convidou para o servidor." },
    { nome: "profile", desc: "Mostra seu perfil." },
    { nome: "bater", desc: "Mostra uma cena de anime de um usuário batendo em outro." },
    { nome: "sacudir", desc: "Mostra uma cena de anime sacudindo um usuário." },
    { nome: "clima", desc: "Mostra o clima atual e a previsão de uma cidade brasileira." },
    { nome: "google", desc: "Pesquisa na internet." },
    { nome: "terminal", desc: "Executa código em várias linguagens em uma sandbox." },
    { nome: "music", desc: "Toca uma música em um canal de voz." },
  ] },
  { id: "menus", titulo: "Menus de contexto", curto: "Menus de contexto", itens: [
    { nome: "Manage Items", desc: "No menu de contexto de uma mensagem, gerencia campos de um item.", menu: true },
    { nome: "Manage Product", desc: "No menu de contexto de uma mensagem, abre o gerenciamento do produto.", menu: true },
    { nome: "Manage Stock", desc: "No menu de contexto de uma mensagem, gerencia o estoque do produto.", menu: true },
    { nome: "User Profile", desc: "No menu de contexto de uma mensagem, abre o perfil do autor.", menu: true },
  ] },
];
export const TOTAL_SLASH = COMANDOS.reduce((a, g) => a + g.itens.filter((c) => !c.menu).length, 0);
export const TOTAL_MENUS = COMANDOS.reduce((a, g) => a + g.itens.filter((c) => c.menu).length, 0);
