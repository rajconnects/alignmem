// Mink mark — single-stroke continuous trace originating from the + node.
// Extracted verbatim from Design-System/direction-a-v3.jsx.
// The + is intentionally the same character used as the on-track signal
// throughout the UI. Brand mark = decision trace.
interface MinkMarkProps {
  strokeColor: string
}

export function MinkMark({ strokeColor }: MinkMarkProps) {
  return (
    <svg
      viewBox="0 0 88 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mink-svg"
      aria-hidden="true"
    >
      {/* + origin — the trace begins here */}
      <path
        d="M2,20 H13 M7.5,13 V27"
        stroke={strokeColor}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Mink body — single continuous trace */}
      <path
        d="M13,20
           C17,20 18,32 24,32
           C30,32 31,8 37,8
           C43,8 44,29 50,29
           C56,29 57,14 63,12
           C67,10 70,10 73,12
           C76,15 76,19 73,21
           M73,12
           C75,5 82,7 82,14
           C82,19 79,22 75,22
           L73,21"
        stroke={strokeColor}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
