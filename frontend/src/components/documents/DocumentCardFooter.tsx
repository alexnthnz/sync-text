import { Badge } from "@/components/ui"
import { FileText, User } from "lucide-react"

interface DocumentCardFooterProps {
  isOwner: boolean
}

export function DocumentCardFooter({ isOwner }: DocumentCardFooterProps) {
  return (
    <div className="flex items-center justify-between px-6 pb-6">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          <FileText className="w-3 h-3 mr-1" />
          Document
        </Badge>
      </div>
      
      <div className="flex items-center text-xs text-muted-foreground">
        <User className="w-3 h-3 mr-1" />
        {isOwner ? "Owned" : "Shared"}
      </div>
    </div>
  )
} 