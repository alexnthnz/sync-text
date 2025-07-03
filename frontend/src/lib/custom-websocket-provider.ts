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
  maxYjsBatchSize?: number;
  maxAwarenessBatchSize?: number;
  enableThrottling?: boolean;
  throttleIntervalMs?: number;
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
  private isTabHidden: boolean = false;
  
  private yjsUpdateTimeout: NodeJS.Timeout | null = null;
  private awarenessUpdateTimeout: NodeJS.Timeout | null = null;
  private pendingYjsUpdates: Uint8Array[] = [];
  private pendingAwarenessUpdates: Uint8Array[] = [];
  
  private lastYjsSendTime: number = 0;
  private lastAwarenessSendTime: number = 0;
  
  private readonly YJS_DEBOUNCE_MS: number;
  private readonly AWARENESS_DEBOUNCE_MS: number;
  private readonly MAX_YJS_BATCH_SIZE: number;
  private readonly MAX_AWARENESS_BATCH_SIZE: number;
  private readonly ENABLE_THROTTLING: boolean;
  private readonly THROTTLE_INTERVAL_MS: number;

  constructor(url: string, roomName: string, ydoc: Y.Doc, token: string, config?: WebSocketProviderConfig) {
    this.url = url;
    this.roomName = roomName;
    this.ydoc = ydoc;
    this.token = token;
    this.awareness = new Awareness(this.ydoc);
    this.callbacks = new Map();
    this.isIntentionallyDisconnected = false;
    
    this.YJS_DEBOUNCE_MS = config?.yjsDebounceMs ?? 100;
    this.AWARENESS_DEBOUNCE_MS = config?.awarenessDebounceMs ?? 50;
    this.MAX_YJS_BATCH_SIZE = config?.maxYjsBatchSize ?? 100;
    this.MAX_AWARENESS_BATCH_SIZE = config?.maxAwarenessBatchSize ?? 100;
    this.ENABLE_THROTTLING = config?.enableThrottling ?? false;
    this.THROTTLE_INTERVAL_MS = config?.throttleIntervalMs ?? 1000;

    this.connect();

    this.ydoc.on('update', this.onUpdate.bind(this));
    this.awareness.on('update', this.onAwarenessUpdate.bind(this));
  }

  private onUpdate(update: Uint8Array) {
    this.pendingYjsUpdates.push(update);
    
    if (this.pendingYjsUpdates.length >= this.MAX_YJS_BATCH_SIZE) {
      this.sendPendingYjsUpdates();
      return;
    }
    
    if (this.yjsUpdateTimeout) {
      clearTimeout(this.yjsUpdateTimeout);
    }
    
    this.yjsUpdateTimeout = setTimeout(() => {
      this.sendPendingYjsUpdates();
    }, this.YJS_DEBOUNCE_MS);
  }

  private sendPendingYjsUpdates() {    
    if (this.pendingYjsUpdates.length === 0 || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    if (this.ENABLE_THROTTLING) {
      const now = Date.now();
      const timeSinceLastSend = now - this.lastYjsSendTime;
      
      if (timeSinceLastSend < this.THROTTLE_INTERVAL_MS) {
        if (this.yjsUpdateTimeout) {
          clearTimeout(this.yjsUpdateTimeout);
        }
        this.yjsUpdateTimeout = setTimeout(() => {
          this.sendPendingYjsUpdates();
        }, this.THROTTLE_INTERVAL_MS - timeSinceLastSend);
        return;
      }
      
      this.lastYjsSendTime = now;
    }

    try {
      const mergedUpdate = Y.mergeUpdates(this.pendingYjsUpdates);
      
      this.ws.send(JSON.stringify({
        type: 'yjs-update',
        data: {
          documentId: this.roomName,
          update: toBase64(mergedUpdate),
        },
      }));
    } catch (error) {
      console.error('Failed to send yjs-update:', error);
    }
    
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
    const changedClients = added.concat(updated).concat(removed);
    const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients);
    this.pendingAwarenessUpdates.push(awarenessUpdate);

    if (this.pendingAwarenessUpdates.length >= this.MAX_AWARENESS_BATCH_SIZE) {
      this.sendPendingAwarenessUpdates();
      return;
    }
    
    if (this.awarenessUpdateTimeout) {
      clearTimeout(this.awarenessUpdateTimeout);
    }
    
    this.awarenessUpdateTimeout = setTimeout(() => {
      this.sendPendingAwarenessUpdates();
    }, this.AWARENESS_DEBOUNCE_MS);
  }

  private sendPendingAwarenessUpdates() {
    if (this.pendingAwarenessUpdates.length === 0 || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    if (this.ENABLE_THROTTLING) {
      const now = Date.now();
      const timeSinceLastSend = now - this.lastAwarenessSendTime;
      
      if (timeSinceLastSend < this.THROTTLE_INTERVAL_MS) {
        if (this.awarenessUpdateTimeout) {
          clearTimeout(this.awarenessUpdateTimeout);
        }
        this.awarenessUpdateTimeout = setTimeout(() => {
          this.sendPendingAwarenessUpdates();
        }, this.THROTTLE_INTERVAL_MS - timeSinceLastSend);
        return;
      }
      
      this.lastAwarenessSendTime = now;
    }

    try {
      const latestUpdate = this.pendingAwarenessUpdates[this.pendingAwarenessUpdates.length - 1];
      
      const message = {
        type: 'awareness-update',
        data: {
          documentId: this.roomName,
          update: toBase64(latestUpdate),
        },
      };
      
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send awareness-update:', error);
    }
    
    this.pendingAwarenessUpdates = [];
    this.awarenessUpdateTimeout = null;
  }

  connect() {
    const wsUrl = `${this.url}/ws?token=${encodeURIComponent(this.token)}`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      if (this.ws) {
        this.ws.send(JSON.stringify({
          type: 'join-document',
          data: {
            documentId: this.roomName
          },
        }));
      }
    };

    this.ws.onerror = (event) => {
      console.error('WebSocket error:', event);
    };

    this.ws.onclose = (event) => {
      if (!this.isIntentionallyDisconnected && !this.isTabHidden) {
        setTimeout(() => this.connect(), 1000);
      }
    };

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
          break;
        }
      default:
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
    
    if (this.pendingYjsUpdates.length > 0) {
      this.sendPendingYjsUpdates();
    }
    if (this.pendingAwarenessUpdates.length > 0) {
      this.sendPendingAwarenessUpdates();
    }
    
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
   * Temporarily disconnect without marking as intentionally disconnected
   * This allows for reconnection when needed
   */
  temporaryDisconnect() {
    if (this.pendingYjsUpdates.length > 0) {
      this.sendPendingYjsUpdates();
    }
    if (this.pendingAwarenessUpdates.length > 0) {
      this.sendPendingAwarenessUpdates();
    }
    
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

  /**
   * Check if the WebSocket connection is open
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Handle tab visibility change
   */
  setTabHidden(hidden: boolean) {
    this.isTabHidden = hidden;
    if (!hidden && !this.isConnected() && !this.isIntentionallyDisconnected) {
      this.connect();
    }
  }

  /**
   * Get current debouncing statistics
   */
  getDebouncingStats() {
    return {
      yjs: {
        pendingUpdates: this.pendingYjsUpdates.length,
        lastSendTime: this.lastYjsSendTime,
        debounceMs: this.YJS_DEBOUNCE_MS,
        maxBatchSize: this.MAX_YJS_BATCH_SIZE,
        throttlingEnabled: this.ENABLE_THROTTLING,
        throttleIntervalMs: this.THROTTLE_INTERVAL_MS,
      },
      awareness: {
        pendingUpdates: this.pendingAwarenessUpdates.length,
        lastSendTime: this.lastAwarenessSendTime,
        debounceMs: this.AWARENESS_DEBOUNCE_MS,
        maxBatchSize: this.MAX_AWARENESS_BATCH_SIZE,
        throttlingEnabled: this.ENABLE_THROTTLING,
        throttleIntervalMs: this.THROTTLE_INTERVAL_MS,
      },
      connection: {
        isConnected: this.isConnected(),
        isTabHidden: this.isTabHidden,
        isIntentionallyDisconnected: this.isIntentionallyDisconnected,
      }
    };
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
    }
  }

  /**
   * Create optimized configuration for different use cases
   */
  static createOptimizedConfig(type: 'performance' | 'realtime' | 'balanced' = 'balanced'): WebSocketProviderConfig {
    switch (type) {
      case 'performance':
        return {
          yjsDebounceMs: 500,
          awarenessDebounceMs: 500,
          maxYjsBatchSize: 100,
          maxAwarenessBatchSize: 50,
          enableThrottling: true,
          throttleIntervalMs: 1000,
        };
      case 'realtime':
        return {
          yjsDebounceMs: 50,
          awarenessDebounceMs: 25,
          maxYjsBatchSize: 10,
          maxAwarenessBatchSize: 5,
          enableThrottling: false,
          throttleIntervalMs: 100,
        };
      case 'balanced':
      default:
        return {
          yjsDebounceMs: 200,
          awarenessDebounceMs: 100,
          maxYjsBatchSize: 50,
          maxAwarenessBatchSize: 20,
          enableThrottling: true,
          throttleIntervalMs: 500,
        };
    }
  }

  /**
   * Update debouncing configuration at runtime
   */
  updateConfig(newConfig: Partial<WebSocketProviderConfig>) {
    if (newConfig.yjsDebounceMs !== undefined) {
      (this as any).YJS_DEBOUNCE_MS = newConfig.yjsDebounceMs;
    }
    if (newConfig.awarenessDebounceMs !== undefined) {
      (this as any).AWARENESS_DEBOUNCE_MS = newConfig.awarenessDebounceMs;
    }
    if (newConfig.maxYjsBatchSize !== undefined) {
      (this as any).MAX_YJS_BATCH_SIZE = newConfig.maxYjsBatchSize;
    }
    if (newConfig.maxAwarenessBatchSize !== undefined) {
      (this as any).MAX_AWARENESS_BATCH_SIZE = newConfig.maxAwarenessBatchSize;
    }
    if (newConfig.enableThrottling !== undefined) {
      (this as any).ENABLE_THROTTLING = newConfig.enableThrottling;
    }
    if (newConfig.throttleIntervalMs !== undefined) {
      (this as any).THROTTLE_INTERVAL_MS = newConfig.throttleIntervalMs;
    }
  }
} 