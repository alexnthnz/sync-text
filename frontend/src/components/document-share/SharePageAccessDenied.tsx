import { Button } from "@/components/ui"
import { ArrowLeft } from "lucide-react"

interface SharePageAccessDeniedProps {
  onBackToDocument: () => void
}

export function SharePageAccessDenied({ onBackToDocument }: SharePageAccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
      <p className="text-muted-foreground mb-4">
        Only the document owner can manage sharing settings.
      </p>
      <Button variant="outline" onClick={onBackToDocument}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Document
      </Button>
    </div>
  )
} 