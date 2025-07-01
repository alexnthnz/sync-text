"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { connectAutoDispatch } from "@/store"
import type { RootState, Document } from "@/store"
import { 
  getDocuments, 
  deleteDocument, 
  createDocument
} from "@/actions"
import { type GetDocumentsQueryData } from "@/schemas"
import { 
  Button,
  Input,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Skeleton,
  Separator
} from "@/components/ui"
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Share2, 
  FileText,
  Calendar,
  User,
  Users
} from "lucide-react"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"

dayjs.extend(relativeTime)

interface DocumentsPageProps {
  setDocuments: (documents: Document[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string) => void
  clearError: () => void
  documents: Document[]
  isLoading: boolean
  error: string | null
}

const DocumentsPage = ({
  setDocuments,
  setLoading,
  setError,
  clearError,
  documents,
  isLoading,
  error
}: DocumentsPageProps) => {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<"accessible" | "owned">("accessible")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch documents
  const fetchDocumentsList = useCallback(async (query?: GetDocumentsQueryData) => {
    setLoading(true)
    clearError()
    
    const result = await getDocuments(query)
    
    if (result.success && result.data) {
      setDocuments(result.data)
    } else {
      setError(result.message)
    }
    
    setLoading(false)
  }, [setLoading, clearError, setDocuments, setError])

  // Initial load
  useEffect(() => {
    fetchDocumentsList({ filter: activeFilter, limit: 20 })
  }, [fetchDocumentsList, activeFilter])

  // Search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchDocumentsList({ 
        filter: activeFilter, 
        search: searchQuery || undefined,
        limit: 20
      })
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, activeFilter, fetchDocumentsList])

  // Handle create document
  const handleCreateDocument = async () => {
    const result = await createDocument({ 
      title: "Untitled Document",
      content: "" 
    })
    
    if (result.success && result.data) {
      router.push(`/documents/${result.data.id}`)
    } else {
      setError(result.message)
    }
  }

  // Handle delete document
  const handleDeleteDocument = async () => {
    if (!documentToDelete) return

    setIsDeleting(true)
    const result = await deleteDocument(documentToDelete.id)
    
    if (result.success) {
      // Remove from documents list
      setDocuments(documents.filter(doc => doc.id !== documentToDelete.id))
      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
    } else {
      setError(result.message)
    }
    
    setIsDeleting(false)
  }

  // Handle filter change
  const handleFilterChange = (value: string) => {
    if (value === "accessible" || value === "owned") {
      setActiveFilter(value)
    }
  }

  // Render document card
  const renderDocumentCard = (document: Document) => (
    <Card key={document.id} className="group hover:shadow-md transition-shadow cursor-pointer">
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
              <DropdownMenuItem onClick={() => router.push(`/documents/${document.id}/share`)}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => {
                  setDocumentToDelete(document)
                  setDeleteDialogOpen(true)
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0" onClick={() => router.push(`/documents/${document.id}`)}>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
          {document.content ? 
            document.content.substring(0, 150) + (document.content.length > 150 ? "..." : "") :
            "No content yet. Click to start writing..."
          }
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              Document
            </Badge>
          </div>
          
          <div className="flex items-center text-xs text-muted-foreground">
            <User className="w-3 h-3 mr-1" />
            {document.ownerId ? "Owned" : "Shared"}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Render loading skeleton
  const renderSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3 mb-4" />
        <div className="flex justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  )

  // Render empty state
  const renderEmptyState = () => (
    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
      <FileText className="w-12 h-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold text-muted-foreground mb-2">
        {searchQuery ? "No documents found" : "No documents yet"}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {searchQuery 
          ? `No documents match "${searchQuery}". Try adjusting your search terms.`
          : "Get started by creating your first document. It's easy and only takes a moment."
        }
      </p>
      {!searchQuery && (
        <Button onClick={handleCreateDocument} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Create Your First Document
        </Button>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Create, edit, and collaborate on documents
          </p>
        </div>
        
        <Button onClick={handleCreateDocument} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          New Document
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Tabs value={activeFilter} onValueChange={handleFilterChange}>
          <TabsList className="grid w-full grid-cols-2 lg:w-auto">
            <TabsTrigger value="accessible" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              All Documents
            </TabsTrigger>
            <TabsTrigger value="owned" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              My Documents
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/15 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>{renderSkeleton()}</div>
          ))
        ) : documents.length > 0 ? (
          // Document cards
          documents.map(renderDocumentCard)
        ) : (
          // Empty state
          renderEmptyState()
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{documentToDelete?.title || 'Untitled Document'}"? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteDocument}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default connectAutoDispatch(
  (state: RootState) => ({
    documents: state.documents.documents,
    isLoading: state.documents.isLoading,
    error: state.documents.error,
  }),
  {
    setDocuments: (documents: Document[]) => ({ type: 'documents/setDocuments', payload: documents }),
    setLoading: (loading: boolean) => ({ type: 'documents/setLoading', payload: loading }),
    setError: (error: string) => ({ type: 'documents/setError', payload: error }),
    clearError: () => ({ type: 'documents/clearError' }),
  }
)(DocumentsPage) 