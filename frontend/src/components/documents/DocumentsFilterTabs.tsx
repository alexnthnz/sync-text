import { Tabs, TabsList, TabsTrigger } from "@/components/ui"
import { Users, Crown, FileText } from "lucide-react"
import type { DocumentFilter } from "@/types"

interface FilterCount {
  accessible: number
  owned: number
  shared: number
}

interface DocumentsFilterTabsProps {
  activeFilter: DocumentFilter
  onFilterChange?: (filter: string) => void
  counts?: FilterCount
}

export function DocumentsFilterTabs({ 
  activeFilter, 
  onFilterChange,
  counts
}: DocumentsFilterTabsProps) {
  const handleValueChange = (value: string) => {
    // Only call parent callback if provided
    if (onFilterChange) {
      onFilterChange(value)
    }
  }

  return (
    <Tabs value={activeFilter} onValueChange={handleValueChange}>
      <TabsList className="grid w-full grid-cols-3 lg:w-auto">
        <TabsTrigger value="accessible" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          All Documents
          {counts && counts.accessible > 0 && (
            <span className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded">
              {counts.accessible}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="owned" className="flex items-center gap-2">
          <Crown className="w-4 h-4" />
          Owned
          {counts && counts.owned > 0 && (
            <span className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded">
              {counts.owned}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="shared" className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          Shared
          {counts && counts.shared > 0 && (
            <span className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded">
              {counts.shared}
            </span>
          )}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
} 