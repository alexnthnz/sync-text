import { Input } from "@/components/ui"
import { Search } from "lucide-react"

interface DocumentsSearchInputProps {
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function DocumentsSearchInput({ searchQuery, onSearchChange }: DocumentsSearchInputProps) {
  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        type="text"
        placeholder="Search documents..."
        value={searchQuery} // Ensure it's never undefined
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-10"
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  )
} 