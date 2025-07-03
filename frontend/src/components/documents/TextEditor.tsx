"use client"

import { useEffect, useRef, useState, useCallback, RefObject, memo } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import * as Y from 'yjs'
import { QuillBinding } from 'y-quill'
import { Env } from '@/lib/env'
import { CustomWebsocketProvider } from '@/lib/custom-websocket-provider'
import { useAppSelector } from '@/store/hooks'
import QuillCursors from 'quill-cursors'

if (!Quill.imports['modules/cursors']) {
  Quill.register('modules/cursors', QuillCursors);
}

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

function TextEditorComponent({ documentId, initialContent, onSaveAction, onLoadAction, onUsersChange, quillRef, flushUpdatesRef, manualSaveRef }: TextEditorProps) {
  const onSaveActionRef = useRef(onSaveAction);
  const onLoadActionRef = useRef(onLoadAction);
  const onUsersChangeRef = useRef(onUsersChange);
  
  if (onSaveActionRef.current !== onSaveAction) {
    onSaveActionRef.current = onSaveAction;
  }
  if (onLoadActionRef.current !== onLoadAction) {
    onLoadActionRef.current = onLoadAction;
  }
  if (onUsersChangeRef.current !== onUsersChange) {
    onUsersChangeRef.current = onUsersChange;
  }
  
  const editorRef = useRef<HTMLDivElement>(null)
  const quillRefInternal = useRef<Quill | null>(null)
  const ydocRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<CustomWebsocketProvider | null>(null)
  const contentInitializedRef = useRef(false)
  const bindingRef = useRef<QuillBinding | null>(null)
  const connectionInitializedRef = useRef(false)
  const isUnmountingRef = useRef(false)
  
  const user = useAppSelector((state) => state.auth.user)
  
  const [isConnecting, setIsConnecting] = useState(true)
  const [usersInDocument, setUsersInDocument] = useState<DocumentUser[]>([])

  const memoizedOnUsersChange = useCallback(() => {
    onUsersChange?.(usersInDocument)
  }, [usersInDocument, onUsersChange])

  useEffect(() => {
    memoizedOnUsersChange()
  }, [memoizedOnUsersChange])

  useEffect(() => {
    contentInitializedRef.current = false
    connectionInitializedRef.current = false
  }, [documentId])

  useEffect(() => {
    if (!editorRef.current || !user) {
      return;
    }

    if (connectionInitializedRef.current && providerRef.current) {
      return;
    }

    const shouldCleanup = providerRef.current && connectionInitializedRef.current;
    
    const cleanup = (isUnmounting = false) => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      
      if (quillRefInternal.current) {
        const editorElement = quillRefInternal.current.root.parentElement;
        if (editorElement) {
          editorElement.innerHTML = '';
        }
        quillRefInternal.current = null;
      }
      
      if (providerRef.current) {
        if (isUnmounting || shouldCleanup) {
          providerRef.current.leaveDocument();
          providerRef.current.disconnect();
        } else {
          providerRef.current.temporaryDisconnect();
        }
        providerRef.current = null;
      }
      
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
    };

    if (shouldCleanup) {
      cleanup();
    }

    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }

    ydocRef.current = new Y.Doc()
    providerRef.current = new CustomWebsocketProvider(
      Env.NEXT_PUBLIC_WEBSOCKET_URL,
      documentId,
      ydocRef.current,
      user.accessToken!,
      CustomWebsocketProvider.createOptimizedConfig('balanced')
    )
    
    providerRef.current.on('users-in-document', (data) => {
      setUsersInDocument(data.users);
      setIsConnecting(false);
      onLoadAction();
      
      if (quillRefInternal.current && ydocRef.current) {
        const ytext = ydocRef.current.getText('quill');
        const ytextContent = ytext.toString().trim();
                
        if (ytextContent !== '') {
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
    
    if (quillRef) {
      quillRef.current = quillRefInternal.current
    }

    if (flushUpdatesRef) {
      flushUpdatesRef.current = () => {
        if (providerRef.current) {
          providerRef.current.flushUpdates()
        }
      }
    }

    if (quillRef) {
      (quillRef as any).getDebouncingStats = () => {
        if (providerRef.current) {
          return providerRef.current.getDebouncingStats();
        }
        return null;
      };
    }

    const userColor = `hsl(${Math.random() * 360}, 70%, 50%)`;
    providerRef.current.awareness.setLocalStateField('user', {
      name: user.username,
      color: userColor
    });

    bindingRef.current = new QuillBinding(ytext, quillRefInternal.current, providerRef.current.awareness)

    if (initialContent && initialContent.trim() !== '' && initialContent.trim() !== '<p><br></p>') {
      const delta = quillRefInternal.current.clipboard.convert({ html: initialContent });
      quillRefInternal.current.setContents(delta);
    }

    contentInitializedRef.current = true;
    connectionInitializedRef.current = true;

    return () => {
      isUnmountingRef.current = true;
      cleanup(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId])

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

  useEffect(() => {
    if (manualSaveRef) {
      manualSaveRef.current = manualSave;
    }
  }, [manualSaveRef, manualSave]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (providerRef.current) {
        providerRef.current.setTabHidden(document.hidden);
      }
    };

    const handleWindowFocus = () => {
      if (providerRef.current) {
        providerRef.current.setTabHidden(false);
      }
    };

    const handleWindowBlur = () => {
      if (providerRef.current) {
        providerRef.current.setTabHidden(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  return (
    <div className='space-y-0'>
      {isConnecting && (
        <div className="p-4 text-center text-muted-foreground">
          Connecting to real-time editor...
        </div>
      )}
      
      <div 
        ref={editorRef} 
        style={{ 
          minHeight: 'calc(100vh - 250px)',
        }} 
      />
    </div>
  )
}

export const TextEditor = memo(TextEditorComponent);