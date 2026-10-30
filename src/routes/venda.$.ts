import { createFileRoute } from '@tanstack/react-router'
import { handleApi } from '../server/router'
const h = ({ request }: { request: Request }) => handleApi(request)
export const Route = createFileRoute('/venda/$')({
  server: { handlers: { GET: h, POST: h } },
})
