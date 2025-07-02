import { Button } from "@/components/ui"
import { FileText, Plus } from "lucide-react"
import type { DocumentFilter } from "@/types"

interface DocumentsEmptyStateProps {
  searchQuery?: string
  filter: DocumentFilter
  onCreateDocument?: () => void
  isCreating?: boolean
}

export function DocumentsEmptyState({ 
  searchQuery, 
  filter,
  onCreateDocument, 
  isCreating = false 
}: DocumentsEmptyStateProps) {
  // Messages for different filter types
  const messages = {
    accessible: 'No documents yet',
    owned: 'No documents created yet',
    shared: 'No shared documents yet'
  }
  
  const descriptions = {
    accessible: 'Create your first document to get started',
    owned: 'Create a new document to begin writing',
    shared: 'Documents shared with you will appear here'
  }

  // Search-specific messages
  if (searchQuery) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
        <FileText className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          No documents found
        </h3>
        <p className="text-muted-foreground max-w-md">
          No documents match your search for &ldquo;{searchQuery}&rdquo;. Try adjusting your search terms.
        </p>
      </div>
    )
  }

  // Filter-specific empty states
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
      <FileText className="w-12 h-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold text-muted-foreground mb-2">
        {messages[filter]}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {descriptions[filter]}
      </p>
      {(filter === 'accessible' || filter === 'owned') && onCreateDocument && (
        <Button onClick={onCreateDocument} size="lg" disabled={isCreating}>
          <Plus className="w-4 h-4 mr-2" />
          {isCreating ? 'Creating...' : 'Create Document'}
        </Button>
      )}
    </div>
  )
} 