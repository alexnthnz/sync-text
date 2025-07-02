interface PaginationInfoProps {
  documentsCount: number
  totalCount: number
}

export function PaginationInfo({ documentsCount, totalCount }: PaginationInfoProps) {
  return (
    <div className="text-sm text-muted-foreground">
      Showing {documentsCount} of {totalCount} documents
    </div>
  )
} 