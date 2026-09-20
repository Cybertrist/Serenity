import { ArrowsClockwiseIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button, Segmented, Toggle, type Tone } from "../../design";
import {
  DEFAULT_PASSPHRASE,
  DEFAULT_PASSWORD,
  generatePassphrase,
  generatePassword,
  passphraseBits,
  passwordBits,
} from "../../vault/generator";

const KINDS = [
  { value: "password" as const, label: "Mot de passe" },
  { value: "passphrase" as const, label: "Phrase de passe" },
];

/** Entropy in plain words: the number alone means nothing to most people. */
function strength(bits: number): { label: string; tone: Tone; ratio: number } {
  if (bits < 60) return { label: "Faible", tone: "crit", ratio: bits / 128 };
  if (bits < 80) return { label: "Correct", tone: "warn", ratio: bits / 128 };
  if (bits < 100) return { label: "Solide", tone: "ok", ratio: bits / 128 };
  return { label: "Très solide", tone: "ok", ratio: Math.min(1, bits / 128) };
}

const BARS: Record<Tone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  crit: "bg-crit",
  accent: "bg-accent",
  neutral: "bg-muted",
};

const TEXTS: Record<Tone, string> = {
  ok: "text-ok",
  warn: "text-warn",
  crit: "text-crit",
  accent: "text-accent",
  neutral: "text-muted",
};

/** Password or passphrase generator, uniform randomness from libsodium. */
export function Generator({ onUse }: { onUse: (value: string) => void }) {
  const [kind, setKind] = useState<"password" | "passphrase">("password");
  const [length, setLength] = useState(DEFAULT_PASSWORD.length);
  const [symbols, setSymbols] = useState(true);
  const [words, setWords] = useState(DEFAULT_PASSPHRASE.words);
  const make = () =>
    kind === "password"
      ? generatePassword({ ...DEFAULT_PASSWORD, length, symbols })
      : generatePassphrase({ ...DEFAULT_PASSPHRASE, words, withDigit: true });
  const [value, setValue] = useState(make);
  const bits =
    kind === "password"
      ? passwordBits({ ...DEFAULT_PASSWORD, length, symbols })
      : passphraseBits({ ...DEFAULT_PASSPHRASE, words, withDigit: true });
  const level = strength(bits);

  const regenerate = (
    next?: Partial<{ kind: typeof kind; length: number; symbols: boolean; words: number }>,
  ) => {
    const k = next?.kind ?? kind;
    const opts = {
      length: next?.length ?? length,
      symbols: next?.symbols ?? symbols,
      words: next?.words ?? words,
    };
    setValue(
      k === "password"
        ? generatePassword({ ...DEFAULT_PASSWORD, length: opts.length, symbols: opts.symbols })
        : generatePassphrase({ ...DEFAULT_PASSPHRASE, words: opts.words, withDigit: true }),
    );
  };

  return (
    <div className="flex flex-col gap-3.5 rounded-card border border-line bg-surface p-4">
      <Segmented
        options={KINDS}
        value={kind}
        label="Type"
        onChange={(k) => {
          setKind(k);
          regenerate({ kind: k });
        }}
      />
      <p className="m-0 break-all rounded-chip bg-raised px-3.5 py-3 font-mono text-body">
        {value}
      </p>
      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-soft">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${BARS[level.tone]}`}
            style={{ width: `${String(Math.round(level.ratio * 100))}%` }}
          />
        </div>
        <p className="m-0 text-caption text-muted">
          <span className={TEXTS[level.tone]}>{level.label}</span> · {Math.round(bits)} bits
          d'entropie
        </p>
      </div>
      {kind === "password" ? (
        <>
          <label className="flex items-center justify-between gap-3 text-caption text-muted">
            Longueur : {length}
            <input
              type="range"
              min={12}
              max={64}
              value={length}
              onChange={(e) => {
                setLength(Number(e.target.value));
                regenerate({ length: Number(e.target.value) });
              }}
              className="w-40 accent-[#f2711c]"
            />
          </label>
          <div className="flex items-center justify-between text-caption text-muted">
            Symboles
            <Toggle
              checked={symbols}
              label="Symboles"
              onChange={(v) => {
                setSymbols(v);
                regenerate({ symbols: v });
              }}
            />
          </div>
        </>
      ) : (
        <label className="flex items-center justify-between gap-3 text-caption text-muted">
          Mots : {words}
          <input
            type="range"
            min={4}
            max={10}
            value={words}
            onChange={(e) => {
              setWords(Number(e.target.value));
              regenerate({ words: Number(e.target.value) });
            }}
            className="w-40 accent-[#f2711c]"
          />
        </label>
      )}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          icon={ArrowsClockwiseIcon}
          className="flex-1"
          onClick={() => {
            regenerate();
          }}
        >
          Autre
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            onUse(value);
          }}
        >
          Utiliser
        </Button>
      </div>
    </div>
  );
}
