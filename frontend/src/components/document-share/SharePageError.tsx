import { Button } from "@/components/ui"
import { ArrowLeft } from "lucide-react"

interface SharePageErrorProps {
  error: string
  onBackToDocuments: () => void
}

export function SharePageError({ error, onBackToDocuments }: SharePageErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <h2 className="text-2xl font-semibold text-destructive mb-2">
        Error Loading Document
      </h2>
      <p className="text-muted-foreground mb-4">{error}</p>
      <Button variant="outline" onClick={onBackToDocuments}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Documents
      </Button>
    </div>
  )
} 