import { Card } from "@/components/ui"
import type { Document } from "@/types"
import { DocumentCardHeader } from "./DocumentCardHeader"
import { DocumentCardContent } from "./DocumentCardContent"
import { DocumentCardFooter } from "./DocumentCardFooter"

interface DocumentCardProps {
  document: Document
  currentUserId?: string
  onDelete: (document: Document) => void
}

export function DocumentCard({ document, currentUserId, onDelete }: DocumentCardProps) {
  const isOwner = currentUserId === document.ownerId

  return (
    <Card className="group hover:shadow-md transition-shadow cursor-pointer">
      <DocumentCardHeader 
        document={document}
        isOwner={isOwner}
        onDelete={onDelete}
      />
      
      <DocumentCardContent document={document} />
      
      <DocumentCardFooter isOwner={isOwner} />
    </Card>
  )
} 