import { motion } from "motion/react";
import { SPRING } from "../../design";
import type { Tab } from "./context";
import { TABS } from "./nav";

type Badges = Partial<Record<Tab, number>>;

function Badge({ count, inline }: { count: number; inline: boolean }) {
  return (
    <span
      className={`tabular flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-crit px-1.5 text-micro font-bold text-white ${
        inline ? "" : "absolute left-[calc(50%+6px)] top-1.5 ring-2 ring-surface"
      }`}
    >
      <span className="sr-only">{`${String(count)} à voir`}</span>
      <span aria-hidden="true">{count > 9 ? "9+" : count}</span>
    </span>
  );
}

/** The four screens, at the bottom of a narrow app. */
export function TabBar({
  tab,
  onChange,
  badges,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
  badges: Badges;
}) {
  return (
    <nav
      aria-label="Navigation principale"
      className="flex shrink-0 gap-1 border-t border-line bg-surface/90 px-2 pb-[max(6px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md"
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
            className={`relative flex min-h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-control text-micro tracking-[0.01em] transition-colors duration-150 ${
              active ? "font-semibold text-text" : "font-medium text-muted hover:text-text"
            }`}
          >
            <span
              className={`relative flex h-8 w-14 items-center justify-center rounded-full ${active ? "text-accent" : ""}`}
            >
              {active ? (
                <motion.span
                  layoutId="tab-pill"
                  transition={SPRING}
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-accent-soft"
                />
              ) : null}
              <IconComponent
                size={22}
                weight={active ? "fill" : "regular"}
                aria-hidden="true"
                className="relative"
              />
            </span>
            <span className="relative">{label}</span>
            {badge > 0 ? <Badge count={badge} inline={false} /> : null}
          </button>
        );
      })}
    </nav>
  );
}

/** The same four screens, as the sidebar of a wide app. */
export function SideNav({
  tab,
  onChange,
  badges,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
  badges: Badges;
}) {
  return (
    <nav aria-label="Navigation principale" className="flex flex-col gap-0.5">
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
            className={`relative flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-body transition-colors duration-150 ${
              active
                ? "font-semibold text-text"
                : "font-medium text-muted hover:bg-hover hover:text-text"
            }`}
          >
            {active ? (
              <motion.span
                layoutId="side-pill"
                transition={SPRING}
                aria-hidden="true"
                className="absolute inset-0 rounded-control bg-raised shadow-card"
              />
            ) : null}
            <IconComponent
              size={20}
              weight={active ? "fill" : "regular"}
              aria-hidden="true"
              className={`relative ${active ? "text-accent" : ""}`}
            />
            <span className="relative flex-1 text-left">{label}</span>
            {badge > 0 ? (
              <span className="relative">
                <Badge count={badge} inline />
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
