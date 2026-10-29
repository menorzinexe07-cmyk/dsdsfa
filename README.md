# Zyra Apps

Site oficial da Zyra Applications + painel dos compradores do ZyraSallers + API privada para o Bot Manager.
Stack: TanStack Start (React, SSR) · Supabase (PostgreSQL) · Discord OAuth2.

## Ligar em 6 passos

1. **Instale:** `npm install`
2. **Variáveis:** `cp .env.example .env` e preencha (tabela abaixo).
3. **Banco:** no SQL Editor do Supabase rode, em ordem, `supabase/migrations/001_base.sql` e `002_dashboard.sql`.
4. **Discord:** em discord.com/developers > seu app > OAuth2, cadastre o redirect igual ao `DISCORD_REDIRECT_URI` (ex.: `http://localhost:3000/auth/discord/callback`). O site usa apenas o escopo `identify`.
5. **Rode:** `npm run dev` e abra http://localhost:3000. Entre com Discord uma vez.
6. **Admin:** edite `supabase/seed_admin.sql` com seu ID Discord e rode no SQL Editor. Depois, em `/admin` > Credenciais, crie a credencial do Bot Manager (bots: `*`). O segredo `zy_...` aparece uma única vez.

Produção: `npm run build && npm start` (porta 3000; `npm start -- --port=8080` para mudar). Use HTTPS: em produção os cookies são `Secure`.

## Variáveis (.env)
| Nome | Onde pegar |
|---|---|
| SUPABASE_URL | Supabase > Project Settings > API |
| SUPABASE_SERVICE_ROLE_KEY | idem (chave secreta; só servidor) |
| DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET | Developer Portal > OAuth2 |
| DISCORD_REDIRECT_URI | igual ao cadastrado no portal |
| APP_URL | URL pública do site (checagem de Origin contra CSRF) |

## Estrutura
```
supabase/
  migrations/001_base.sql        tabelas, RLS, funções de ingestão
  migrations/002_dashboard.sql   estatísticas, clientes, preço inicial
  seed_admin.sql                 seu primeiro admin
src/
  server/    auth.ts · api.ts (API do Bot Manager) · dashboardApi.ts · adminApi.ts · queries.ts · router.ts · db.ts
  pages/     public.tsx · dashboard.tsx · admin.tsx
  ui/        api.ts · kit.tsx (gráficos, tabela, estados) · Shell.tsx
  routes/    rotas do TanStack (api.$.ts é o catch-all de /api/*)
  content.ts textos do produto, funcionalidades, gateways e FAQ padrão
  styles.css
```

## Integrando o Bot Manager (Authorization: Bearer zy_...)
| Método | Rota |
|---|---|
| GET | /api/v1/health |
| POST | /api/v1/apps/purchases |
| POST | /api/v1/apps/sales |
| PATCH | /api/v1/apps/sales/:saleId?bot_id=...  corpo: {"status":"refunded"} |
| GET | /api/v1/apps/users/:discordUserId/bots |
| GET | /api/v1/apps/:botId/sales · /stats · /customers |

Respostas: 401 credencial inválida · 403 bot não autorizado · 422 payload inválido · 429 limite · 404 bot inexistente.
Reenviar o mesmo `event_id` devolve 200 com `duplicate: true`.

Teste:
```
curl -X POST http://localhost:3000/api/v1/apps/purchases -H "Authorization: Bearer zy_..." -H "content-type: application/json" \
 -d '{"event_id":"e1","bot_id":"bot_123","discord_user_id":"SEU_ID_DISCORD","bot_name":"ZyraSallers","purchase_id":"c1","status":"confirmed","purchased_at":"2026-10-29T12:00:00Z"}'
curl -X POST http://localhost:3000/api/v1/apps/sales -H "Authorization: Bearer zy_..." -H "content-type: application/json" \
 -d '{"event_id":"e2","bot_id":"bot_123","sale_id":"v1","customer":{"discord_user_id":"123456789012345678","name":"Cliente"},"product":{"id":"p1","name":"Produto"},"amount_gross":20,"fees":1,"amount_net":19,"status":"approved","sold_at":"2026-10-29T12:30:00Z"}'
```
Depois do primeiro `purchases` confirmado, o bot aparece em `/dashboard` para aquele ID Discord.

## Regras importantes
- Receita, ticket médio e clientes únicos contam só vendas `approved`.
- Bruto, taxas e líquido são guardados como o Manager envia (nulos se ausentes); o site não calcula taxas.
- Dono só acessa bots com vínculo ativo; bot alheio responde 404. Admin = linha em `platform_admins`.
- Preço, FAQ, convite e textos da home se editam em `/admin` > Configurações do site.

## Limitações conhecidas
- Rate limit em memória (use Redis/Upstash com várias instâncias).
- Sem tabela `sale_items`: cada venda guarda um produto.
- Termos e Privacidade são modelos; revise com assessoria jurídica.
- Testado: build, typecheck, páginas e API respondendo, validação e rejeição de credencial. Não testado: OAuth real com o Discord e consultas contra um Supabase real.
