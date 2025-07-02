import { Button } from "@/components/ui"
import type { DocumentPagination } from "@/types"

interface PaginationControlsProps {
  pagination: DocumentPagination
  currentPage: number
  isLoading: boolean
  onPageChange: (page: number) => void
}

export function PaginationControls({
  pagination,
  currentPage,
  isLoading,
  onPageChange
}: PaginationControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!pagination.hasPrev || isLoading}
      >
        Previous
      </Button>
      
      <div className="flex items-center gap-1">
        {/* Show page numbers */}
        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
          const pageNum = Math.max(1, currentPage - 2) + i;
          if (pageNum > pagination.totalPages) return null;
          
          return (
            <Button
              key={pageNum}
              variant={pageNum === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              disabled={isLoading}
            >
              {pageNum}
            </Button>
          );
        })}
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!pagination.hasNext || isLoading}
      >
        Next
      </Button>
    </div>
  )
} 