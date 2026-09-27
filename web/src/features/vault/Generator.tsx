import { ArrowsClockwiseIcon, CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { copySecret } from "../../app/clipboard";
import { useToast } from "../../app/toast";
import { Button, IconButton, Segmented, Toggle } from "../../design";
import {
  DEFAULT_PASSPHRASE,
  DEFAULT_PASSWORD,
  generatePassphrase,
  generatePassword,
  passphraseBits,
  passwordBits,
  type PassphraseOptions,
  type PasswordOptions,
} from "../../vault/generator";
import { errorText } from "../account/screens/wording";
import { PasswordText, StrengthBars, strengthOfBits } from "./secret";

type Kind = "password" | "passphrase";

const KINDS = [
  { value: "password" as const, label: "Mot de passe" },
  { value: "passphrase" as const, label: "Phrase de passe" },
];

interface Settings {
  kind: Kind;
  length: number;
  digits: boolean;
  symbols: boolean;
  avoidAmbiguous: boolean;
  words: number;
  capitalize: boolean;
}

const START: Settings = {
  kind: "password",
  length: DEFAULT_PASSWORD.length,
  digits: true,
  symbols: true,
  avoidAmbiguous: false,
  words: DEFAULT_PASSPHRASE.words,
  capitalize: false,
};

function passwordOptions(s: Settings): PasswordOptions {
  return {
    ...DEFAULT_PASSWORD,
    length: s.length,
    digits: s.digits,
    symbols: s.symbols,
    avoidAmbiguous: s.avoidAmbiguous,
  };
}

function passphraseOptions(s: Settings): PassphraseOptions {
  return { ...DEFAULT_PASSPHRASE, words: s.words, capitalize: s.capitalize, withDigit: true };
}

function make(s: Settings): string {
  return s.kind === "password"
    ? generatePassword(passwordOptions(s))
    : generatePassphrase(passphraseOptions(s));
}

function bitsOf(s: Settings): number {
  return s.kind === "password"
    ? passwordBits(passwordOptions(s))
    : passphraseBits(passphraseOptions(s));
}

/** A labelled switch on one line: the whole line reads as the setting. */
function Option({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3">
      <span className="flex min-w-0 flex-col">
        <span className="text-[13.5px]">{label}</span>
        {hint ? <span className="text-[12px] text-faint">{hint}</span> : null}
      </span>
      <Toggle checked={checked} label={label} onChange={onChange} />
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-4">
      <span className="w-[92px] shrink-0 text-[13.5px]">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          onChange(Number(e.target.value));
        }}
        className="h-11 min-w-0 flex-1 cursor-pointer accent-(--color-accent)"
      />
      <span className="tabular w-8 text-right font-mono text-[14px] font-semibold">{value}</span>
    </label>
  );
}

/**
 * Password or passphrase generator, uniform randomness from libsodium. The result shows its
 * digits and symbols in colour, and its strength in plain words, not in bits alone.
 */
export function Generator({
  onUse,
  useLabel = "Utiliser",
}: {
  onUse: (value: string) => void;
  useLabel?: string;
}) {
  const toast = useToast();
  const [settings, setSettings] = useState<Settings>(START);
  const [value, setValue] = useState(() => make(START));
  const [copied, setCopied] = useState(false);
  const bits = bitsOf(settings);
  const strength = strengthOfBits(bits);

  const change = (next: Partial<Settings>) => {
    const s = { ...settings, ...next };
    setSettings(s);
    setValue(make(s));
    setCopied(false);
  };

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-glass-2 p-4">
      <Segmented
        options={KINDS}
        value={settings.kind}
        label="Type"
        onChange={(kind) => {
          change({ kind });
        }}
      />
      <div className="flex flex-col gap-2.5">
        <div className="flex items-start gap-1 rounded-[12px] border border-line bg-glass px-3.5 py-3">
          <PasswordText
            value={value}
            className="min-h-[1.5em] flex-1 self-center text-[16px] font-medium leading-normal"
          />
          <IconButton
            icon={ArrowsClockwiseIcon}
            label="Un autre"
            onClick={() => {
              change({});
            }}
          />
          <IconButton
            icon={copied ? CheckIcon : CopyIcon}
            label="Copier"
            className={copied ? "!text-ok" : ""}
            onClick={() => {
              copySecret(value).then(
                () => {
                  setCopied(true);
                  toast("Copié. Effacé du presse-papiers dans 30 s.");
                },
                (e: unknown) => {
                  toast(errorText(e), "crit");
                },
              );
            }}
          />
        </div>
        <StrengthBars
          strength={strength}
          caption={`${strength.label}, ${String(Math.round(bits))} bits d'entropie`}
          className="px-0.5"
        />
      </div>
      <div className="flex flex-col gap-1 border-t border-line pt-3">
        {settings.kind === "password" ? (
          <>
            <Slider
              label="Longueur"
              value={settings.length}
              min={12}
              max={64}
              onChange={(length) => {
                change({ length });
              }}
            />
            <Option
              label="Chiffres"
              checked={settings.digits}
              onChange={(digits) => {
                change({ digits });
              }}
            />
            <Option
              label="Symboles"
              checked={settings.symbols}
              onChange={(symbols) => {
                change({ symbols });
              }}
            />
            <Option
              label="Sans caractères ambigus"
              hint="Ni I, l, 1, ni O, 0, o : plus simple à recopier."
              checked={settings.avoidAmbiguous}
              onChange={(avoidAmbiguous) => {
                change({ avoidAmbiguous });
              }}
            />
          </>
        ) : (
          <>
            <Slider
              label="Mots"
              value={settings.words}
              min={4}
              max={10}
              onChange={(words) => {
                change({ words });
              }}
            />
            <Option
              label="Majuscules"
              hint="Une majuscule au début de chaque mot."
              checked={settings.capitalize}
              onChange={(capitalize) => {
                change({ capitalize });
              }}
            />
          </>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          icon={ArrowsClockwiseIcon}
          className="flex-1"
          onClick={() => {
            change({});
          }}
        >
          Un autre
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            onUse(value);
          }}
        >
          {useLabel}
        </Button>
      </div>
    </div>
  );
}
