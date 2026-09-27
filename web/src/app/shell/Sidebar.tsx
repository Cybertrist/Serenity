import {
  LockSimpleIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SparkleIcon,
  type Icon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Badge, HealthRing, IconButton, Kbd, Logo, Orb, SPRING, Wordmark } from "../../design";
import { plural } from "../../lib/format";
import { useHealth } from "../health";
import { useSession } from "../session";
import { useShell, type Tab, type VaultZone } from "./context";
import { TABS } from "./nav";
import { useAgentState, useCounts } from "./useShellData";

function NavItem({
  icon: IconComponent,
  label,
  current = false,
  onClick,
  title,
  trailing,
  layout,
}: {
  icon: Icon;
  label: string;
  current?: boolean;
  onClick: () => void;
  title?: string;
  trailing?: ReactNode;
  /** Shared id of the sliding highlight, for the main navigation. */
  layout?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-current={current ? "page" : undefined}
      onClick={onClick}
      className={`group relative flex h-[34px] w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left text-[13.5px] font-medium transition-colors duration-150 ${
        current ? "text-text" : "text-muted hover:bg-hover hover:text-text"
      }`}
    >
      {current && layout ? (
        <motion.span
          layoutId={layout}
          transition={SPRING}
          aria-hidden="true"
          className="absolute inset-0 rounded-[8px] bg-glass-hi shadow-[inset_0_0_0_1px_var(--color-line)]"
        >
          <span className="absolute -left-2.5 bottom-[9px] top-[9px] w-[3px] rounded-r-[3px] bg-(--halo) shadow-[0_0_12px_var(--halo)]" />
        </motion.span>
      ) : null}
      <IconComponent
        size={18}
        weight={current ? "fill" : "regular"}
        aria-hidden="true"
        className={`relative shrink-0 ${current ? "text-accent-text" : ""}`}
      />
      <span className="relative min-w-0 flex-1 truncate">{label}</span>
      {trailing ? <span className="relative">{trailing}</span> : null}
    </button>
  );
}

function Quiet({ value }: { value: number }) {
  return <span className="tabular text-[12px] font-medium text-faint">{value}</span>;
}

/**
 * The side of a wide app: the screens, the two zones, then at the bottom how the vault is
 * doing (health ring), what the agent is doing (its orb), the settings, and who is here.
 * In a browser it also carries the brand; the desktop app has it in its title bar.
 */
export function Sidebar({ brand }: { brand: boolean }) {
  const shell = useShell();
  const session = useSession();
  const counts = useCounts();
  const health = useHealth();
  const agent = useAgentState();

  const trailing = (id: Tab): ReactNode => {
    if (id === "vault") return <Quiet value={counts.all} />;
    if (id === "codes") return <Quiet value={counts.codes} />;
    if (id === "breaches")
      return health.flagged > 0 ? (
        <Badge value={health.flagged} tone="warn" label={`${String(health.flagged)} à voir`} />
      ) : null;
    return agent.waiting > 0 ? (
      <Badge value={agent.waiting} tone="violet" label={`${String(agent.waiting)} à valider`} />
    ) : null;
  };

  const zone = (z: VaultZone) => {
    shell.setVaultZone(shell.tab === "vault" && shell.vaultZone === z ? "all" : z);
    shell.go("vault");
  };

  const healthLine =
    health.score === null
      ? "En cours de calcul"
      : health.flagged + health.emails === 0
        ? "Tout va bien"
        : `${plural(health.flagged + health.emails, "point", "points")} à voir`;

  const agentTitle =
    agent.running === null ? "Agent" : agent.running ? "L'agent veille" : "Agent arrêté";
  const agentLine =
    agent.running === null
      ? session.offline
        ? "Hors ligne"
        : "Un instant…"
      : !agent.running
        ? "Kill switch enclenché"
        : agent.active > 0
          ? "Rotation en cours"
          : agent.waiting > 0
            ? `${plural(agent.waiting, "rotation", "rotations")} à valider`
            : "Rien en attente";

  const host = typeof location !== "undefined" ? location.host : "";
  const name = session.username ?? "";

  return (
    <aside className="relative z-10 flex w-[248px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-line bg-[color-mix(in_oklab,var(--color-surface)_72%,transparent)] px-2.5 pb-3 pt-3.5 backdrop-blur-[24px]">
      {brand ? (
        <div className="flex items-center gap-2.5 px-2 pt-1">
          <Logo size={28} />
          <Wordmark size={21} />
        </div>
      ) : null}

      <nav aria-label="Navigation principale" className="flex flex-col gap-px">
        {TABS.map(({ id, long, icon, keys }) => (
          <NavItem
            key={id}
            icon={icon}
            label={long}
            title={`${long} (G puis ${keys.slice(-1).toUpperCase()})`}
            current={shell.tab === id}
            layout="side-current"
            onClick={() => {
              shell.go(id);
            }}
            trailing={trailing(id)}
          />
        ))}
      </nav>

      <div className="flex flex-col gap-1.5">
        <span className="eyebrow px-2.5">Zones</span>
        <div className="flex flex-col gap-px">
          <NavItem
            icon={ShieldCheckIcon}
            label="Protégé par toi"
            current={shell.tab === "vault" && shell.vaultZone === "personal"}
            onClick={() => {
              zone("personal");
            }}
            trailing={<Quiet value={counts.personal} />}
          />
          <NavItem
            icon={SparkleIcon}
            label="Confié à l'agent"
            current={shell.tab === "vault" && shell.vaultZone === "agent"}
            onClick={() => {
              zone("agent");
            }}
            trailing={<Quiet value={counts.agent} />}
          />
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => {
            shell.go("breaches");
          }}
          className="flex items-center gap-3 rounded-[11px] p-2 text-left transition-colors duration-150 hover:bg-hover"
        >
          <HealthRing score={health.score} size={40} ticks={40} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[12.5px] font-medium leading-tight">Santé du coffre</span>
            <span className="truncate text-[11.5px] leading-tight text-faint">{healthLine}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            shell.go("agent");
          }}
          className="flex items-center gap-3 rounded-[11px] p-2 pl-[11px] text-left transition-colors duration-150 hover:bg-hover"
        >
          <Orb size={22} off={agent.running !== true} />
          <span className="flex min-w-0 flex-col gap-0.5 pl-[3px]">
            <span className="text-[12.5px] font-medium leading-tight">{agentTitle}</span>
            <span className="truncate text-[11.5px] leading-tight text-faint">{agentLine}</span>
          </span>
        </button>
        <NavItem
          icon={SlidersHorizontalIcon}
          label="Réglages"
          title="Réglages (Ctrl ,)"
          current={shell.tab === "settings"}
          layout="side-current"
          onClick={() => {
            shell.openSettings();
          }}
          trailing={<Kbd keys="mod+," className="opacity-0 group-hover:opacity-100" />}
        />
        <div className="mt-1 flex items-center gap-2.5 border-t border-line px-2 pt-3">
          <span
            aria-hidden="true"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-linear-to-br from-[#3b82f6] to-[#1e3a8a] font-display text-[12px] font-bold text-white"
          >
            {(name[0] ?? "?").toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] font-medium leading-tight">{name}</span>
            <span className="truncate text-[11.5px] leading-tight text-faint">{host}</span>
          </span>
          <IconButton
            icon={LockSimpleIcon}
            size="sm"
            label="Verrouiller (Ctrl L)"
            onClick={shell.lock}
          />
        </div>
      </div>
    </aside>
  );
}
