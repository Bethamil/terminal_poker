import { COFFEE_VOTE_VALUE } from "@terminal-poker/shared-types";

type CoffeeVoteVariant = "compact" | "hero" | "tile" | "mobile";

const COFFEE_ICON_STYLES: Record<
  CoffeeVoteVariant,
  { wrapper: string; svg: string; strokeWidth: number }
> = {
  compact: {
    wrapper: "coffee-vote inline-flex h-[1.1em] w-[1.1em] items-center justify-center align-middle text-current",
    svg: "h-full w-full",
    strokeWidth: 1.8
  },
  hero: {
    wrapper:
      "coffee-vote inline-flex h-[1.18em] w-[1.18em] items-center justify-center align-middle text-inherit",
    svg: "h-full w-full",
    strokeWidth: 1.7
  },
  tile: {
    wrapper:
      "coffee-vote coffee-vote--tile inline-flex h-[clamp(2.05rem,3.2vw,2.7rem)] w-[clamp(2.05rem,3.2vw,2.7rem)] items-center justify-center align-middle",
    svg: "h-full w-full",
    strokeWidth: 2
  },
  mobile: {
    wrapper: "coffee-vote inline-flex h-[0.96em] w-[0.96em] items-center justify-center align-middle text-current",
    svg: "h-full w-full",
    strokeWidth: 1.8
  }
};

export const CoffeeVote = ({
  value = COFFEE_VOTE_VALUE,
  variant = "compact"
}: {
  value?: string;
  variant?: CoffeeVoteVariant;
}) => {
  if (value !== COFFEE_VOTE_VALUE) {
    return value;
  }

  const styles = COFFEE_ICON_STYLES[variant];

  return (
    <span className="inline-flex items-center">
      <span aria-hidden="true" className={styles.wrapper}>
        <svg
          className={styles.svg}
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8.05 5.45L7.25 3.55"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={styles.strokeWidth}
          />
          <path
            d="M11.25 5.3V2.9"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={styles.strokeWidth}
          />
          <path
            d="M14.45 5.45L15.25 3.55"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={styles.strokeWidth}
          />
          <path
            d="M5.5 8.5H17V13.75C17 15.8211 15.3211 17.5 13.25 17.5H9.25C7.17893 17.5 5.5 15.8211 5.5 13.75V8.5Z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth={styles.strokeWidth}
          />
          <path
            d="M17 10H18.25C19.7688 10 21 11.2312 21 12.75C21 14.2688 19.7688 15.5 18.25 15.5H17"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={styles.strokeWidth}
          />
          <path
            d="M7.65 19H14.85"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={styles.strokeWidth}
          />
        </svg>
      </span>
      <span className="sr-only">Coffee</span>
    </span>
  );
};
