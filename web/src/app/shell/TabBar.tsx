import { SlidersHorizontalIcon } from "@phosphor-icons/react";
import { Badge } from "../../design";
import { useHealth } from "../health";
import { useShell, type Tab } from "./context";
import { TABS } from "./nav";
import { useAgentState } from "./useShellData";

/**
 * The tabs of a phone, under the thumb: the four screens and the settings. Frosted glass over
 * the content, which scrolls underneath.
 */
export function TabBar() {
  const shell = useShell();
  const health = useHealth();
  const agent = useAgentState();
  const badge = (id: Tab) =>
    id === "breaches" && health.flagged > 0 ? (
      <Badge
        value={health.flagged}
        tone="warn"
        label={`${String(health.flagged)} à voir`}
        className="absolute left-[calc(50%+5px)] top-0.5 !h-4 !min-w-4 !px-1 !text-[10px]"
      />
    ) : id === "agent" && agent.waiting > 0 ? (
      <Badge
        value={agent.waiting}
        tone="violet"
        label={`${String(agent.waiting)} à valider`}
        className="absolute left-[calc(50%+5px)] top-0.5 !h-4 !min-w-4 !px-1 !text-[10px]"
      />
    ) : null;

  const item =
    "relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-[12px] text-[10.5px] font-medium leading-none transition-colors duration-150";

  return (
    <nav
      aria-label="Navigation principale"
      className="glass-bar absolute inset-x-0 bottom-0 z-20 flex border-t border-line px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-1.5"
    >
      {TABS.map(({ id, label, hint, icon: IconComponent }) => {
        const active = id === shell.tab;
        return (
          <button
            key={id}
            type="button"
            title={hint}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              shell.go(id);
            }}
            className={`${item} ${active ? "text-text" : "text-faint hover:text-muted"}`}
          >
            <IconComponent
              size={23}
              weight={active ? "fill" : "regular"}
              aria-hidden="true"
              className={
                active ? "text-accent-text drop-shadow-[0_0_8px_var(--halo)]" : "text-current"
              }
            />
            <span>{label}</span>
            {badge(id)}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => {
          shell.openSettings();
        }}
        className={`${item} text-faint hover:text-muted`}
      >
        <SlidersHorizontalIcon size={23} aria-hidden="true" />
        <span>Réglages</span>
      </button>
    </nav>
  );
}
