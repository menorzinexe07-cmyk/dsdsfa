import { createFileRoute } from '@tanstack/react-router'
import { Legal } from '../pages/public'
export const Route = createFileRoute('/termos')({ component: () => <Legal kind="termos" /> })
