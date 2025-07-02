import { 
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui"

interface Collaborator {
  userId: string
  role: string
  user: { 
    id: string
    email: string
    username: string 
  }
}

interface RemoveCollaboratorDialogProps {
  isOpen: boolean
  collaborator: Collaborator | null
  isRemoving: boolean
  onClose: () => void
  onConfirm: () => void
}

export function RemoveCollaboratorDialog({
  isOpen,
  collaborator,
  isRemoving,
  onClose,
  onConfirm
}: RemoveCollaboratorDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Collaborator</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove {collaborator?.user.email} from this document?
            They will no longer be able to access or edit this document.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isRemoving}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm}
            disabled={isRemoving}
          >
            {isRemoving ? "Removing..." : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 