import type { ComponentProps } from 'react'

const assetPath = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

interface BrandCloseProps extends ComponentProps<'div'> {}

export function BrandClose({ ref }: BrandCloseProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-[3.2vmin] opacity-0"
      ref={ref}
      style={{ willChange: 'transform, opacity' }}
    >
      <img alt="" className="h-[32vmin] w-auto object-contain" src={assetPath('commonagent-logo.png')} />
      <div className="flex flex-col items-center gap-[1.6vmin]">
        <h1
          className="text-[10.2vmin] leading-none text-white/95"
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 600,
            letterSpacing: '-0.02em',
            textShadow: '0 2px 24px rgba(0,0,0,0.45)'
          }}
        >
          CommonAgent
        </h1>
        <p
          className="text-[2vmin] uppercase tracking-[0.42em] text-white/50"
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          Smarter Together
        </p>
      </div>
    </div>
  )
}
