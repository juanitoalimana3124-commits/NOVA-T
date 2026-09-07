import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import api from '../api/axios';

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin;

export function useManualPrices() {
  const [manualPrices, setManualPrices] = useState({});

  useEffect(() => {
    api.get('/prices').then(({ data }) => {
      if (data.data) setManualPrices(data.data);
    }).catch(() => {});

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    const handler = ({ coinId, price, enabled }) => {
      setManualPrices(prev => {
        const next = { ...prev };
        if (enabled && price > 0) {
          next[coinId] = price;
        } else {
          delete next[coinId];
        }
        return next;
      });
    };

    socket.on('price_update', handler);

    // Fix: cerrar socket al desmontar para evitar memory leak
    return () => {
      socket.off('price_update', handler);
      socket.disconnect();
    };
  }, []);

  const resolvePrice = (coinId, realPrice) =>
    manualPrices[coinId] !== undefined ? manualPrices[coinId] : realPrice;

  return { manualPrices, resolvePrice };
}
