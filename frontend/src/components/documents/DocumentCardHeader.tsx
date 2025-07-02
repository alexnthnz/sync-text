import { useRouter } from "next/navigation"
import { 
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui"
import { Calendar } from "lucide-react"
import type { Document } from "@/types"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { DocumentCardActions } from "./DocumentCardActions"

dayjs.extend(relativeTime)

interface DocumentCardHeaderProps {
  document: Document
  isOwner: boolean
  onDelete: (document: Document) => void
}

export function DocumentCardHeader({ document, isOwner, onDelete }: DocumentCardHeaderProps) {
  const router = useRouter()

  return (
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0" onClick={() => router.push(`/documents/${document.id}`)}>
          <CardTitle className="text-lg font-semibold truncate group-hover:text-blue-600 transition-colors">
            {document.title || "Untitled Document"}
          </CardTitle>
          <CardDescription className="flex items-center gap-2 mt-1">
            <Calendar className="w-3 h-3" />
            {dayjs(document.updatedAt).fromNow()}
          </CardDescription>
        </div>
        
        <DocumentCardActions 
          document={document}
          isOwner={isOwner}
          onDelete={onDelete}
        />
      </div>
    </CardHeader>
  )
} 