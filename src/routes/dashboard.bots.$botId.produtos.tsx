import { createFileRoute } from '@tanstack/react-router'
import { Fields } from '../pages/fields'
export const Route = createFileRoute('/dashboard/bots/$botId/campos/$productId')({
  component: () => { const { botId, productId } = Route.useParams(); return <Fields botId={botId} productId={productId} /> },
})
