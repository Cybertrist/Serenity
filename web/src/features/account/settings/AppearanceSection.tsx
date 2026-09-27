import { CheckIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Note, setThemeChoice, themeChoice, useTheme } from "../../../design";
import type { ThemeChoice } from "../../../design";
import { Group } from "./parts";

/**
 * The colours of each theme, as the app really paints them (theme.css): background, glass,
 * hairline, text, the blue of the light. The preview is a small copy of the app, not a swatch.
 */
const LOOK = {
  dark: {
    bg: "bg-[#070a12]",
    glow: "bg-[radial-gradient(70%_90%_at_88%_0%,rgb(59_130_246/0.55),transparent_70%)]",
    side: "bg-[rgb(10_14_24/0.9)] shadow-[inset_-1px_0_0_rgb(148_163_196/0.1)]",
    card: "bg-[rgb(24_31_50/0.8)] shadow-[inset_0_0_0_1px_rgb(148_163_196/0.14)]",
    ink: "bg-[#e9edf5]",
    faint: "bg-[rgb(167_177_198/0.35)]",
    accent: "bg-[#3b82f6]",
  },
  light: {
    bg: "bg-[#f2f4f9]",
    glow: "bg-[radial-gradient(70%_90%_at_88%_0%,rgb(59_130_246/0.28),transparent_70%)]",
    side: "bg-[rgb(235_238_245/0.95)] shadow-[inset_-1px_0_0_rgb(15_23_42/0.08)]",
    card: "bg-white shadow-[0_1px_2px_rgb(15_23_42/0.06),inset_0_0_0_1px_rgb(15_23_42/0.06)]",
    ink: "bg-[#0b1222]",
    faint: "bg-[rgb(69_80_104/0.3)]",
    accent: "bg-[#2563eb]",
  },
} as const;

/** A tiny vault: the sidebar, a title, a card with two entries, the blue button. */
function Miniature({ look, className = "" }: { look: "dark" | "light"; className?: string }) {
  const c = LOOK[look];
  const entry = (width: string) => (
    <span className="flex items-center gap-1">
      <span className={`h-2 w-2 shrink-0 rounded-[3px] ${c.accent} opacity-80`} />
      <span className={`h-[3px] rounded-full ${c.faint} ${width}`} />
    </span>
  );
  return (
    <span
      aria-hidden="true"
      className={`absolute inset-0 flex overflow-hidden ${c.bg} ${className}`}
    >
      <span className={`absolute inset-0 ${c.glow}`} />
      <span className={`relative flex w-[24%] flex-col gap-1 px-1.5 pt-2 ${c.side}`}>
        <span className={`h-[3px] w-3/4 rounded-full ${c.ink} opacity-80`} />
        <span className={`h-[3px] w-1/2 rounded-full ${c.faint}`} />
        <span className={`h-[3px] w-2/3 rounded-full ${c.faint}`} />
      </span>
      <span className="relative flex flex-1 flex-col gap-1.5 p-2">
        <span className={`h-1 w-2/5 rounded-full ${c.ink}`} />
        <span className={`flex flex-col gap-1.5 rounded-[5px] p-1.5 ${c.card}`}>
          {entry("w-3/5")}
          {entry("w-2/5")}
        </span>
        <span className={`mt-auto h-2.5 w-2/5 self-end rounded-[4px] ${c.accent}`} />
      </span>
    </span>
  );
}

const CARDS: { value: ThemeChoice; label: string }[] = [
  { value: "dark", label: "Sombre" },
  { value: "light", label: "Clair" },
  { value: "system", label: "Comme le système" },
];

/** Light, dark or the system's. Like the auto-lock delay, it belongs to this device. */
export function AppearanceSection() {
  const [choice, setChoice] = useState<ThemeChoice>(themeChoice());
  const theme = useTheme();
  return (
    <>
      <Group
        title="Thème"
        text={
          choice === "system"
            ? `Il suit ton appareil, et change avec lui le soir venu. En ce moment : ${theme === "light" ? "clair" : "sombre"}.`
            : "Le thème suit ton choix sur cet appareil seulement."
        }
      >
        <div
          role="radiogroup"
          aria-label="Thème de l'interface"
          className="grid grid-cols-3 gap-2.5 @[900px]:gap-3"
        >
          {CARDS.map(({ value, label }) => {
            const selected = value === choice;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setChoice(value);
                  setThemeChoice(value);
                }}
                className={`flex min-w-0 flex-col gap-2 rounded-[12px] border p-1.5 pb-2 text-left transition-[border-color,box-shadow] duration-150 ${
                  selected
                    ? "border-accent shadow-[0_0_0_3px_var(--color-accent-soft)]"
                    : "border-line-strong hover:border-[color-mix(in_oklab,var(--color-text)_25%,transparent)]"
                }`}
              >
                <span className="relative block aspect-[16/10] overflow-hidden rounded-[8px] shadow-[inset_0_0_0_1px_var(--color-line)]">
                  {value === "system" ? (
                    <>
                      <Miniature look="light" />
                      <Miniature
                        look="dark"
                        className="[clip-path:polygon(0_0,58%_0,42%_100%,0_100%)]"
                      />
                    </>
                  ) : (
                    <Miniature look={value} />
                  )}
                </span>
                <span className="flex items-center justify-between gap-1 px-1 text-[12.5px] font-medium leading-tight @[620px]:text-[13px]">
                  <span className="min-w-0">{label}</span>
                  {selected ? (
                    <CheckIcon
                      size={15}
                      weight="bold"
                      aria-hidden="true"
                      className="shrink-0 text-accent-text"
                    />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </Group>
      <Note>
        Réglage propre à cet appareil : gardé dans le navigateur, jamais envoyé au serveur.
      </Note>
    </>
  );
}
