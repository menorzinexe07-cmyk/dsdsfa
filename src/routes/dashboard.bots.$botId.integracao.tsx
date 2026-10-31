import { createFileRoute, redirect } from '@tanstack/react-router'
// A aba "Integração" não existe mais: o controle do bot fica em Configurações.
export const Route = createFileRoute('/dashboard/bots/$botId/integracao')({
  beforeLoad: ({ params }) => { throw redirect({ href: `/dashboard/bots/${encodeURIComponent(params.botId)}/configuracoes` }) },
})
