import { createFileRoute } from '@tanstack/react-router'
import { BotPage } from '../pages/dashboard'
export const Route = createFileRoute('/dashboard/bots/$botId/integracao')({
  component: () => { const { botId } = Route.useParams(); return <BotPage botId={botId} tab="integracao" /> },
})
