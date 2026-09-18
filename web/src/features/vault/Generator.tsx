import { ArrowsClockwiseIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button, Toggle } from "../../design";
import {
  DEFAULT_PASSPHRASE,
  DEFAULT_PASSWORD,
  generatePassphrase,
  generatePassword,
  passphraseBits,
  passwordBits,
} from "../../vault/generator";

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
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <div role="radiogroup" aria-label="Type" className="flex gap-2">
        {(["password", "passphrase"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => {
              setKind(k);
              regenerate({ kind: k });
            }}
            className={`h-9 rounded-full px-3.5 text-caption font-medium ${kind === k ? "bg-text text-bg" : "border border-line bg-surface text-muted"}`}
          >
            {k === "password" ? "Mot de passe" : "Phrase de passe"}
          </button>
        ))}
      </div>
      <p className="m-0 break-all rounded-chip bg-raised px-3 py-2.5 font-mono text-body">
        {value}
      </p>
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
              className="w-40 accent-[#f2762e]"
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
            className="w-40 accent-[#f2762e]"
          />
        </label>
      )}
      <p className="m-0 text-caption text-muted">Robustesse : {Math.round(bits)} bits</p>
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
