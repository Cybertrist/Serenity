import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { IconButton } from "./Button";

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
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-caption text-muted">
        {label}
      </label>
      <div
        className={`flex min-h-[52px] items-center gap-2 rounded-control border bg-surface pl-4 pr-1.5 ${error ? "border-crit" : "border-line"}`}
      >
        <input
          id={id}
          {...input}
          type={type}
          autoComplete={input.autoComplete ?? (secret ? "off" : undefined)}
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          className={`min-w-0 flex-1 bg-transparent py-3 text-body outline-none placeholder:text-muted ${mono || secret ? "font-mono" : ""} ${secret ? "tracking-[0.06em]" : ""}`}
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
        <p id={`${id}-help`} className={`m-0 text-caption ${error ? "text-crit" : "text-muted"}`}>
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}
