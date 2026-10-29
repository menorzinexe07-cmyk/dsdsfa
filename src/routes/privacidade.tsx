import { createFileRoute } from '@tanstack/react-router'
import { Legal } from '../pages/public'
export const Route = createFileRoute('/privacidade')({ component: () => <Legal kind="privacidade" /> })
