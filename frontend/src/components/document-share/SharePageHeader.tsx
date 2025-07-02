import { Button, Badge } from "@/components/ui"
import { ArrowLeft, Users } from "lucide-react"

interface SharePageHeaderProps {
  documentTitle: string
  collaboratorsCount: number
  onBackToDocument: () => void
}

export function SharePageHeader({
  documentTitle,
  collaboratorsCount,
  onBackToDocument
}: SharePageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBackToDocument}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Document
        </Button>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            Owner
          </Badge>
          <Badge variant="outline" className="text-xs">
            Managing access
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-sm font-medium">{documentTitle}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" />
            {collaboratorsCount} collaborator{collaboratorsCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  )
} 