import { FBO_INFO } from '../data/seed'

export default function FBOSettingsPanel() {
  return (
    <div className="space-y-3">
      {/* Hours */}
      <div className="bg-surface-800 rounded-lg ring-1 ring-border p-4">
        <h3 className="text-[13px] font-semibold text-text-primary uppercase tracking-wider mb-2">
          Hours
        </h3>
        <p className="text-[13px] font-mono text-sky">{FBO_INFO.hours}</p>
      </div>

      {/* Services */}
      <div className="bg-surface-800 rounded-lg ring-1 ring-border p-4">
        <h3 className="text-[13px] font-semibold text-text-primary uppercase tracking-wider mb-3">
          Services
        </h3>
        <div className="grid grid-cols-1 gap-1.5">
          {FBO_INFO.servicesOffered.map((s) => (
            <div key={s} className="flex items-center gap-2 text-[12px] text-text-secondary">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-good shrink-0">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
