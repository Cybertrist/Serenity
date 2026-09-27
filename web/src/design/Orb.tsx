/**
 * The agent, as a small sphere of violet light that breathes while it watches. Grey and still
 * once it is stopped (kill switch). Always decorative: the text next to it says the state.
 */
export function Orb({ size = 22, off = false }: { size?: number; off?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="orb"
      data-off={off ? "" : undefined}
      style={{ width: size, height: size }}
    />
  );
}
