/**
 * Real-time notifications while the app is open (ADR-005): Server-Sent Events on /api/events.
 * EventSource reconnects by itself and resends Last-Event-ID, so nothing is missed.
 */

export interface NotificationEvent {
  id: number;
  kind: string;
  item_id: string | null;
  breach_id: number | null;
}

export function subscribe(
  onNotification: (event: NotificationEvent) => void,
  url = "/api/events",
): () => void {
  const source = new EventSource(url, { withCredentials: true });
  source.addEventListener("notification", (message) => {
    onNotification(JSON.parse((message as MessageEvent<string>).data) as NotificationEvent);
  });
  return () => {
    source.close();
  };
}
