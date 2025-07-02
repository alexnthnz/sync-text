"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSelector } from "react-redux"
import type { RootState } from "@/store"
import { getDocument, addCollaborator, removeCollaborator } from "@/actions"
import type { Document } from "@/types"
import {
  SharePageHeader,
  SharePageLoading,
  SharePageError,
  SharePageAccessDenied,
  AddCollaboratorForm,
  CollaboratorsList,
  RemoveCollaboratorDialog
} from "@/components/document-share"

const DocumentSharePage = () => {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string
  const currentUser = useSelector((state: RootState) => state.auth.user)

  const [document, setDocument] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState("")
  const [newCollaboratorRole, setNewCollaboratorRole] = useState<"editor" | "viewer">("editor")
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [collaboratorToRemove, setCollaboratorToRemove] = useState<{
    userId: string
    role: string
    user: { id: string; email: string; username: string }
  } | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  // Check if current user is the document owner
  const isOwner = currentUser && document && currentUser.id === document.ownerId

  // Fetch document
  const fetchDocument = useCallback(async () => {
    if (!documentId) return

    setIsLoading(true)
    setError(null)
    
    const result = await getDocument(documentId)
    
    if (result.success && result.data) {
      setDocument(result.data as Document)
    } else {
      setError(result.message)
    }
    
    setIsLoading(false)
  }, [documentId])

  // Add collaborator
  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newCollaboratorEmail.trim()) return

    setIsAddingCollaborator(true)
    setError(null)
    
    const result = await addCollaborator(documentId, {
      email: newCollaboratorEmail.trim(),
      role: newCollaboratorRole
    })
    
    if (result.success) {
      setNewCollaboratorEmail("")
      fetchDocument() // Refresh the document data
    } else {
      setError(result.message)
    }
    
    setIsAddingCollaborator(false)
  }

  // Remove collaborator
  const handleRemoveCollaborator = async () => {
    if (!collaboratorToRemove) return

    setIsRemoving(true)
    
    const result = await removeCollaborator(documentId, collaboratorToRemove.userId)
    
    if (result.success) {
      setRemoveDialogOpen(false)
      setCollaboratorToRemove(null)
      fetchDocument() // Refresh the document data
    } else {
      setError(result.message)
    }
    
    setIsRemoving(false)
  }

  // Initial load
  useEffect(() => {
    fetchDocument()
  }, [fetchDocument])

  // Navigation handlers
  const handleBackToDocument = () => router.push(`/documents/${documentId}`)
  const handleBackToDocuments = () => router.push('/documents')

  if (isLoading) {
    return <SharePageLoading />
  }

  if (error && !document) {
    return <SharePageError error={error} onBackToDocuments={handleBackToDocuments} />
  }

  if (!document) {
    return <SharePageAccessDenied onBackToDocument={handleBackToDocument} />
  }

  // Check if user is authorized to access this share page (only owners can manage sharing)
  if (!isOwner) {
    return <SharePageAccessDenied onBackToDocument={handleBackToDocument} />
  }

  // Use collaborators from backend response
  const collaboratorsList = document.collaborators || []

  return (
    <div className="space-y-6">
      <SharePageHeader
        documentTitle={document.title}
        collaboratorsCount={collaboratorsList.length}
        onBackToDocument={handleBackToDocument}
      />

      <AddCollaboratorForm
        newCollaboratorEmail={newCollaboratorEmail}
        newCollaboratorRole={newCollaboratorRole}
        isAddingCollaborator={isAddingCollaborator}
        error={error}
        onEmailChange={setNewCollaboratorEmail}
        onRoleChange={setNewCollaboratorRole}
        onSubmit={handleAddCollaborator}
      />

      <CollaboratorsList
        collaborators={collaboratorsList}
        onRemoveCollaborator={(collaborator) => {
          setCollaboratorToRemove(collaborator)
          setRemoveDialogOpen(true)
        }}
      />

      <RemoveCollaboratorDialog
        isOpen={removeDialogOpen}
        collaborator={collaboratorToRemove}
        isRemoving={isRemoving}
        onClose={() => setRemoveDialogOpen(false)}
        onConfirm={handleRemoveCollaborator}
      />
    </div>
  )
}

export default DocumentSharePage 