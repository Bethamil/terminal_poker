interface RevealToggleIconProps {
  className?: string;
  isRevealed: boolean;
}

export const RevealToggleIcon = ({
  className = "h-[2rem] w-[2rem] shrink-0",
  isRevealed
}: RevealToggleIconProps) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
  >
    {isRevealed ? (
      <>
        <path
          d="M3.75 12.75C5.55 10.45 8.3 9 12 9s6.45 1.45 8.25 3.75"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
        <path
          d="M6.25 15.4 4.9 17.1"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.7"
        />
        <path
          d="M9.35 16.55 8.85 18.65"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.7"
        />
        <path
          d="M14.65 16.55 15.15 18.65"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.7"
        />
        <path
          d="M17.75 15.4 19.1 17.1"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.7"
        />
      </>
    ) : (
      <>
        <path
          d="M2.25 12S5.5 6.75 12 6.75 21.75 12 21.75 12 18.5 17.25 12 17.25 2.25 12 2.25 12Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
        <circle cx="12" cy="12" r="2.65" stroke="currentColor" strokeWidth="1.7" />
      </>
    )}
  </svg>
);
