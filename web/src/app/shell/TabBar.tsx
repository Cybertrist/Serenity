import { motion } from "motion/react";
import { SPRING } from "../../design";
import type { Tab } from "./context";
import { TABS } from "./nav";

/** The four screens, at the bottom of the square. The active pill slides from the previous tab. */
export function TabBar({
  tab,
  onChange,
  badges,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
  badges: Partial<Record<Tab, number>>;
}) {
  return (
    <nav
      aria-label="Navigation principale"
      className="flex shrink-0 gap-1 border-t border-line px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 sm:px-4"
    >
      {TABS.map(({ id, label, hint, icon: IconComponent }) => {
        const active = id === tab;
        const badge = badges[id] ?? 0;
        return (
          <button
            key={id}
            type="button"
            title={hint}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              onChange(id);
            }}
            className={`relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-control text-caption transition-colors duration-150 @[620px]:flex-row @[620px]:gap-2 ${
              active ? "font-semibold text-accent" : "font-medium text-muted hover:text-text"
            }`}
          >
            {active ? (
              <motion.span
                layoutId="tab-pill"
                transition={SPRING}
                aria-hidden="true"
                className="absolute inset-0 rounded-control bg-accent-soft"
              />
            ) : null}
            <span className="relative">
              <IconComponent size={22} weight={active ? "fill" : "duotone"} aria-hidden="true" />
            </span>
            <span className="relative">{label}</span>
            {badge > 0 ? (
              <span className="absolute right-[calc(50%-24px)] top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-crit px-1 text-[11px] font-semibold text-bg @[620px]:static @[620px]:right-auto @[620px]:top-auto">
                <span className="sr-only">{`${String(badge)} à voir`}</span>
                <span aria-hidden="true">{badge > 9 ? "9+" : badge}</span>
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
