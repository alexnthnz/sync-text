import { DocumentsSearchInput } from "./DocumentsSearchInput"
import { DocumentsFilterTabs } from "./DocumentsFilterTabs"
import type { DocumentFilter } from "@/types"

interface DocumentsSearchAndFiltersProps {
  searchQuery: string
  activeFilter: DocumentFilter
  onSearchChange: (query: string) => void
  onFilterChange?: (filter: string) => void
}

export function DocumentsSearchAndFilters({
  searchQuery,
  activeFilter,
  onSearchChange,
  onFilterChange
}: DocumentsSearchAndFiltersProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <DocumentsSearchInput 
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
      />
      
      <DocumentsFilterTabs 
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />
    </div>
  )
} 