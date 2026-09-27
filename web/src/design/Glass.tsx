import type { HTMLAttributes, ReactNode } from "react";

type Tag = "div" | "section" | "aside" | "article" | "header" | "nav" | "form";

/**
 * A surface of frosted glass: translucent, blurred, a hairline edge and a soft shadow. The
 * base of every card, list and pane. `halo` adds the mood edge (the light of the app,
 * `data-mood`), for the one surface of a screen that carries the state.
 */
export function Glass({
  as: Tag = "div",
  halo = false,
  radius = "card",
  className = "",
  children,
  ...rest
}: HTMLAttributes<HTMLElement> & {
  as?: Tag;
  halo?: boolean;
  radius?: "card" | "sheet" | "control";
  children?: ReactNode;
}) {
  const r =
    radius === "sheet"
      ? "rounded-sheet"
      : radius === "control"
        ? "rounded-control"
        : "rounded-card";
  return (
    <Tag {...rest} className={`glass ${r} ${halo ? "halo" : ""} ${className}`}>
      {children}
    </Tag>
  );
}
