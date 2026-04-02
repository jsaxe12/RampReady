export default function ServiceChip({ service, size = 'sm' }) {
  let classes = 'bg-surface-600/60 text-text-secondary'
  if (service === 'Avgas') classes = 'bg-good-muted text-good'
  else if (service === 'Jet-A') classes = 'bg-sky-muted text-sky'

  const sizeClasses =
    size === 'lg'
      ? 'px-3 py-1 text-[13px]'
      : 'px-2 py-px text-[11px]'

  return (
    <span className={`${classes} ${sizeClasses} rounded font-medium tracking-wide whitespace-nowrap`}>
      {service}
    </span>
  )
}
