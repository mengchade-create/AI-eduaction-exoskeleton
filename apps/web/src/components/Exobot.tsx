type ExobotProps = {
  mood?: "hello" | "proud" | "thinking";
  className?: string;
};

const moodCopy: Record<NonNullable<ExobotProps["mood"]>, string> = {
  hello: "你好呀",
  proud: "准备好了",
  thinking: "想一想",
};

export function Exobot({ mood = "hello", className = "" }: ExobotProps) {
  return (
    <div className={`relative inline-flex flex-col items-center gap-3 ${className}`}>
      <svg
        aria-label={`Exobot ${moodCopy[mood]}`}
        role="img"
        viewBox="0 0 220 230"
        className="h-40 w-40 drop-shadow-lg sm:h-48 sm:w-48"
      >
        <rect x="58" y="58" width="104" height="98" rx="30" fill="#38BDF8" />
        <rect x="72" y="76" width="76" height="52" rx="22" fill="#F8FAFC" />
        <circle cx="92" cy="101" r="8" fill="#1F2937" />
        <circle cx="128" cy="101" r="8" fill="#1F2937" />
        <path
          d={mood === "thinking" ? "M94 119 Q110 113 126 119" : "M92 116 Q110 132 130 116"}
          fill="none"
          stroke="#1F2937"
          strokeLinecap="round"
          strokeWidth="7"
        />
        <circle cx="67" cy="111" r="12" fill="#FB7185" opacity="0.85" />
        <circle cx="153" cy="111" r="12" fill="#FB7185" opacity="0.85" />
        <path d="M84 58 L70 30" stroke="#1F2937" strokeLinecap="round" strokeWidth="8" />
        <path d="M136 58 L150 30" stroke="#1F2937" strokeLinecap="round" strokeWidth="8" />
        <circle cx="68" cy="27" r="11" fill="#FACC15" />
        <circle cx="152" cy="27" r="11" fill="#FACC15" />
        <path d="M58 104 H34 Q24 104 24 118 V130" stroke="#1F2937" strokeLinecap="round" strokeWidth="10" />
        <path d="M162 104 H186 Q196 104 196 118 V130" stroke="#1F2937" strokeLinecap="round" strokeWidth="10" />
        <circle cx="24" cy="139" r="15" fill="#22C55E" />
        <circle cx="196" cy="139" r="15" fill="#22C55E" />
        <rect x="78" y="154" width="64" height="34" rx="17" fill="#FACC15" />
        <path d="M88 188 V205" stroke="#1F2937" strokeLinecap="round" strokeWidth="10" />
        <path d="M132 188 V205" stroke="#1F2937" strokeLinecap="round" strokeWidth="10" />
      </svg>
      <span className="rounded-full bg-white px-5 py-2 text-base font-bold text-ink shadow">
        {moodCopy[mood]}
      </span>
    </div>
  );
}
