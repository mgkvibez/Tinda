export function VerifiedBadge({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  return (
    <span className="inline-flex items-center" title="Verified Employer">
      <svg
        className={sizes[size]}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2l2.4 2.4 3.4-.3.3 3.4L21 9.6l-1.4 3.1 1.4 3.1-2.9 2.1-.3 3.4-3.4-.3L12 24l-2.4-2.4-3.4.3-.3-3.4L3 15.6l1.4-3.1L3 9.4l2.9-2.1.3-3.4 3.4.3L12 2zm-1.2 13.5l4.8-4.8-1.4-1.4-3.4 3.4-1.7-1.7-1.4 1.4 3.1 3.1z" fill="#1d9bf0" />
      </svg>
    </span>
  )
}
