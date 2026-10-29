import { createFileRoute } from '@tanstack/react-router'
import { DashboardHome } from '../pages/dashboard'
export const Route = createFileRoute('/dashboard/')({ component: DashboardHome })
