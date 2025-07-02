import { useRouter } from "next/navigation"
import { 
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui"
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Share2
} from "lucide-react"
import type { Document } from "@/types"

interface DocumentCardActionsProps {
  document: Document
  isOwner: boolean
  onDelete: (document: Document) => void
}

export function DocumentCardActions({ document, isOwner, onDelete }: DocumentCardActionsProps) {
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/documents/${document.id}`)}>
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </DropdownMenuItem>
        {isOwner && (
          <DropdownMenuItem onClick={() => router.push(`/documents/${document.id}/share`)}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-destructive"
          onClick={() => onDelete(document)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 