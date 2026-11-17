import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      setSocket(null);
      return undefined;
    }

    const s = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
      withCredentials: true,
      // Keep Socket.IO's polling transport and WebSocket upgrade fallback.
    });

    const onConnectError = (error) => {
      if (error.message === 'Account suspended') s.disconnect();
    };
    s.on('connect_error', onConnectError);
    setSocket(s);
    return () => {
      s.off('connect_error', onConnectError);
      s.disconnect();
    };
  }, [loading, user]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSocket() {
  return useContext(SocketContext);
}
