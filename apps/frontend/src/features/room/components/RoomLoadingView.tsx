export const RoomLoadingView = () => (
  <div className="grid justify-items-center gap-4 text-center">
    <div
      aria-hidden="true"
      className="h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--outline)] border-t-[color:var(--primary)]"
    />
    <h1 className="font-['JetBrains_Mono'] text-sm uppercase tracking-[0.18em] text-[color:var(--text)]">
      Loading room...
    </h1>
  </div>
);
