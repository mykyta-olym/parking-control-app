import { Parking } from './types';

export interface WebSocketMessage {
  type: 'parking_update' | 'parking_batch_update' | 'ping' | 'pong';
  data?: Parking | Parking[];
  timestamp?: number;
}

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

type MessageHandler = (message: WebSocketMessage) => void;

// WebSocket type for React Native
interface RNWebSocket {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: ((error: Event) => void) | null;
  onclose: (() => void) | null;
}

class WebSocketService {
  private ws: RNWebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private status: WebSocketStatus = 'disconnected';
  private statusListeners: Set<(status: WebSocketStatus) => void> = new Set();

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    const OPEN = 1; // WebSocket.OPEN constant
    
    if (this.ws?.readyState === OPEN) {
      return;
    }

    // Check if WebSocket is available (React Native WebSocket)
    if (typeof WebSocket === 'undefined') {
      console.warn('WebSocket is not available in this environment');
      this.status = 'error';
      this.notifyStatusListeners();
      return;
    }

    try {
      this.status = 'connecting';
      this.notifyStatusListeners();
      
      this.ws = new WebSocket(this.url) as RNWebSocket;

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.status = 'connected';
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.notifyStatusListeners();
        
        // Send ping to keep connection alive
        this.startPingInterval();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'pong') {
            // Heartbeat response
            return;
          }

          // Notify all handlers
          this.messageHandlers.forEach((handler) => {
            try {
              handler(message);
            } catch (error) {
              console.error('Error in WebSocket message handler:', error);
            }
          });
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        // Only log error if WebSocket is actually trying to connect
        // Don't spam console if server is simply not available (development)
        if (this.status === 'connecting') {
          // Server unavailable is expected in development, just log once
          console.log('WebSocket server unavailable (this is normal if backend is not running)');
        }
        this.status = 'error';
        this.notifyStatusListeners();
      };

      this.ws.onclose = () => {
        // Only log if we were actually connected
        if (this.status === 'connected') {
          console.log('WebSocket disconnected');
        }
        this.status = 'disconnected';
        this.notifyStatusListeners();
        this.stopPingInterval();
        this.attemptReconnect();
      };
    } catch (error) {
      // Don't log error if WebSocket is simply not available
      this.status = 'error';
      this.notifyStatusListeners();
      this.attemptReconnect();
    }
  }

  private pingIntervalId: ReturnType<typeof setInterval> | null = null;

  private startPingInterval(): void {
    const OPEN = 1; // WebSocket.OPEN constant
    
    this.stopPingInterval();
    this.pingIntervalId = setInterval(() => {
      if (this.ws?.readyState === OPEN) {
        this.send({ type: 'ping', timestamp: Date.now() });
      } else {
        this.stopPingInterval();
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopPingInterval(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // Don't log max attempts - it's normal if server is not running
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      // Only log first reconnection attempt to avoid spam
      if (this.reconnectAttempts === 1) {
        console.log('WebSocket: Attempting to reconnect (server may be offline)');
      }
      this.connect();
      
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 16000);
    }, this.reconnectDelay);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopPingInterval();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.status = 'disconnected';
    this.notifyStatusListeners();
  }

  send(message: WebSocketMessage): void {
    const OPEN = 1; // WebSocket.OPEN constant
    
    if (this.ws?.readyState === OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onStatusChange(listener: (status: WebSocketStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  getStatus(): WebSocketStatus {
    return this.status;
  }

  private notifyStatusListeners(): void {
    this.statusListeners.forEach((listener) => {
      try {
        listener(this.status);
      } catch (error) {
        console.error('Error in status listener:', error);
      }
    });
  }
}

// Default WebSocket URL - can be configured via environment variable
// If not set, WebSocket will not attempt to connect (no errors in logs)
const WS_URL = process.env.EXPO_PUBLIC_WS_URL;

export const wsService: WebSocketService | null = WS_URL ? new WebSocketService(WS_URL) : null;

