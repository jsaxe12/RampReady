const SERVICE_COLORS = {
  'Avgas':              'bg-good-muted text-good',
  'Jet-A':              'bg-sky-muted text-sky',
  'Ramp parking':       'bg-svc-parking-muted text-svc-parking',
  'Hangar overnight':   'bg-svc-hangar-muted text-svc-hangar',
  'Crew car':           'bg-svc-crewcar-muted text-svc-crewcar',
  'GPU / Ground power': 'bg-svc-gpu-muted text-svc-gpu',
  'Lav service':        'bg-svc-lav-muted text-svc-lav',
  'De-icing':           'bg-svc-deice-muted text-svc-deice',
  'Catering':           'bg-svc-catering-muted text-svc-catering',
  'Other':              'bg-svc-other-muted text-svc-other',
}

export default function ServiceChip({ service, size = 'sm' }) {
  const classes = SERVICE_COLORS[service] || 'bg-svc-other-muted text-svc-other'

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
