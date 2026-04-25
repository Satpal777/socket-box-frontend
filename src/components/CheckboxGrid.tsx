import { useState, useEffect } from 'react';
import axios from 'axios';
import CheckboxItem from './CheckboxItem';
import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL

interface Checkbox {
  id: string
  checked: number
  updatedBy: string | null
}

interface CheckboxGridProps {
  userId: string
  onStatsChange: (stats: { onlineCount: number; connected: boolean; checkedCount: number; totalCount: number }) => void
}

export default function CheckboxGrid({ userId, onStatsChange }: CheckboxGridProps) {
  const [checkboxes, setCheckboxes] = useState<Checkbox[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [onlineCount, setOnlineCount] = useState(0)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    fetchCheckboxes();

    const socket: Socket = io(API_URL);

    const onConnect = () => {
      setConnected(true);
      socket.emit('user:join', userId);
    };
    const onDisconnect = () => setConnected(false);
    const onUsersOnline = (count: number) => setOnlineCount(count);
    const onCheckboxUpdated = (updatedBox: Checkbox) =>
      setCheckboxes((prev) =>
        prev.map((cb) => (cb.id === updatedBox.id ? updatedBox : cb))
      );

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('users:online', onUsersOnline);
    socket.on('checkbox:updated', onCheckboxUpdated);

    // If already connected at mount time, sync state
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
  }, [userId])

  const fetchCheckboxes = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get(`${API_URL}/api/checkboxes`)
      setCheckboxes(response.data)
    } catch {
      setError('Failed to load checkboxes. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (checkboxId: string, newState: boolean) => {
    // Optimistic update
    setCheckboxes(prev => prev.map(cb =>
      cb.id === checkboxId
        ? { ...cb, checked: newState ? 1 : 0, updatedBy: userId }
        : cb
    ))
    try {
      await axios.post(`${API_URL}/api/checkboxes/${checkboxId}/toggle`, {
        checked: newState ? 1 : 0,
        userId
      })
    } catch {
      // Revert on failure
      setCheckboxes(prev => prev.map(cb =>
        cb.id === checkboxId
          ? { ...cb, checked: newState ? 0 : 1 }
          : cb
      ))
      setError('Failed to update checkbox')
    }
  }

  const checkedCount = checkboxes.filter(cb => cb.checked === 1).length
  const totalCount = checkboxes.length

  useEffect(() => {
    onStatsChange({ onlineCount, connected, checkedCount, totalCount })
  }, [onlineCount, connected, checkedCount, totalCount])

  if (loading) {
    return (
      <div className="panel">
        <div className="loading">
          <div className="spinner" />
          Loading checkboxes…
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="panel">
        <div className="error">{error}</div>
      </div>
    )
  }

  if (checkboxes.length === 0) {
    return (
      <div className="panel">
        <div className="empty">No checkboxes found. Seed the database with: pnpm db:seed</div>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="checkbox-grid" role="group" aria-label="Checkbox selection grid">
        {checkboxes.map((checkbox) => (
          <CheckboxItem
            key={checkbox.id}
            checkbox={checkbox}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  )
}
