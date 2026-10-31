import { createFileRoute } from '@tanstack/react-router'
import ProductsPage from '../pages/products'

export const Route = createFileRoute('/dashboard/bots/$botId/produtos')({
  component: function Produtos() {
    const { botId } = Route.useParams()
    return <ProductsPage botId={botId} />
  },
})
