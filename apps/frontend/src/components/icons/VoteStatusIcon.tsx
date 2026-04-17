type VoteStatusIconProps = {
  mobile?: boolean;
  state: "voted" | "waiting";
};

const getIndicatorBoxClassName = (mobile = false) =>
  `inline-flex items-center justify-center ${mobile ? "h-[1.15rem] w-[1.15rem]" : "h-[1.4rem] w-[1.4rem]"}`;

export const VoteStatusIcon = ({ mobile = false, state }: VoteStatusIconProps) => {
  if (state === "waiting") {
    return (
      <span
        aria-label="Waiting for vote"
        className={getIndicatorBoxClassName(mobile)}
      >
        <span className="h-[0.24rem] w-[0.24rem] rounded-full bg-[color:var(--muted)] opacity-85" />
      </span>
    );
  }

  return (
    <span
      aria-label="Voted"
      className={`${getIndicatorBoxClassName(mobile)} text-[color:var(--rail-accent)]`}
    >
      <svg
        aria-hidden="true"
        className="h-full w-full"
        fill="none"
        viewBox="0 0 16 16"
      >
        <path
          d="M3.5 8.5 6.5 11.5 12.5 4.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.8"
        />
      </svg>
    </span>
  );
};
