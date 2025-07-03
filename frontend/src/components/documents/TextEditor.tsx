"use client"

import { useEffect, useRef, useState, useCallback, RefObject } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import * as Y from 'yjs'
import { QuillBinding } from 'y-quill'
import { Env } from '@/lib/env'
import { CustomWebsocketProvider } from '@/lib/custom-websocket-provider'
import { useSession } from 'next-auth/react'
import QuillCursors from 'quill-cursors'

interface TextEditorProps {
  documentId: string
  initialContent?: string
  onSaveAction: (content: string) => void
  onLoadAction: () => void
  onUsersChange?: (users: DocumentUser[]) => void
  quillRef?: RefObject<Quill | null>
  flushUpdatesRef?: RefObject<(() => void) | null>
  manualSaveRef?: RefObject<(() => Promise<void>) | null>
}

interface DocumentUser {
  userId: string
  username: string
}

export function TextEditor({ documentId, initialContent, onSaveAction, onLoadAction, onUsersChange, quillRef, flushUpdatesRef, manualSaveRef }: TextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const quillRefInternal = useRef<Quill | null>(null)
  const ydocRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<CustomWebsocketProvider | null>(null)
  const contentInitializedRef = useRef(false)
  const {
    data: session,
    status
  } = useSession()
  
  const [isConnecting, setIsConnecting] = useState(true)
  const [usersInDocument, setUsersInDocument] = useState<DocumentUser[]>([])

  const memoizedOnUsersChange = useCallback(() => {
    onUsersChange?.(usersInDocument)
  }, [usersInDocument, onUsersChange])

  useEffect(() => {
    memoizedOnUsersChange()
  }, [memoizedOnUsersChange])

  // Reset content initialization when document changes
  useEffect(() => {
    contentInitializedRef.current = false
  }, [documentId])

  useEffect(() => {
    if (!editorRef.current || status !== 'authenticated' || !session) {
      return;
    }
    // Register QuillCursors module
    Quill.register('modules/cursors', QuillCursors);

    // Initialize Yjs document and WebSocket provider
    ydocRef.current = new Y.Doc()
    providerRef.current = new CustomWebsocketProvider(
      Env.NEXT_PUBLIC_WEBSOCKET_URL,
      documentId,
      ydocRef.current,
      session.user.accessToken,
      {
        yjsDebounceMs: 100,
        awarenessDebounceMs: 50
      }
    )
    
    providerRef.current.on('users-in-document', (data) => {
      setUsersInDocument(data.users);
      setIsConnecting(false);
      onLoadAction();
      
      if (quillRefInternal.current && ydocRef.current) {
        const ytext = ydocRef.current.getText('quill');
        const ytextContent = ytext.toString().trim();
                
        if (ytextContent !== '') {
          // Yjs has collaborative content, ensure it's saved to database
          const currentContent = quillRefInternal.current.root.innerHTML;
          onSaveAction(currentContent);
        }
      }
    });

    providerRef.current.on('user-joined', (data) => {
      setUsersInDocument(prev => {
        const userExists = prev.find(u => u.userId === data.user.userId);
        if (!userExists) {
          return [...prev, data.user];
        }
        return prev;
      });
    });

    providerRef.current.on('user-left', (data) => {
      setUsersInDocument(prev => prev.filter(u => u.userId !== data.user.userId));
    });

    const ytext = ydocRef.current.getText('quill')
    
    quillRefInternal.current = new Quill(editorRef.current, {
      modules: {
        cursors: true,
        toolbar: [
          [{ header: [1, 2, 3, 4, 5, 6, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered'}, { list: 'bullet' }],
          ['link', 'image', 'video'],
          ['clean']
        ],
        history: {
          userOnly: true
        }
      },
      placeholder: 'Start collaborating...',
      theme: 'snow'
    })
    
    // Expose Quill instance to parent component
    if (quillRef) {
      quillRef.current = quillRefInternal.current
    }

    // Expose flushUpdates method to parent component
    if (flushUpdatesRef) {
      flushUpdatesRef.current = () => {
        if (providerRef.current) {
          providerRef.current.flushUpdates()
        }
      }
    }

    // Set proper height for the editor
    const editorElement = quillRefInternal.current.root.querySelector('.ql-editor') as HTMLElement
    if (editorElement) {
      editorElement.style.minHeight = '550px'
      editorElement.style.padding = '20px'
    }

    // Set user information in awareness before creating QuillBinding
    const userColor = `hsl(${Math.random() * 360}, 70%, 50%)`;
    providerRef.current.awareness.setLocalStateField('user', {
      name: session.user.username,
      color: userColor
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const binding = new QuillBinding(ytext, quillRefInternal.current, providerRef.current.awareness)

    // Initialize content in Quill editor if we have initial content
    if (initialContent && initialContent.trim() !== '' && initialContent.trim() !== '<p><br></p>') {
      // Set the content using Quill's setContents method
      const delta = quillRefInternal.current.clipboard.convert({ html: initialContent });
      quillRefInternal.current.setContents(delta);
    }

    // Mark content as initialized to prevent duplicate initialization
    contentInitializedRef.current = true;

    // Cleanup on unmount
    return () => {
      // Send leave-document message before disconnecting
      if (providerRef.current) {
        providerRef.current.leaveDocument();
      }
      
      if (providerRef.current) {
        providerRef.current.disconnect()
      }
      if (quillRefInternal.current) {
        quillRefInternal.current = null
      }
      if (ydocRef.current) {
        ydocRef.current.destroy()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, onSaveAction, onLoadAction, session, status])

  // Manual save function for parent component
  const manualSave = useCallback(async () => {
    if (quillRefInternal.current) {
      const content = quillRefInternal.current.root.innerHTML;
      
      try {
        if (providerRef.current) {
          providerRef.current.flushUpdates();
        }
        
        await onSaveAction(content);
      } catch (error) {
        console.error('Manual save failed:', error);
      }
    }
  }, [onSaveAction]);

  // Expose manual save to parent component
  useEffect(() => {
    if (manualSaveRef) {
      manualSaveRef.current = manualSave;
    }
  }, [manualSaveRef, manualSave]);

  return (
    <div className='space-y-0'>
      {/* Connection status */}
      {isConnecting && (
        <div className="p-4 text-center text-muted-foreground">
          Connecting to real-time editor...
        </div>
      )}
      
      {/* Editor */}
      <div 
        ref={editorRef} 
        style={{ 
          minHeight: '600px',
        }} 
      />
    </div>
  )
} 