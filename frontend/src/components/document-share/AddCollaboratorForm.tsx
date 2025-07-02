import { Button, Input, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui"
import { Plus } from "lucide-react"

interface AddCollaboratorFormProps {
  newCollaboratorEmail: string
  newCollaboratorRole: "editor" | "viewer"
  isAddingCollaborator: boolean
  error: string | null
  onEmailChange: (email: string) => void
  onRoleChange: (role: "editor" | "viewer") => void
  onSubmit: (e: React.FormEvent) => void
}

export function AddCollaboratorForm({
  newCollaboratorEmail,
  newCollaboratorRole,
  isAddingCollaborator,
  error,
  onEmailChange,
  onRoleChange,
  onSubmit
}: AddCollaboratorFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Collaborator
        </CardTitle>
        <CardDescription>
          Invite others to collaborate on this document
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter email address"
              value={newCollaboratorEmail}
              onChange={(e) => onEmailChange(e.target.value)}
              className="flex-1"
            />
            <select
              value={newCollaboratorRole}
              onChange={(e) => onRoleChange(e.target.value as "editor" | "viewer")}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <Button 
              type="submit" 
              disabled={!newCollaboratorEmail.trim() || isAddingCollaborator}
            >
              {isAddingCollaborator ? "Adding..." : "Add"}
            </Button>
          </div>
        </form>
        
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-4">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 