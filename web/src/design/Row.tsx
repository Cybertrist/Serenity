import type { ReactNode } from "react";

/**
 * A list row: chip, a title and a caption, something on the right. 60 px high, 44+ touch.
 * Rows of one list are separated by a hairline that starts after the chip, as on a phone.
 */
export function Row({
  chip,
  title,
  caption,
  trailing,
  onClick,
  first = false,
}: {
  chip?: ReactNode;
  title: ReactNode;
  caption?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  first?: boolean;
}) {
  const content = (
    <>
      {chip}
      <span
        className={`flex min-h-[60px] min-w-0 flex-1 items-center gap-3 self-stretch py-2.5 ${first ? "" : "border-t border-line"}`}
      >
        <span className="flex min-w-0 flex-1 flex-col text-left">
          <span className="truncate text-body font-medium">{title}</span>
          {caption ? <span className="truncate text-caption text-muted">{caption}</span> : null}
        </span>
        {trailing}
      </span>
    </>
  );
  const classes = "flex w-full items-center gap-3.5 px-4";
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`${classes} transition-colors duration-150 hover:bg-hover active:bg-neutral-soft`}
    >
      {content}
    </button>
  ) : (
    <div className={classes}>{content}</div>
  );
}
