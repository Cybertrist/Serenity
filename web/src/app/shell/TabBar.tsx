import {
  type Icon,
  RobotIcon,
  SealWarningIcon,
  TerminalWindowIcon,
  VaultIcon,
} from "@phosphor-icons/react";
import type { Tab } from "./context";

const TABS: { id: Tab; label: string; icon: Icon }[] = [
  { id: "vault", label: "Coffre", icon: VaultIcon },
  { id: "breaches", label: "Fuites", icon: SealWarningIcon },
  { id: "logs", label: "Journal", icon: TerminalWindowIcon },
  { id: "agent", label: "Agent", icon: RobotIcon },
];

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
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[max(16px,env(safe-area-inset-bottom))] pt-2"
    >
      <div className="mx-auto flex max-w-[480px] px-3">
        {TABS.map(({ id, label, icon: IconComponent }) => {
          const active = id === tab;
          const badge = badges[id] ?? 0;
          return (
            <button
              key={id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => {
                onChange(id);
              }}
              className={`relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 text-caption transition-colors duration-150 ${active ? "font-semibold text-accent" : "font-medium text-muted"}`}
            >
              <IconComponent size={24} weight="duotone" aria-hidden="true" />
              <span>{label}</span>
              {badge > 0 ? (
                <span className="absolute right-[calc(50%-22px)] top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-crit px-1 text-[11px] font-semibold text-bg">
                  <span className="sr-only">{`${String(badge)} nouveau(x)`}</span>
                  <span aria-hidden="true">{badge > 9 ? "9+" : badge}</span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
