import type { ReactNode } from "react";
import { Glass } from "../../../design";

/**
 * One group of settings: a pane of glass, its name, one line that says what it is about,
 * then its rows. `halo` marks the one group of a section that carries weight (the kit).
 */
export function Group({
  title,
  text,
  halo = false,
  children,
}: {
  title: string;
  text?: ReactNode;
  halo?: boolean;
  children?: ReactNode;
}) {
  return (
    <Glass
      as="section"
      halo={halo}
      className="flex flex-col px-4 py-4 @[620px]:px-5 @[620px]:py-[18px]"
    >
      <h2 className="m-0 text-heading">{title}</h2>
      {text ? <p className="m-0 mt-1 text-[13px] text-muted">{text}</p> : null}
      {children ? <div className="mt-3.5 flex flex-col gap-3">{children}</div> : null}
    </Glass>
  );
}

/** Rows of a group, a hairline between two of them. */
export function Rows({ children }: { children: ReactNode }) {
  return <div className="-my-1 flex flex-col divide-y divide-line">{children}</div>;
}

/**
 * One setting: what it is and what it does on the left, its control on the right. `stack`
 * puts a wide control under the text on a phone rather than squeezing it.
 */
export function SettingRow({
  title,
  caption,
  control,
  lead,
  stack = false,
}: {
  title: ReactNode;
  caption?: ReactNode;
  control?: ReactNode;
  /** A mark before the text: the icon of a device, of an address. */
  lead?: ReactNode;
  /** The control takes a line of its own on a phone (a wide segmented choice). */
  stack?: boolean;
}) {
  return (
    <div
      className={`flex py-3 ${stack ? "flex-col items-stretch gap-2.5 @[760px]:flex-row @[760px]:items-center @[760px]:gap-4" : "items-center gap-3.5"}`}
    >
      {lead}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13.5px] font-medium leading-tight">{title}</span>
        {caption ? <span className="text-[12.5px] leading-snug text-faint">{caption}</span> : null}
      </div>
      {control ? <div className="flex shrink-0 items-center gap-2">{control}</div> : null}
    </div>
  );
}
