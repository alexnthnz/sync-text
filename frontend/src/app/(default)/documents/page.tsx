"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useSelector, useDispatch } from "react-redux"
import { 
  getDocuments, 
  deleteDocument, 
  createDocument
} from "@/actions"
import type { Document, DocumentFilter } from "@/types"
import type { RootState } from "@/store"
import {
  setLoading,
  setDocuments,
  setError,
  addDocument,
  removeDocument,
  selectDocuments,
  selectPagination,
  selectIsLoading,
  selectError,
  selectDocumentCounts,
} from "@/store/slices/documentSlice"
import {
  DocumentsHeader,
  DocumentsFilterTabs,
  DocumentCard,
  DocumentsLoadingSkeleton,
  DocumentsEmptyState,
  DeleteDocumentDialog,
  DocumentsPagination
} from "@/components/documents"
import { 
  Button
} from "@/components/ui"
import { AlertCircle } from "lucide-react"

// Helper functions to parse URL parameters
const getFilterFromUrl = (searchParams: URLSearchParams): DocumentFilter => {
  const filter = searchParams.get('filter')
  return (filter === 'owned' || filter === 'shared') ? filter : 'accessible'
}

const getPageFromUrl = (searchParams: URLSearchParams): number => {
  const page = parseInt(searchParams.get('page') || '1', 10)
  return page > 0 ? page : 1
}

// Main documents page component
export default function DocumentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const dispatch = useDispatch()
  
  // Core state - simplified approach
  const [activeFilter, setActiveFilter] = useState<DocumentFilter>(() => getFilterFromUrl(searchParams))
  const [currentPage, setCurrentPage] = useState<number>(() => getPageFromUrl(searchParams))
  
  // UI state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Redux selectors
  const documents = useSelector((state: RootState) => selectDocuments(state, activeFilter))
  const pagination = useSelector((state: RootState) => selectPagination(state, activeFilter))
  const isLoading = useSelector((state: RootState) => selectIsLoading(state, activeFilter))
  const error = useSelector((state: RootState) => selectError(state, activeFilter))
  const documentCounts = useSelector((state: RootState) => selectDocumentCounts(state))

  // Initialize state from URL on mount
  useEffect(() => {
    const urlFilter = getFilterFromUrl(searchParams)
    const urlPage = getPageFromUrl(searchParams)
    
    setActiveFilter(urlFilter)
    setCurrentPage(urlPage)
  }, [searchParams])

  // Fetch documents function - with Redux integration and cache checking
  const fetchDocuments = useCallback(async (forceFetch = false) => {
    // Check if we already have data for this filter and page
    const hasData = documents.length > 0 && pagination && !isLoading
    const isCurrentPage = pagination?.currentPage === currentPage
    
    console.log(`[${activeFilter}] Cache check:`, {
      hasData,
      isCurrentPage,
      documentsCount: documents.length,
      currentPage,
      paginationPage: pagination?.currentPage,
      forceFetch
    })
    
    // Skip fetch if we have data for the current page and not forcing
    if (hasData && isCurrentPage && !forceFetch) {
      console.log(`[${activeFilter}] ✅ Using cached data for page ${currentPage}`)
      return
    }
    
    // If we receive no data, don't keep fetching
    if (!forceFetch && pagination && pagination.totalCount === 0) {
      console.log(`[${activeFilter}] ⏹️ No data found, stopping fetch loop`)
      return
    }
    
    console.log(`[${activeFilter}] 📡 Fetching: page=${currentPage}`)
    
    dispatch(setLoading({ filter: activeFilter, isLoading: true }))
    
    try {
      const result = await getDocuments({ 
        filter: activeFilter, 
        limit: 20,
        page: currentPage
      })
      
      if (result.success && result.data) {
        console.log(`[${activeFilter}] ✅ Success: ${result.data.documents.length} documents`)
        dispatch(setDocuments({ 
          filter: activeFilter, 
          documents: result.data.documents,
          pagination: result.data.pagination
        }))
      } else {
        console.error(`[${activeFilter}] ❌ Error:`, result.message)
        dispatch(setError({ 
          filter: activeFilter, 
          error: result.message || 'Failed to fetch documents' 
        }))
      }
    } catch (err) {
      console.error(`[${activeFilter}] 💥 Exception:`, err)
      dispatch(setError({ 
        filter: activeFilter, 
        error: err instanceof Error ? err.message : 'Failed to fetch documents' 
      }))
    }
  }, [dispatch, activeFilter, currentPage, documents, pagination, isLoading])

  // Fetch documents when dependencies change
  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams()
    
    if (activeFilter !== 'accessible') {
      params.set('filter', activeFilter)
    }
    if (currentPage > 1) {
      params.set('page', currentPage.toString())
    }
    
    const newUrl = `/documents${params.toString() ? `?${params.toString()}` : ''}`
    
    // Only update URL if it's different from current
    const currentUrl = window.location.pathname + window.location.search
    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false })
    }
  }, [activeFilter, currentPage, router])

  // Event handlers
  const handleCreateDocument = async () => {
    setIsCreating(true)
    try {
      const result = await createDocument({ 
        title: "Untitled Document",
        content: "" 
      })
      
      if (result.success && result.data) {
        const doc = result.data as Document
        // Add to Redux store
        dispatch(addDocument({ 
          document: doc, 
          currentUserId: session?.user?.id 
        }))
        router.push(`/documents/${doc.id}`)
      } else {
        dispatch(setError({ 
          filter: activeFilter, 
          error: result.message || 'Failed to create document' 
        }))
      }
    } catch (err) {
      dispatch(setError({ 
        filter: activeFilter, 
        error: err instanceof Error ? err.message : 'Failed to create document' 
      }))
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteDocument(documentToDelete.id)
      
      if (result.success) {
        setDeleteDialogOpen(false)
        setDocumentToDelete(null)
        // Remove from Redux store
        dispatch(removeDocument(documentToDelete.id))
        // Refresh the current page
        await fetchDocuments(true) // Force fetch to get updated data
      } else {
        dispatch(setError({ 
          filter: activeFilter, 
          error: result.message || 'Failed to delete document' 
        }))
      }
    } catch (err) {
      dispatch(setError({ 
        filter: activeFilter, 
        error: err instanceof Error ? err.message : 'Failed to delete document' 
      }))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRefresh = () => {
    fetchDocuments(true) // Force fetch to refresh data
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleFilterChange = (newFilter: string) => {
    const filter = newFilter as DocumentFilter
    console.log(`🔄 Changing filter from "${activeFilter}" to "${filter}"`)
    
    setActiveFilter(filter)
    setCurrentPage(1) // Reset to page 1 when changing filters
  }

  const handleDocumentDelete = (document: Document) => {
    setDocumentToDelete(document)
    setDeleteDialogOpen(true)
  }

  // Loading skeleton grid
  const LoadingGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: 20 }).map((_, i) => (
        <DocumentsLoadingSkeleton key={i} />
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <DocumentsHeader 
        onCreateDocument={handleCreateDocument}
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
      />

      {/* Filter Tabs */}
      <DocumentsFilterTabs
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        counts={documentCounts}
      />

      {/* Error State */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="ml-auto"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="mt-6">
        {isLoading ? (
          <LoadingGrid />
        ) : documents.length === 0 ? (
          <DocumentsEmptyState 
            searchQuery=""
            filter={activeFilter}
            onCreateDocument={handleCreateDocument}
            isCreating={isCreating}
          />
        ) : (
          <>
            {/* Documents Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {documents.map((document: Document) => (
                <DocumentCard 
                  key={document.id} 
                  document={document}
                  currentUserId={session?.user?.id}
                  onDelete={handleDocumentDelete}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && (
              <DocumentsPagination
                pagination={pagination}
                currentPage={currentPage}
                documentsCount={documents.length}
                isLoading={isLoading}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>

      {/* Delete Dialog */}
      <DeleteDocumentDialog
        open={deleteDialogOpen}
        document={documentToDelete}
        isDeleting={isDeleting}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteDocument}
      />
    </div>
  )
}
