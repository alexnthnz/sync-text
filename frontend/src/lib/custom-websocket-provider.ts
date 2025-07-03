import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import * as awarenessProtocol from 'y-protocols/awareness';
import {
  toBase64,
  fromBase64
} from 'lib0/buffer';

interface WebSocketProviderConfig {
  yjsDebounceMs?: number;
  awarenessDebounceMs?: number;
}

export class CustomWebsocketProvider {
  public ydoc: Y.Doc;
  public awareness: Awareness;
  private ws: WebSocket | null = null;
  private url: string;
  private roomName: string;
  private token: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private callbacks: Map<string, (data: any) => void>; 
  private isIntentionallyDisconnected: boolean = false;
  
  // Debouncing properties
  private yjsUpdateTimeout: NodeJS.Timeout | null = null;
  private awarenessUpdateTimeout: NodeJS.Timeout | null = null;
  private pendingYjsUpdates: Uint8Array[] = [];
  private pendingAwarenessUpdates: Uint8Array[] = [];
  
  // Debouncing configuration
  private readonly YJS_DEBOUNCE_MS: number;
  private readonly AWARENESS_DEBOUNCE_MS: number;

  constructor(url: string, roomName: string, ydoc: Y.Doc, token: string, config?: WebSocketProviderConfig) {
    this.url = url;
    this.roomName = roomName;
    this.ydoc = ydoc;
    this.token = token;
    this.awareness = new Awareness(this.ydoc);
    this.callbacks = new Map();
    this.isIntentionallyDisconnected = false;
    
    // Set configuration with defaults
    this.YJS_DEBOUNCE_MS = config?.yjsDebounceMs ?? 100;
    this.AWARENESS_DEBOUNCE_MS = config?.awarenessDebounceMs ?? 50;

    this.connect();

    // Set up debounced update handlers
    this.ydoc.on('update', this.onUpdate.bind(this));
    this.awareness.on('update', this.onAwarenessUpdate.bind(this));
  }

  private onUpdate(update: Uint8Array) {
    // Add update to pending queue
    this.pendingYjsUpdates.push(update);
    
    // Clear existing timeout
    if (this.yjsUpdateTimeout) {
      clearTimeout(this.yjsUpdateTimeout);
    }
    
    // Set new timeout to send updates
    this.yjsUpdateTimeout = setTimeout(() => {
      this.sendPendingYjsUpdates();
    }, this.YJS_DEBOUNCE_MS);
  }

  private sendPendingYjsUpdates() {
    if (this.pendingYjsUpdates.length === 0 || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Merge all pending updates into a single update
    const mergedUpdate = Y.mergeUpdates(this.pendingYjsUpdates);
    
    // Send the merged update through the WebSocket
    this.ws.send(JSON.stringify({
      type: 'yjs-update',
      data: {
        documentId: this.roomName,
        update: toBase64(mergedUpdate),
      },
    }));
    
    // Clear pending updates
    this.pendingYjsUpdates = [];
    this.yjsUpdateTimeout = null;
  }

  private onAwarenessUpdate({
    added,
    updated,
    removed
  }: {
    added: number[];
    updated: number[];
    removed: number[];
  }) {
    // Add awareness update to pending queue
    const changedClients = added.concat(updated).concat(removed);
    const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients);
    this.pendingAwarenessUpdates.push(awarenessUpdate);
    
    // Clear existing timeout
    if (this.awarenessUpdateTimeout) {
      clearTimeout(this.awarenessUpdateTimeout);
    }
    
    // Set new timeout to send updates
    this.awarenessUpdateTimeout = setTimeout(() => {
      this.sendPendingAwarenessUpdates();
    }, this.AWARENESS_DEBOUNCE_MS);
  }

  private sendPendingAwarenessUpdates() {
    if (this.pendingAwarenessUpdates.length === 0 || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // For awareness updates, we'll send the most recent one since they represent current state
    const latestUpdate = this.pendingAwarenessUpdates[this.pendingAwarenessUpdates.length - 1];
    
    const message = {
      type: 'awareness-update',
      data: {
        documentId: this.roomName,
        update: toBase64(latestUpdate),
      },
    };
    
    this.ws.send(JSON.stringify(message));
    
    // Clear pending updates
    this.pendingAwarenessUpdates = [];
    this.awarenessUpdateTimeout = null;
  }

  connect() {
    // Create the WebSocket URL with authentication
    const wsUrl = `${this.url}/ws?token=${encodeURIComponent(this.token)}`;
    
    // Create WebSocket connection manually to ensure authentication
    this.ws = new WebSocket(wsUrl);

    // Set up event handlers
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      
      // Join the document room
      if (this.ws) {
        this.ws.send(JSON.stringify({
          type: 'join-document',
          data: {
            documentId: this.roomName
          },
        }));
        console.log('Sent join-document message');
      }
    };

    // Handle connection errors
    this.ws.onerror = (event) => {
      console.error('WebSocket error:', event);
    };

    // Handle connection close
    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);
      if (!this.isIntentionallyDisconnected) {
        setTimeout(() => this.connect(), 1000);
      } else {
        console.log('Not reconnecting - user intentionally left the document');
      }
    };

    // Set up custom message handling by overriding the WebSocket's message handler
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'yjs-update':
            {
              if (!message.data?.update) {
                console.warn('yjs-update missing update data');
                break;
              }
              
              // Validate base64 string
              const updateData = message.data.update;
              if (typeof updateData !== 'string' || updateData.length === 0) {
                console.warn('yjs-update has invalid update data format');
                break;
              }
              
              try {
                const update = fromBase64(updateData);
                Y.applyUpdate(this.ydoc, update, this);
              } catch (error) {
                console.error('Failed to decode yjs-update:', error);
              }
              break;
            }
          case 'awareness-update':
            {
              if (!message.data?.update) {
                break;
              }
              
              // Validate base64 string
              const awarenessData = message.data.update;
              if (typeof awarenessData !== 'string' || awarenessData.length === 0) {
                break;
              }
              
              try {
                const update = fromBase64(awarenessData);
                awarenessProtocol.applyAwarenessUpdate(this.awareness, update, this);
              } catch (error) {
                console.error('Failed to decode awareness-update:', error);
              }
              break;
            }
          case 'users-in-document':
          case 'user-joined':
          case 'user-left':
          case 'connected':
            this.handleCustomMessage(message);
            break;
          default:
            console.warn('Unknown message type:', message.type, message);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleCustomMessage(message: { type: string; data: any }) {
    switch (message.type) {
      case 'users-in-document':
        {
          const callback = this.callbacks.get('users-in-document');
          if (callback) {
            callback(message.data);
          }
          break;
        }
      case 'user-joined':
        {
          const callback = this.callbacks.get('user-joined');
          if (callback) {
            callback(message.data);
          }
          break;
        }
      case 'user-left':
        {
          const callback = this.callbacks.get('user-left');
          if (callback) {
            callback(message.data);
          }
          break;
        }
      case 'connected':
        {
          console.log('WebSocket connection confirmed');
          break;
        }
      default:
        // Let the WebSocket handle standard Yjs messages
        break;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, callback: (data: any) => void) {
    this.callbacks.set(event, callback);
  }

  off(event: string) {
    this.callbacks.delete(event);
  }

  disconnect() {
    this.isIntentionallyDisconnected = true;
    
    // Send any pending updates before disconnecting
    if (this.pendingYjsUpdates.length > 0) {
      this.sendPendingYjsUpdates();
    }
    if (this.pendingAwarenessUpdates.length > 0) {
      this.sendPendingAwarenessUpdates();
    }
    
    // Clear any remaining timeouts
    if (this.yjsUpdateTimeout) {
      clearTimeout(this.yjsUpdateTimeout);
      this.yjsUpdateTimeout = null;
    }
    if (this.awarenessUpdateTimeout) {
      clearTimeout(this.awarenessUpdateTimeout);
      this.awarenessUpdateTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
    }
    
    this.ydoc.off('update', this.onUpdate);
    this.awareness.off('update', this.onAwarenessUpdate);
  }

  /**
   * Flush all pending updates immediately
   */
  flushUpdates() {
    if (this.pendingYjsUpdates.length > 0) {
      this.sendPendingYjsUpdates();
    }
    if (this.pendingAwarenessUpdates.length > 0) {
      this.sendPendingAwarenessUpdates();
    }
  }

  leaveDocument() {
    this.isIntentionallyDisconnected = true;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const leaveMessage = {
        type: 'leave-document',
        data: {
          documentId: this.roomName
        },
      };
      this.ws.send(JSON.stringify(leaveMessage));
      console.log('Sent leave-document message');
    }
  }
} 