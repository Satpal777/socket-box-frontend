import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { io, Socket } from 'socket.io-client';
import CheckboxItem from './CheckboxItem';

const CELL_SIZE = 54;
const GAP = 7;
const API_URL = import.meta.env.VITE_API_URL;
const ASSIGN_URL = import.meta.env.VITE_ASSIGN_URL;

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
async function assignBackend(): Promise<string> {
  try {
    const res = await fetch(ASSIGN_URL, { credentials: 'include' });
    if (!res.ok) throw new Error('Assign failed');
    const { backend } = await res.json();
    return backend;
  } catch {
    console.warn('Worker assign failed, falling back to API_URL');
    return API_URL;
  }
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
  const backendRef = useRef<string>(API_URL);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        const backend = await assignBackend();
        backendRef.current = backend;
        console.log('Assigned backend:', backend);

        const token = localStorage.getItem('aura_token');
        const res = await fetch(`${backend}/api/checkboxes`);
        const { total, items }: { total: number; items: Checkbox[] } = await res.json();

        if (cancelled) return;

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

        const socket: Socket = io(backend, {
          auth: { token }
        });

        socketRef.current = socket;

        const onConnect = () => {
          setConnected(true);
          socket.emit('user:join', userId);
        };

        const onDisconnect = async (reason: string) => {
          setConnected(false);

          if (reason === 'transport error' || reason === 'transport close') {
            console.warn('Backend lost, re-assigning...');
            document.cookie = 'io=; Max-Age=0; path=/;';
            await new Promise(r => setTimeout(r, 2000));
            if (!cancelled) {
              socket.disconnect();
              init();
            }
          }
        };

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

      } catch {
        if (!cancelled) setError('Failed to load checkboxes. Is the backend running?');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
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
