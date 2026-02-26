/**
 * Glass Panel - Ultimate premium glass morphism
 * Health tech aesthetic perfection
 */
import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'subtle' | 'medium' | 'strong'
  glow?: boolean
  magnetic?: boolean
  breathe?: boolean
}

export function GlassPanel({
  className,
  variant = 'medium',
  glow = false,
  magnetic = false,
  breathe = false,
  children,
  ...props
}: GlassPanelProps) {
  const variants = {
    subtle: 'bg-card border-border backdrop-blur-xl ring-1 ring-border',
    medium: 'bg-card border-border backdrop-blur-xl ring-1 ring-border shadow-lg',
    strong: 'bg-card/60 border-border backdrop-blur-2xl ring-1 ring-border shadow-xl'
  }
  
  const Component = magnetic ? motion.div : 'div'
  const motionProps = magnetic ? {
    whileHover: { 
      scale: 1.01, 
      y: -1,
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
    },
    whileTap: { 
      scale: 0.99,
      transition: { duration: 0.1 }
    }
  } : {}
  
  return (
    <Component
      className={cn(
        'relative rounded-2xl border transition-all duration-300',
        variants[variant],
        glow && 'shadow-[0_0_40px_-15px_hsl(var(--primary)/0.25)]',
        breathe && 'animate-breathe',
        magnetic && 'hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)]',
        className
      )}
      {...motionProps}
      {...props}
    >
      {/* Multi-layer depth effect */}
      <div className="absolute inset-0 rounded-2xl">
        {/* Base glass layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-white/[0.01] rounded-2xl" />
        
        {/* Shimmer layer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-shimmer rounded-2xl" />
        
        {/* Inner highlight */}
        <div className="absolute inset-0 border border-white/[0.02] rounded-2xl pointer-events-none" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </Component>
  )
}