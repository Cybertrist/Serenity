import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { LockMark, Note, Segmented, setThemeChoice, themeChoice, useTheme } from "../../../design";
import type { ThemeChoice } from "../../../design";

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "Système" },
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
];

/** Light or dark. Like the auto-lock delay, it belongs to this device and stays here. */
export function AppearanceSection() {
  const [choice, setChoice] = useState<ThemeChoice>(themeChoice());
  const theme = useTheme();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="m-0 text-body font-medium">Thème</p>
        <p className="m-0 text-caption text-muted">
          « Système » suit ton téléphone ou ton ordinateur, et change avec lui, y compris au
          basculement automatique du soir.
        </p>
      </div>
      <Segmented
        options={OPTIONS}
        value={choice}
        label="Thème de l'interface"
        onChange={(v) => {
          setChoice(v);
          setThemeChoice(v);
        }}
      />
      <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-5">
        <LockMark size={54} />
        <div className="flex flex-col gap-1">
          <p className="m-0 text-body font-medium">
            {theme === "light" ? "Thème clair" : "Thème sombre"}
          </p>
          <p className="m-0 flex items-center gap-1.5 text-caption text-muted">
            {theme === "light" ? (
              <SunIcon size={16} weight="duotone" aria-hidden="true" />
            ) : (
              <MoonIcon size={16} weight="duotone" aria-hidden="true" />
            )}
            Aperçu en direct, cadenas compris.
          </p>
        </div>
      </div>
      <Note>
        Réglage propre à cet appareil : gardé dans le navigateur, jamais envoyé au serveur.
      </Note>
    </div>
  );
}
