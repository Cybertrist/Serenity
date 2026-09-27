import type { ReactNode } from "react";

/**
 * A list row: a mark, a title and a caption, something on the right. Rows of one list are
 * separated by a hairline that starts after the mark. `selected` draws the glass highlight.
 */
export function Row({
  chip,
  title,
  caption,
  trailing,
  onClick,
  first = false,
  selected = false,
}: {
  chip?: ReactNode;
  title: ReactNode;
  caption?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  first?: boolean;
  selected?: boolean;
}) {
  const content = (
    <>
      {chip}
      <span
        className={`flex min-h-[56px] min-w-0 flex-1 items-center gap-3 self-stretch py-2 ${first || selected ? "" : "border-t border-line"}`}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
          <span className="truncate text-[13.5px] font-medium leading-tight">{title}</span>
          {caption ? (
            <span className="truncate text-[12px] leading-tight text-faint">{caption}</span>
          ) : null}
        </span>
        {trailing}
      </span>
    </>
  );
  const classes = `flex w-full items-center gap-3 px-3.5 ${selected ? "rounded-[10px] bg-glass-hi shadow-[inset_0_0_0_1px_var(--color-line-strong),0_8px_24px_-14px_var(--halo)]" : ""}`;
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      className={`${classes} transition-colors duration-150 hover:bg-hover active:bg-press`}
    >
      {content}
    </button>
  ) : (
    <div className={classes}>{content}</div>
  );
}
