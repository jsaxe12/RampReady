import { useState, useEffect } from 'react'
import { useFBO } from '../context/FBOContext'

function PriceRow({ label, type, price, onSave }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(price.toFixed(2))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(price.toFixed(2))
  }, [price])

  const save = async () => {
    const num = parseFloat(value)
    if (!isNaN(num) && num > 0) {
      setSaving(true)
      await onSave(type, num)
      setSaving(false)
    }
    setEditing(false)
  }

  const onKey = (e) => {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') { setValue(price.toFixed(2)); setEditing(false) }
  }

  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${type === 'avgas' ? 'bg-good' : 'bg-sky'}`} />
        <span className="text-[13px] text-text-secondary">{label}</span>
      </div>
      {editing ? (
        <div className="flex items-center">
          <span className="text-text-tertiary text-sm mr-0.5">$</span>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={save}
            onKeyDown={onKey}
            autoFocus
            disabled={saving}
            className="w-16 bg-surface-900 border border-sky/40 rounded px-1.5 py-0.5 text-right font-mono text-sm text-text-primary focus:outline-none focus:border-sky disabled:opacity-50"
          />
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="font-mono text-lg font-bold text-text-primary hover:text-sky transition-colors cursor-pointer bg-transparent border-none"
          title="Click to edit"
        >
          ${price.toFixed(2)}
        </button>
      )}
    </div>
  )
}

export default function FuelPricesPanel() {
  const { fuelPrices, updateFuelPrice } = useFBO()
  const [minutesAgo, setMinutesAgo] = useState(0)

  useEffect(() => {
    const update = () => {
      if (fuelPrices.lastUpdated) {
        setMinutesAgo(Math.floor((Date.now() - fuelPrices.lastUpdated.getTime()) / 60000))
      }
    }
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [fuelPrices.lastUpdated])

  const isStale = minutesAgo >= 2880 // 48 hours

  const timeLabel = minutesAgo < 60
    ? `${minutesAgo}m ago`
    : minutesAgo < 1440
    ? `${Math.floor(minutesAgo / 60)}h ago`
    : `${Math.floor(minutesAgo / 1440)}d ago`

  return (
    <div className="bg-surface-800 rounded-lg ring-1 ring-border p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[13px] font-semibold text-text-primary uppercase tracking-wider">
          Fuel Prices
        </h3>
        {isStale && (
          <span className="text-[10px] bg-danger-muted text-danger px-1.5 py-0.5 rounded font-medium">
            STALE — update needed
          </span>
        )}
      </div>
      <p className="text-[11px] text-text-tertiary mb-2">
        Updated {timeLabel} · click to edit
      </p>

      <div className="divide-y divide-border">
        <PriceRow label="100LL Avgas" type="avgas" price={fuelPrices.avgas} onSave={updateFuelPrice} />
        <PriceRow label="Jet-A" type="jetA" price={fuelPrices.jetA} onSave={updateFuelPrice} />
      </div>
    </div>
  )
}
