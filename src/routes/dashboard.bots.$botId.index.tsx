import { createFileRoute, redirect } from '@tanstack/react-router'
export const Route = createFileRoute('/dashboard/bots/$botId/')({
  beforeLoad: ({ params }) => { throw redirect({ href: `/dashboard/bots/${encodeURIComponent(params.botId)}/visao-geral` }) },
})
