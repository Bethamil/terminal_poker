interface NextRoundIconProps {
  className?: string;
}

export const NextRoundIcon = ({
  className = "font-['JetBrains_Mono'] text-[1.35rem] font-bold leading-none tracking-[-0.22em]"
}: NextRoundIconProps) => (
  <span aria-hidden="true" className={className}>
    {">>"}
  </span>
);
