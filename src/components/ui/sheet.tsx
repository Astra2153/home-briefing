import * as React from 'react'
import * as SheetPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Sheet = SheetPrimitive.Root
const SheetTrigger = SheetPrimitive.Trigger
const SheetTitle = SheetPrimitive.Title
const SheetDescription = SheetPrimitive.Description

/**
 * Bottom sheet. `container` lets us portal it inside the phone frame
 * so it slides up from the "device", not the desktop window.
 */
function SheetContent({
  className,
  children,
  container,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { container?: HTMLElement | null }) {
  return (
    <SheetPrimitive.Portal container={container ?? undefined}>
      <SheetPrimitive.Overlay className="absolute inset-0 z-40 bg-black/40 data-[state=open]:animate-[rise-in_200ms_both]" />
      <SheetPrimitive.Content
        className={cn(
          'absolute inset-x-0 bottom-0 z-50 flex max-h-[85%] flex-col rounded-t-3xl border-t bg-card shadow-2xl',
          'data-[state=open]:animate-[rise-in_260ms_cubic-bezier(0.2,0.7,0.2,1)_both]',
          className,
        )}
        {...props}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-border" aria-hidden />
        {children}
        <SheetPrimitive.Close
          className="absolute right-3 top-3 grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-muted cursor-pointer"
          aria-label="Close"
        >
          <X className="size-5" />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

export { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription }
