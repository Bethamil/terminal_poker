import { COFFEE_VOTE_VALUE } from "@terminal-poker/shared-types";

type CoffeeVoteVariant = "compact" | "hero" | "tile" | "mobile";

const COFFEE_ICON_STYLES: Record<CoffeeVoteVariant, { wrapper: string; steam: string; cup: string }> = {
  compact: {
    wrapper: "inline-flex h-[1.15em] w-[1.15em] flex-col items-center justify-center leading-none text-current",
    steam: "translate-x-[0.12rem] font-['JetBrains_Mono'] text-[0.58rem] font-bold leading-none tracking-[0.12em]",
    cup: "font-['JetBrains_Mono'] text-[0.82rem] font-bold leading-none tracking-[0.08em]"
  },
  hero: {
    wrapper:
      "inline-flex h-[1.22em] w-[1.22em] flex-col items-center justify-center leading-none text-inherit",
    steam:
      "translate-x-[0.26rem] font-['JetBrains_Mono'] text-[clamp(0.9rem,0.8vw+0.4rem,1.25rem)] font-bold leading-none tracking-[0.16em]",
    cup:
      "font-['JetBrains_Mono'] text-[clamp(1.4rem,1vw+0.8rem,2rem)] font-bold leading-none tracking-[0.1em]"
  },
  tile: {
    wrapper:
      "inline-flex h-[1.15em] w-[1.15em] -translate-y-[0.04rem] flex-col items-center justify-center leading-none text-[color:color-mix(in_srgb,var(--vote-tile-value)_92%,white_8%)]",
    steam: "translate-x-[0.18rem] font-['JetBrains_Mono'] text-[0.98rem] font-bold leading-none tracking-[0.1em]",
    cup: "font-['JetBrains_Mono'] text-[1.38rem] font-bold leading-none tracking-[0.06em]"
  },
  mobile: {
    wrapper: "inline-flex h-[0.92em] w-[0.92em] flex-col items-center justify-center leading-none text-current",
    steam: "translate-x-[0.1rem] font-['JetBrains_Mono'] text-[0.62rem] font-bold leading-none tracking-[0.08em]",
    cup: "font-['JetBrains_Mono'] text-[0.86rem] font-bold leading-none tracking-[0.05em]"
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
        <span className={styles.steam}>//</span>
        <span className={styles.cup}>[_]</span>
      </span>
      <span className="sr-only">Coffee</span>
    </span>
  );
};
