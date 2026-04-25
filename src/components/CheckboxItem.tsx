import { useState } from 'react'

interface Checkbox {
  id: string
  checked: number
  updatedBy: string | null
}

interface CheckboxItemProps {
  checkbox: Checkbox
  onToggle: (id: string, checked: boolean) => void
}

const getAvatarUrl = (userId: string | null) => {
  if (!userId) return null
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userId)}`
}

const CheckIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export default function CheckboxItem({ checkbox, onToggle }: CheckboxItemProps) {
  const [imageError, setImageError] = useState(false)
  const isChecked = checkbox.checked === 1
  const avatarUrl = getAvatarUrl(checkbox.updatedBy)
  const showAvatar = isChecked && avatarUrl && !imageError

  return (
    <div
      role="checkbox"
      aria-checked={isChecked}
      aria-label={isChecked && checkbox.updatedBy ? `Checked by ${checkbox.updatedBy}` : 'Checkbox'}
      tabIndex={0}
      className={`checkbox-square ${isChecked ? 'checked' : 'empty'}`}
      onClick={() => onToggle(checkbox.id, !isChecked)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onToggle(checkbox.id, !isChecked)
        }
      }}
      title={isChecked && checkbox.updatedBy ? `Checked by ${checkbox.updatedBy}` : 'Click to check'}
    >
      {showAvatar ? (
        <img
          src={avatarUrl!}
          alt={`Checked by ${checkbox.updatedBy}`}
          className="avatar-image"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="check-icon" aria-hidden="true">
          <CheckIcon />
        </span>
      )}
    </div>
  )
}
