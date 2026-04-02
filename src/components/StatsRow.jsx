import { useFBO } from '../context/FBOContext'

function Stat({ label, value, accent }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className={`font-mono text-2xl font-bold ${accent}`}>{value}</span>
      <span className="text-[12px] text-text-tertiary font-medium uppercase tracking-wider">
        {label}
      </span>
    </div>
  )
}

export default function StatsRow() {
  const { inbound, outbound, pendingInbound, confirmedInbound } = useFBO()

  return (
    <div className="flex items-center gap-8 px-1">
      <Stat label="Inbound" value={inbound.length} accent="text-good" />
      <div className="w-px h-5 bg-border" />
      <Stat label="Outbound" value={outbound.length} accent="text-sky" />
      <div className="w-px h-5 bg-border" />
      <Stat label="Confirmed" value={confirmedInbound.length} accent="text-text-primary" />
      <div className="w-px h-5 bg-border" />
      <Stat label="Pending" value={pendingInbound.length} accent="text-caution" />
    </div>
  )
}
