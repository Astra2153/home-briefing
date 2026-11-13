import { forwardRef, type ReactNode } from 'react'
import { BatteryFull, Wifi } from 'lucide-react'
import { clock } from '@/lib/time'

interface Props {
  now: number
  children: ReactNode
}

/**
 * Phone-sized frame on desktop; full-bleed on real phones (<500px).
 * `transform` on the screen makes position:fixed children (toasts) and the
 * bottom sheet stay inside the "device" instead of the browser window.
 */
export const PhoneFrame = forwardRef<HTMLDivElement, Props>(({ now, children }, ref) => (
  <div className="relative mx-auto w-full min-[500px]:w-[390px] min-[500px]:rounded-[54px] min-[500px]:bg-bezel min-[500px]:p-[10px] min-[500px]:shadow-[0_30px_80px_-20px_rgba(15,25,35,0.45)]">
    <div
      ref={ref}
      className="relative flex h-[100dvh] flex-col overflow-hidden bg-background [transform:translateZ(0)] min-[500px]:h-[812px] min-[500px]:rounded-[44px]"
    >
      {/* Fake OS status bar, only when we're drawing the device */}
      <div
        className="hidden h-11 shrink-0 items-center justify-between px-8 pt-1 text-[13px] font-semibold min-[500px]:flex"
        aria-hidden
      >
        <span>{clock(now).replace(/ (AM|PM)/, '')}</span>
        <span className="absolute left-1/2 top-2.5 h-[26px] w-[96px] -translate-x-1/2 rounded-full bg-bezel" />
        <span className="flex items-center gap-1.5">
          <Wifi className="size-4" />
          <BatteryFull className="size-[18px]" />
        </span>
      </div>
      {children}
    </div>
  </div>
))
PhoneFrame.displayName = 'PhoneFrame'
