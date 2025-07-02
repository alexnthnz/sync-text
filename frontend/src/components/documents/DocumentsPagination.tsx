import type { DocumentPagination } from "@/types"
import { PaginationInfo } from "./PaginationInfo"
import { PaginationControls } from "./PaginationControls"

interface DocumentsPaginationProps {
  pagination: DocumentPagination
  currentPage: number
  documentsCount: number
  isLoading: boolean
  onPageChange: (page: number) => void
}

export function DocumentsPagination({
  pagination,
  currentPage,
  documentsCount,
  isLoading,
  onPageChange
}: DocumentsPaginationProps) {
  if (pagination.totalPages <= 1) {
    return null
  }

  return (
    <div className="flex items-center justify-between mt-8">
      <PaginationInfo 
        documentsCount={documentsCount}
        totalCount={pagination.totalCount}
      />
      
      <PaginationControls
        pagination={pagination}
        currentPage={currentPage}
        isLoading={isLoading}
        onPageChange={onPageChange}
      />
    </div>
  )
} 