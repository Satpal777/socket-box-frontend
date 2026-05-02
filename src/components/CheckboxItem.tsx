import { useState, useEffect, memo } from 'react'

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

function CheckboxItem({ checkbox, onToggle }: CheckboxItemProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const isChecked = checkbox.checked === 1
  const avatarUrl = getAvatarUrl(checkbox.updatedBy)

  // Reset image state whenever the avatar source changes (different user checked it)
  useEffect(() => {
    setImageError(false)
    setImageLoaded(false)
  }, [avatarUrl])

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

    >
      {/*
        Always render the check icon — CSS controls visibility via .checked class.
        This means there is NO blank gap while the avatar loads: the check icon
        stays visible, and the avatar fades in on top of it once ready.
      */}
      <span className="check-icon" aria-hidden="true">
        <CheckIcon />
      </span>

      {showAvatar && (
        <img
          src={avatarUrl}
          alt={`Checked by ${checkbox.updatedBy}`}
          className={`avatar-image ${imageLoaded ? 'avatar-loaded' : ''}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}
    </div>
  )
}

export default memo(CheckboxItem)
