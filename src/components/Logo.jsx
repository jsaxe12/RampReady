export function LogoMark({ size = 28, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background rounded square */}
      <rect width="120" height="120" rx="26" fill="#4A90D9" />

      {/* Runway center stripe — perspective converging upward */}
      <path
        d="M54 108 L58 45 L62 45 L66 108Z"
        fill="white"
        opacity="0.3"
      />
      {/* Runway dashes */}
      <rect x="57" y="50" width="6" height="8" rx="1" fill="white" opacity="0.25" />
      <rect x="56.5" y="64" width="7" height="8" rx="1" fill="white" opacity="0.2" />
      <rect x="56" y="80" width="8" height="10" rx="1" fill="white" opacity="0.15" />
      <rect x="55.5" y="96" width="9" height="10" rx="1" fill="white" opacity="0.1" />

      {/* Aircraft — clean top-down silhouette, climbing out */}
      <g transform="translate(60, 38) rotate(0)">
        {/* Fuselage */}
        <path
          d="M0 -24 C2 -24 3 -20 3 -14 L3 18 C3 22 2 24 0 26 C-2 24 -3 22 -3 18 L-3 -14 C-3 -20 -2 -24 0 -24Z"
          fill="white"
        />
        {/* Wings — swept */}
        <path
          d="M3 2 L26 10 C28 10.5 28 12.5 26 13 L3 9Z"
          fill="white"
        />
        <path
          d="M-3 2 L-26 10 C-28 10.5 -28 12.5 -26 13 L-3 9Z"
          fill="white"
        />
        {/* Horizontal stabilizer */}
        <path
          d="M3 19 L12 22 C13 22.3 13 23.7 12 24 L3 22Z"
          fill="white"
        />
        <path
          d="M-3 19 L-12 22 C-13 22.3 -13 23.7 -12 24 L-3 22Z"
          fill="white"
        />
      </g>
    </svg>
  )
}

export function LogoFull({ height = 28, className = '' }) {
  const scale = height / 28
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={height} />
      <svg
        height={height * 0.65}
        viewBox="0 0 280 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* "RAMP" in bold */}
        <text
          x="0"
          y="30"
          fontFamily="'Inter', system-ui, sans-serif"
          fontWeight="700"
          fontSize="36"
          fill="#E8E8ED"
          letterSpacing="-0.5"
        >
          Ramp
        </text>
        {/* "READY" in accent blue */}
        <text
          x="103"
          y="30"
          fontFamily="'Inter', system-ui, sans-serif"
          fontWeight="700"
          fontSize="36"
          fill="#4A90D9"
          letterSpacing="-0.5"
        >
          Ready
        </text>
      </svg>
    </div>
  )
}
