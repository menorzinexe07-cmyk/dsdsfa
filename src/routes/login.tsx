import { createFileRoute } from '@tanstack/react-router'
import { Login } from '../pages/public'
export const Route = createFileRoute('/login')({ component: Login })
