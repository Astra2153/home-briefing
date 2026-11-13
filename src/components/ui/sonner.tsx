import { Toaster as Sonner, type ToasterProps } from 'sonner'

function Toaster({ theme, ...props }: ToasterProps) {
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: '!rounded-2xl !border !bg-card !text-card-foreground !shadow-lg !font-sans',
          description: '!text-muted-foreground',
          actionButton: '!bg-primary !text-primary-foreground !rounded-full !font-semibold',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
