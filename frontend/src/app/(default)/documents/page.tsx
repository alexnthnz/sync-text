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

const getFilterFromUrl = (searchParams: URLSearchParams): DocumentFilter => {
  const filter = searchParams.get('filter')
  return (filter === 'owned' || filter === 'shared') ? filter : 'accessible'
}

const getPageFromUrl = (searchParams: URLSearchParams): number => {
  const page = parseInt(searchParams.get('page') || '1', 10)
  return page > 0 ? page : 1
}

export default function DocumentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const dispatch = useDispatch()
  
  const [activeFilter, setActiveFilter] = useState<DocumentFilter>(() => getFilterFromUrl(searchParams))
  const [currentPage, setCurrentPage] = useState<number>(() => getPageFromUrl(searchParams))
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const documents = useSelector((state: RootState) => selectDocuments(state, activeFilter))
  const pagination = useSelector((state: RootState) => selectPagination(state, activeFilter))
  const isLoading = useSelector((state: RootState) => selectIsLoading(state, activeFilter))
  const error = useSelector((state: RootState) => selectError(state, activeFilter))
  const documentCounts = useSelector((state: RootState) => selectDocumentCounts(state))

  useEffect(() => {
    const urlFilter = getFilterFromUrl(searchParams)
    const urlPage = getPageFromUrl(searchParams)
    
    setActiveFilter(urlFilter)
    setCurrentPage(urlPage)
  }, [searchParams])

  const fetchDocuments = useCallback(async (forceFetch = false) => {
    const hasData = documents.length > 0 && pagination && !isLoading
    const isCurrentPage = pagination?.currentPage === currentPage
    
    if (hasData && isCurrentPage && !forceFetch) {
      return
    }
    
    if (!forceFetch && pagination && pagination.totalCount === 0) {
      return
    }

    if (isLoading) {
      return
    }
    
    dispatch(setLoading({ filter: activeFilter, isLoading: true }))
    
    try {
      const result = await getDocuments({ 
        filter: activeFilter, 
        limit: 20,
        page: currentPage
      })
      
      if (result.success && result.data) {
        dispatch(setDocuments({ 
          filter: activeFilter, 
          documents: result.data.documents,
          pagination: result.data.pagination
        }))
      } else {
        dispatch(setError({ 
          filter: activeFilter, 
          error: result.message || 'Failed to fetch documents' 
        }))
      }
    } catch (err) {
      dispatch(setError({ 
        filter: activeFilter, 
        error: err instanceof Error ? err.message : 'Failed to fetch documents' 
      }))
    }
  }, [dispatch, activeFilter, currentPage, pagination, documents, isLoading])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  useEffect(() => {
    const params = new URLSearchParams()
    
    if (activeFilter !== 'accessible') {
      params.set('filter', activeFilter)
    }
    if (currentPage > 1) {
      params.set('page', currentPage.toString())
    }
    
    const newUrl = `/documents${params.toString() ? `?${params.toString()}` : ''}`
    
    const currentUrl = window.location.pathname + window.location.search
    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false })
    }
  }, [activeFilter, currentPage, router])

  const handleCreateDocument = async () => {
    setIsCreating(true)
    try {
      const result = await createDocument({ 
        title: "Untitled Document",
        content: "" 
      })
      
      if (result.success && result.data) {
        const doc = result.data as Document
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
        dispatch(removeDocument(documentToDelete.id))
        await fetchDocuments(true)
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
    fetchDocuments(true)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleFilterChange = (newFilter: string) => {
    const filter = newFilter as DocumentFilter
    
    setActiveFilter(filter)
    setCurrentPage(1)
  }

  const handleDocumentDelete = (document: Document) => {
    setDocumentToDelete(document)
    setDeleteDialogOpen(true)
  }

  const LoadingGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: 20 }).map((_, i) => (
        <DocumentsLoadingSkeleton key={i} />
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <DocumentsHeader 
        onCreateDocument={handleCreateDocument}
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
      />

      <DocumentsFilterTabs
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        counts={documentCounts}
      />

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
