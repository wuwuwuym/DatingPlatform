import type { MessageItem } from "@/lib/types";

/**
 * Appends new messages in order, dropping ids that are already present.
 *
 * Kept as a pure function so it can be used inside a React state updater:
 * StrictMode invokes updaters twice in development, and any dedupe state
 * mutated inside the updater will make the second pass drop the message.
 */
export function mergeMessages(
  current: MessageItem[],
  incoming: MessageItem[],
): MessageItem[] {
  if (incoming.length === 0) return current;

  const known = new Set(current.map((message) => message.id));
  const merged = [...current];
  for (const message of incoming) {
    if (known.has(message.id)) continue;
    known.add(message.id);
    merged.push(message);
  }
  return merged;
}
