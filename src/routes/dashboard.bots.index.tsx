import { createFileRoute } from '@tanstack/react-router'
import { DashboardBots } from '../pages/dashboard'
export const Route = createFileRoute('/dashboard/bots/')({ component: DashboardBots })
