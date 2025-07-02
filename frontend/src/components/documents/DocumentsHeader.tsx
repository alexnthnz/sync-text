import { Button } from "@/components/ui"
import { Plus, RefreshCcw } from "lucide-react"

interface DocumentsHeaderProps {
  onCreateDocument: () => void
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function DocumentsHeader({ onCreateDocument, onRefresh, isRefreshing = false }: DocumentsHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          Create, edit, and collaborate on documents
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        {onRefresh && (
          <Button 
            onClick={onRefresh} 
            variant="outline"
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
        
        <Button onClick={onCreateDocument} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          New Document
        </Button>
      </div>
    </div>
  )
} 