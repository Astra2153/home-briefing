import { CircleCheck, Eye, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { Level, VerdictState } from '@/lib/triage'

/**
 * Severity is always shown as colour + icon + words, never colour alone.
 */
export interface SeverityMeta {
  label: string
  Icon: LucideIcon
  text: string
  soft: string
  solid: string
  badge: 'calm' | 'attention' | 'urgent'
}

export const SEVERITY: Record<VerdictState, SeverityMeta> = {
  calm: {
    label: 'All clear',
    Icon: CircleCheck,
    text: 'text-calm',
    soft: 'bg-calm-soft',
    solid: 'bg-calm',
    badge: 'calm',
  },
  attention: {
    label: 'Worth a look',
    Icon: Eye,
    text: 'text-attention',
    soft: 'bg-attention-soft',
    solid: 'bg-attention',
    badge: 'attention',
  },
  urgent: {
    label: 'Act now',
    Icon: TriangleAlert,
    text: 'text-urgent',
    soft: 'bg-urgent-soft',
    solid: 'bg-urgent',
    badge: 'urgent',
  },
}

export const levelToState = (l: Level): VerdictState => (l === 'info' ? 'calm' : l)
