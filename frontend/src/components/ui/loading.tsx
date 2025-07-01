import { cn } from "@/lib/utils"

interface LoadingProps {
  variant?: "spinner" | "dots" | "pulse"
  size?: "sm" | "md" | "lg"
  text?: string
  fullScreen?: boolean
  className?: string
}

export function Loading({ 
  variant = "spinner", 
  size = "md", 
  text = "Loading...", 
  fullScreen = false,
  className 
}: LoadingProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  }

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  }

  const containerClasses = cn(
    "flex flex-col items-center justify-center gap-3",
    fullScreen && "min-h-screen",
    className
  )

  const renderSpinner = () => (
    <div 
      className={cn(
        "animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600",
        sizeClasses[size]
      )}
    />
  )

  const renderDots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "rounded-full bg-indigo-600 animate-pulse",
            size === "sm" && "w-1 h-1",
            size === "md" && "w-2 h-2", 
            size === "lg" && "w-3 h-3"
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: "1s"
          }}
        />
      ))}
    </div>
  )

  const renderPulse = () => (
    <div 
      className={cn(
        "rounded-full bg-indigo-600 animate-pulse",
        sizeClasses[size]
      )}
    />
  )

  const renderVariant = () => {
    switch (variant) {
      case "dots":
        return renderDots()
      case "pulse":
        return renderPulse()
      default:
        return renderSpinner()
    }
  }

  return (
    <div className={containerClasses}>
      {renderVariant()}
      {text && (
        <p className={cn("text-gray-600 font-medium", textSizeClasses[size])}>
          {text}
        </p>
      )}
    </div>
  )
}

// Convenience components for common use cases
export function FullScreenLoading({ text = "Loading..." }: { text?: string }) {
  return <Loading variant="spinner" size="lg" text={text} fullScreen />
}

export function PageLoading({ text = "Loading page..." }: { text?: string }) {
  return <Loading variant="spinner" size="md" text={text} fullScreen />
}

export function ComponentLoading({ text }: { text?: string }) {
  return <Loading variant="dots" size="sm" text={text} />
} 