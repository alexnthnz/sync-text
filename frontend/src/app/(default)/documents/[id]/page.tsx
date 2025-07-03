"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getDocument, updateDocument } from "@/actions";
import type { Document } from "@/types";
import { TextEditor } from "@/components/documents";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowLeft, Share, Save } from "lucide-react";
import Quill from "quill";

interface DocumentUser {
  userId: string;
  username: string;
}

export default function DocumentEditorPage() {
  const { id: documentId } = useParams();
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [usersInDocument, setUsersInDocument] = useState<DocumentUser[]>([]);
  const quillRef = useRef<Quill | null>(null);
  const flushUpdatesRef = useRef<(() => void) | null>(null);
  const manualSaveRef = useRef<(() => Promise<void>) | null>(null);

  const fetchDocument = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getDocument(documentId as string);
      if (result.success && result.data) {
        setDocument(result.data as Document);
      } else {
        setError(result.message || "Failed to load document");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load document");
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const handleSaveContent = useCallback(
    async (content: string) => {
      try {
        await updateDocument(documentId as string, { content });
      } catch {
        setError("Failed to save changes. Please check your connection.");
      }
    },
    [documentId],
  );

  const handleManualSave = useCallback(async () => {
    if (!document) return;

    setIsSaving(true);
    try {
      if (manualSaveRef.current) {
        await manualSaveRef.current();
      } else {
        setError("Could not access save function");
      }
    } catch {
      setError("Failed to save document. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [document]);

  const handleBack = () => {
    router.push("/documents");
  };

  const handleShare = () => {
    router.push(`/documents/${documentId}/share`);
  };

  const handleEditorLoad = useCallback(() => {
    // Editor loaded successfully
  }, []);

  const handleUsersChange = useCallback((users: DocumentUser[]) => {
    setUsersInDocument(users);
  }, []);

  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (manualSaveRef.current && document) {
        manualSaveRef.current().catch((error) => {
          console.error('Auto-save failed:', error);
        });
      }
    }, 10000);

    return () => {
      clearInterval(autoSaveInterval);
    };
  }, [document]);

  if (isLoading) {
    return <div className="p-4 text-center">Loading document...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-destructive">{error}</div>;
  }

  if (!document) {
    return <div className="p-4 text-center">Document not found</div>;
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Documents
            </Button>
          </div>

          <div className="flex items-center gap-4">
            {usersInDocument.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {usersInDocument.slice(0, 3).map((user, index) => (
                    <Tooltip key={user.userId}>
                      <TooltipTrigger asChild>
                        <div
                          className="relative cursor-pointer"
                          style={{
                            zIndex: 3 - index,
                            marginLeft: index > 0 ? "-8px" : "0",
                          }}
                        >
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-background">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border border-background rounded-full"></div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{user.username}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {usersInDocument.length > 3 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-medium border-2 border-background ml-2 cursor-pointer">
                          +{usersInDocument.length - 3}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {usersInDocument
                            .slice(3)
                            .map((u) => u.username)
                            .join(", ")}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {usersInDocument.length} collaborator
                  {usersInDocument.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>

            <Button size="sm" onClick={handleManualSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <TextEditor
          documentId={documentId as string}
          initialContent={document.content}
          onSaveAction={handleSaveContent}
          onLoadAction={handleEditorLoad}
          onUsersChange={handleUsersChange}
          quillRef={quillRef}
          flushUpdatesRef={flushUpdatesRef}
          manualSaveRef={manualSaveRef}
        />

        {error && <div className="text-destructive text-sm mt-2">{error}</div>}
      </div>
    </TooltipProvider>
  );
}
