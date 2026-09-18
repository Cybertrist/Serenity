import { GearIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { IconButton } from "../../design";
import { useShell } from "./context";

export function Header({ title, actions }: { title: string; actions?: ReactNode }) {
  const shell = useShell();
  return (
    <header className="flex min-h-11 items-center justify-between px-5 pb-2 pt-5">
      <h1 className="m-0 text-title tracking-tight">{title}</h1>
      <div className="flex gap-1">
        {actions}
        <IconButton icon={GearIcon} label="Réglages" onClick={shell.openSettings} />
      </div>
    </header>
  );
}
