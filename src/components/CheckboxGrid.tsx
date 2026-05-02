import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { io, Socket } from 'socket.io-client';
import CheckboxItem from './CheckboxItem';

const CELL_SIZE = 54;
const GAP = 7;
const API_URL = import.meta.env.VITE_API_URL;

interface Checkbox {
  id: string;
  checked: number;
  updatedBy: string | null;
}

interface CheckboxGridProps {
  userId: string;
  onStatsChange: (stats: {
    onlineCount: number;
    connected: boolean;
    checkedCount: number;
    totalCount: number;
  }) => void;
}

export default function CheckboxGrid({ userId, onStatsChange }: CheckboxGridProps) {
  const [checkboxes, setCheckboxes] = useState<Checkbox[]>([]);
  const [checkedCount, setCheckedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [cols, setCols] = useState(10);
  const [scrollMargin, setScrollMargin] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const indexMapRef = useRef<Map<string, number>>(new Map());
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCheckboxes = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_URL}/api/checkboxes`);
        const { total, items }: { total: number; items: Checkbox[] } = await res.json();

        const data: Checkbox[] = Array.from({ length: total }, (_, i) => ({
          id: String(i + 1),
          checked: 0,
          updatedBy: null,
        }));

        const map = new Map<string, number>();
        for (let i = 0; i < total; i++) map.set(String(i + 1), i);
        indexMapRef.current = map;

        let count = 0;
        for (const item of items) {
          const idx = map.get(item.id);
          if (idx !== undefined) {
            data[idx] = item;
            if (item.checked === 1) count++;
          }
        }

        setCheckboxes(data);
        setCheckedCount(count);
      } catch {
        setError('Failed to load checkboxes. Is the backend running?');
      } finally {
        setLoading(false);
      }
    };

    fetchCheckboxes();

    const socket: Socket = io(API_URL);
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      socket.emit('user:join', userId);
    };
    const onDisconnect = () => setConnected(false);
    const onUsersOnline = (count: number) => setOnlineCount(count);

    const onCheckboxUpdated = (updated: Checkbox) => {
      const idx = indexMapRef.current.get(updated.id);
      if (idx === undefined) return;
      setCheckboxes(prev => {
        const wasChecked = prev[idx].checked;
        if (wasChecked !== updated.checked) {
          setCheckedCount(c => updated.checked === 1 ? c + 1 : c - 1);
        }
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('users:online', onUsersOnline);
    socket.on('checkbox:updated', onCheckboxUpdated);

    if (socket.connected) {
      setConnected(true);
      socket.emit('user:join', userId);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('users:online', onUsersOnline);
      socket.off('checkbox:updated', onCheckboxUpdated);
      socket.disconnect();
    };
  }, [userId]);

  useEffect(() => {
    onStatsChange({ onlineCount, connected, checkedCount, totalCount: checkboxes.length });
  }, [onlineCount, connected, checkedCount, checkboxes.length]);

  useLayoutEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const margin = rect.top + window.scrollY;
      setScrollMargin(margin);
      const c = Math.max(1, Math.floor((rect.width + GAP) / (CELL_SIZE + GAP)));
      setCols(c);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [loading]);

  const rowCount = Math.ceil(checkboxes.length / cols);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => CELL_SIZE + GAP,
    overscan: 5,
    scrollMargin,
  });

  const handleToggle = useCallback((checkboxId: string, newState: boolean) => {
    const idx = indexMapRef.current.get(checkboxId);
    if (idx === undefined) return;

    setCheckboxes(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], checked: newState ? 1 : 0, updatedBy: userId };
      return next;
    });
    setCheckedCount(c => newState ? c + 1 : c - 1);

    socketRef.current?.emit('checkbox:update', {
      id: checkboxId,
      checked: newState,
      userId,
    });
  }, [userId]);

  if (loading) {
    return (
      <div className="panel">
        <div className="loading">
          <div className="spinner" />
          Loading checkboxes…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel">
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!loading && checkboxes.length === 0 && !error) {
    return (
      <div className="panel">
        <div className="empty">No checkboxes found.</div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div
        ref={parentRef}
        role="group"
        aria-label="Checkbox selection grid"
        style={{ position: 'relative', height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map(virtualRow => {
          const startIdx = virtualRow.index * cols;
          const rowItems = checkboxes.slice(startIdx, startIdx + cols);
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: virtualRow.start - virtualizer.options.scrollMargin,
                left: 0,
                right: 0,
                height: CELL_SIZE,
                display: 'flex',
                justifyContent: 'center',
                gap: GAP,
              }}
            >
              {rowItems.map(checkbox => (
                <CheckboxItem
                  key={checkbox.id}
                  checkbox={checkbox}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
