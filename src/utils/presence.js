import { useEffect, useSyncExternalStore } from "react";
import { API_URL } from "@/utils/api";

const listeners = new Set();
const onlineUsers = new Set();
let version = 0;
let socket = null;
let stopped = true;
let reconnectTimer = null;

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getVersion() {
  return version;
}

export function useOnline(userId) {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  if (!userId) return false;
  return onlineUsers.has(String(userId));
}

function setOnline(userId, online) {
  if (!userId) return;
  const key = String(userId);
  const has = onlineUsers.has(key);
  if (online && !has) onlineUsers.add(key);
  if (!online && has) onlineUsers.delete(key);
  if (online !== has) emit();
}

export function presenceWsUrl(token) {
  const base = String(API_URL || "").replace(/\/$/, "");
  const wsBase = base.replace(/^https:/i, "wss:").replace(/^http:/i, "ws:");
  return `${wsBase}/notifications/ws?token=${encodeURIComponent(token)}`;
}

function sendHeartbeat() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "ping" }));
  }
}

export async function refreshPresence(userId) {
  if (!userId) return false;
  try {
    const response = await fetch(`${API_URL}/notifications/online/${userId}`);
    if (!response.ok) return false;
    const data = await response.json();
    setOnline(userId, !!data.online);
    return !!data.online;
  } catch {
    return false;
  }
}

function connect(token) {
  if (!token || typeof WebSocket === "undefined") return;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  const current = new WebSocket(presenceWsUrl(token));
  socket = current;
  current.onmessage = (event) => {
    let data = null;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }
    if (data?.type === "presence_snapshot" && Array.isArray(data.online_user_ids)) {
      onlineUsers.clear();
      data.online_user_ids.forEach((id) => onlineUsers.add(String(id)));
      emit();
    }
    if (data?.type === "presence" && data.user_id) {
      setOnline(data.user_id, !!data.online);
    }
  };
  current.onclose = (event) => {
    if (socket === current) socket = null;
    if (stopped || event.code === 4401) return;
    reconnectTimer = setTimeout(() => connect(token), 4000);
  };
}

export function startPresence(token) {
  stopped = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  connect(token);
  sendHeartbeat();
}

export function stopPresence() {
  stopped = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.close();
    socket = null;
  }
  if (onlineUsers.size) {
    onlineUsers.clear();
    emit();
  }
}

export function usePresenceConnection(token) {
  useEffect(() => {
    if (!token) {
      stopPresence();
      return undefined;
    }
    startPresence(token);
    const heartbeat = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        sendHeartbeat();
      } else {
        connect(token);
      }
    }, 20000);
    return () => {
      clearInterval(heartbeat);
      stopPresence();
    };
  }, [token]);
}
