/**
 * WebSocket Hook for Real-time Article Updates
 * Connects to Django Channels WebSocket for live updates
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { WS_ARTICLES } from '../constants/api';
import { useAuth } from '../context/AuthContext';

export function useArticlesWebSocket() {
  const { token } = useAuth();
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const listenersRef = useRef({
    new_article: [],
    article_liked: [],
    new_comment: [],
    article_shared: [],
  });

  const connect = useCallback(() => {
    if (!token) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const wsUrl = WS_ARTICLES;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('[WS] Connected to articles WebSocket');
        setIsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { type } = data;
          
          const listeners = listenersRef.current[type] || [];
          listeners.forEach((callback) => callback(data));
        } catch (error) {
          console.error('[WS] Error parsing message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('[WS] Disconnected from articles WebSocket', event.code);
        setIsConnected(false);
        if (wsRef) {
          wsRef.current = null;
        }

        // Auto-reconnect after 3 seconds
        if (reconnectTimeoutRef) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[WS] WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('[WS] Error creating WebSocket:', error);
    }
  }, [token]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef && reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef && wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const subscribe = useCallback((eventType, callback) => {
    if (!listenersRef.current[eventType]) {
      listenersRef.current[eventType] = [];
    }
    listenersRef.current[eventType].push(callback);
    
    // Return unsubscribe function
    return () => {
      listenersRef.current[eventType] = listenersRef.current[eventType].filter(
        (cb) => cb !== callback
      );
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    subscribe,
    connect,
    disconnect,
  };
}