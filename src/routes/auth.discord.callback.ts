import { createFileRoute } from '@tanstack/react-router'
import { handleCallback } from '../server/auth'
export const Route = createFileRoute('/auth/discord/callback')({
  server: { handlers: { GET: ({ request }) => handleCallback(request) } },
})
