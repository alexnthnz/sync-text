import { useRouter } from "next/navigation"
import { CardContent } from "@/components/ui"
import type { Document } from "@/types"

interface DocumentCardContentProps {
  document: Document
}

export function DocumentCardContent({ document }: DocumentCardContentProps) {
  const router = useRouter()

  return (
    <CardContent className="pt-0" onClick={() => router.push(`/documents/${document.id}`)}>
      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
        {document.content ? 
          document.content.substring(0, 150) + (document.content.length > 150 ? "..." : "") :
          "No content yet. Click to start writing..."
        }
      </p>
    </CardContent>
  )
} 