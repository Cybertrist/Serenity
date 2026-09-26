import { EyeIcon, EyeSlashIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { IconButton } from "./Button";

/**
 * The box every text input sits in. Its edge reaches 3:1 against the app, and focus draws a
 * 2 px accent ring around the whole box, buttons included: the caret alone is not enough.
 */
export const INPUT_BOX =
  "flex items-center gap-2 rounded-control bg-surface shadow-[inset_0_0_0_1px_var(--color-line-strong)] transition-shadow duration-150 focus-within:shadow-[inset_0_0_0_2px_var(--color-accent)]";

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
      <label htmlFor={id} className="px-0.5 text-caption font-medium text-muted">
        {label}
      </label>
      <div
        className={`${INPUT_BOX} min-h-12 pl-3.5 pr-1 ${error ? "shadow-[inset_0_0_0_1.5px_var(--color-crit)]" : ""}`}
      >
        <input
          id={id}
          {...input}
          type={type}
          autoComplete={input.autoComplete ?? (secret ? "off" : undefined)}
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          className={`min-w-0 flex-1 bg-transparent py-3 text-body outline-none placeholder:text-muted/70 ${mono || secret ? "font-mono text-[14px]" : ""} ${secret && !shown ? "tracking-[0.12em]" : ""}`}
        />
        {secret ? (
          <IconButton
            icon={shown ? EyeSlashIcon : EyeIcon}
            label={shown ? "Masquer" : "Afficher"}
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
          className={`m-0 px-0.5 text-caption ${error ? "font-medium text-crit" : "text-muted"}`}
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
      <label htmlFor={id} className="px-0.5 text-caption font-medium text-muted">
        {label}
      </label>
      <div className={`${INPUT_BOX} items-stretch`}>
        <textarea
          id={id}
          {...input}
          aria-describedby={hint ? `${id}-help` : undefined}
          className={`min-h-24 w-full resize-y bg-transparent px-3.5 py-3 text-body outline-none placeholder:text-muted/70 ${className}`}
        />
      </div>
      {hint ? (
        <p id={`${id}-help`} className="m-0 px-0.5 text-caption text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** The search box of a list: one component, so the vault and the codes look alike. */
export function SearchField({
  value,
  onChange,
  label,
  placeholder = "Rechercher",
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
}) {
  return (
    <div className={`${INPUT_BOX} h-11 pl-3.5 pr-1`}>
      <MagnifyingGlassIcon size={18} aria-hidden="true" className="shrink-0 text-muted" />
      <input
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
          }
        }}
        className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted/70"
      />
      {value ? (
        <IconButton
          icon={XIcon}
          label="Effacer la recherche"
          className="!h-9 !w-9"
          onClick={() => {
            onChange("");
          }}
        />
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
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-control py-2 text-caption">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
        className="mt-px h-5 w-5 shrink-0 cursor-pointer accent-(--color-accent)"
      />
      <span>{children}</span>
    </label>
  );
}
