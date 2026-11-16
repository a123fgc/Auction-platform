import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export default function useAuctionSocket(auctionId, handlers = {}) {
  const socket = useSocket();

  useEffect(() => {
    if (!socket || !auctionId) return;

    socket.emit('joinAuction', auctionId);

    const onNewBid = (payload) => handlers.onNewBid?.(payload);
    const onUpdate = (payload) => handlers.onAuctionUpdate?.(payload);
    const onEnded = (payload) => handlers.onAuctionEnded?.(payload);

    socket.on('newBid', onNewBid);
    socket.on('auctionUpdate', onUpdate);
    socket.on('auctionEnded', onEnded);

    return () => {
      socket.off('newBid', onNewBid);
      socket.off('auctionUpdate', onUpdate);
      socket.off('auctionEnded', onEnded);
      socket.emit('leaveAuction', auctionId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, auctionId]);
}