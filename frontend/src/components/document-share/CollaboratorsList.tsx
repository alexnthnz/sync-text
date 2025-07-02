import { 
  Button,
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
  Separator
} from "@/components/ui"
import { 
  MoreVertical, 
  Trash2, 
  User,
  Crown,
  Eye,
  Edit
} from "lucide-react"

interface Collaborator {
  userId: string
  role: string
  user: { 
    id: string
    email: string
    username: string 
  }
}

interface CollaboratorsListProps {
  collaborators: Collaborator[]
  onRemoveCollaborator: (collaborator: Collaborator) => void
}

export function CollaboratorsList({ collaborators, onRemoveCollaborator }: CollaboratorsListProps) {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="w-4 h-4 text-yellow-500" />
      case "editor":
        return <Edit className="w-4 h-4 text-blue-500" />
      case "viewer":
        return <Eye className="w-4 h-4 text-gray-500" />
      default:
        return <User className="w-4 h-4" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-yellow-100 text-yellow-800"
      case "editor":
        return "bg-blue-100 text-blue-800"
      case "viewer":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Collaborators ({collaborators.length})
        </CardTitle>
        <CardDescription>
          People who have access to this document
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {collaborators.map((collaborator, index) => (
            <div key={collaborator.userId}>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {collaborator.user.username || collaborator.user.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {collaborator.user.email}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={`flex items-center gap-1 ${getRoleColor(collaborator.role)}`}>
                    {getRoleIcon(collaborator.role)}
                    {collaborator.role.charAt(0).toUpperCase() + collaborator.role.slice(1)}
                  </Badge>
                  
                  {collaborator.role !== "owner" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => onRemoveCollaborator(collaborator)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove access
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
              {index < collaborators.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 