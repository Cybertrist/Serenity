import { EyeIcon, EyeSlashIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from "react";
import { IconButton } from "./Button";
import { Kbd } from "./Kbd";

/**
 * The box every text input sits in: glass, a hairline edge, and on focus the edge turns blue
 * with a soft ring around the whole box, buttons included: the caret alone is not enough.
 */
export const INPUT_BOX =
  "flex items-center gap-2 rounded-control border border-line-strong bg-glass-2 transition-[border-color,box-shadow] duration-150 focus-within:border-[color-mix(in_oklab,var(--color-accent)_70%,transparent)] focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_18%,transparent)]";

export function Field({
  label,
  hint,
  error,
  secret = false,
  trailing,
  mono = false,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string | null;
  secret?: boolean;
  trailing?: ReactNode;
  mono?: boolean;
}) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const type = secret ? (shown ? "text" : "password") : (input.type ?? "text");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="px-0.5 text-[12.5px] font-medium text-muted">
        {label}
      </label>
      <div
        className={`${INPUT_BOX} min-h-11 pl-3 pr-1 ${error ? "!border-crit shadow-[0_0_0_4px_var(--color-crit-soft)]" : ""}`}
      >
        <input
          id={id}
          {...input}
          type={type}
          autoComplete={input.autoComplete ?? (secret ? "off" : undefined)}
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          className={`min-w-0 flex-1 bg-transparent py-2.5 text-[14px] outline-none placeholder:text-faint ${mono || secret ? "font-mono text-[14.5px]" : ""} ${secret && !shown ? "tracking-[0.12em]" : ""}`}
        />
        {secret ? (
          <IconButton
            icon={shown ? EyeSlashIcon : EyeIcon}
            label={shown ? "Masquer" : "Afficher"}
            size="sm"
            onClick={() => {
              setShown(!shown);
            }}
          />
        ) : null}
        {trailing}
      </div>
      {error || hint ? (
        <p
          id={`${id}-help`}
          className={`m-0 px-0.5 text-caption ${error ? "font-medium text-crit" : "text-faint"}`}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}

/** Multi-line input, same box as a field. */
export function TextArea({
  label,
  hint,
  className = "",
  ...input
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="px-0.5 text-[12.5px] font-medium text-muted">
        {label}
      </label>
      <div className={`${INPUT_BOX} items-stretch`}>
        <textarea
          id={id}
          {...input}
          aria-describedby={hint ? `${id}-help` : undefined}
          className={`min-h-24 w-full resize-y bg-transparent px-3 py-2.5 text-[14px] outline-none placeholder:text-faint ${className}`}
        />
      </div>
      {hint ? (
        <p id={`${id}-help`} className="m-0 px-0.5 text-caption text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The search box of a list: one component, so the vault and the codes look alike. `shortcut`
 * shows the key that focuses it ("/"); the screen registers that key (useShortcut).
 */
export function SearchField({
  value,
  onChange,
  label,
  placeholder = "Rechercher",
  shortcut,
  inputRef,
  onKeyDown,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  shortcut?: string;
  inputRef?: Ref<HTMLInputElement>;
  /** Arrow keys and Enter, for a list driven from its search box. */
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className={`${INPUT_BOX} h-[38px] pl-3 pr-1.5 [@media(pointer:coarse)]:h-11`}>
      <MagnifyingGlassIcon size={16} aria-hidden="true" className="shrink-0 text-faint" />
      <input
        ref={inputRef}
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.stopPropagation();
            onChange("");
            return;
          }
          onKeyDown?.(e);
        }}
        className="h-full min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint"
      />
      {value ? (
        <IconButton
          icon={XIcon}
          label="Effacer la recherche"
          size="sm"
          onClick={() => {
            onChange("");
          }}
        />
      ) : shortcut ? (
        <Kbd keys={shortcut} className="hidden [@media(pointer:fine)]:inline-flex" />
      ) : null}
    </div>
  );
}

/** A box to tick, with its sentence: the whole line is the hit area. */
export function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex min-h-10 cursor-pointer items-start gap-3 rounded-control py-2 text-caption">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
        className="mt-px h-[18px] w-[18px] shrink-0 cursor-pointer accent-(--color-accent)"
      />
      <span>{children}</span>
    </label>
  );
}
