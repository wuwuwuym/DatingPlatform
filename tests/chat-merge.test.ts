import { describe, expect, it } from "vitest";
import { mergeMessages } from "@/lib/chat/merge";
import type { MessageItem } from "@/lib/types";

const message = (id: string, content = id): MessageItem => ({
  id,
  content,
  createdAt: "2026-10-25T08:00:00.000Z",
  mine: false,
});

describe("mergeMessages", () => {
  it("appends new messages in arrival order", () => {
    const first = message("a");
    const second = message("b");
    expect(mergeMessages([first], [second])).toEqual([first, second]);
  });

  it("deduplicates by id and is idempotent", () => {
    const base = [message("a")];
    const incoming = [message("b")];

    const once = mergeMessages(base, incoming);
    // StrictMode may invoke a state updater twice; the result must not change.
    const twice = mergeMessages(once, incoming);

    expect(once.map((item) => item.id)).toEqual(["a", "b"]);
    expect(twice).toEqual(once);
    expect(base.map((item) => item.id)).toEqual(["a"]);
  });

  it("keeps the current array when there is nothing to add", () => {
    const base = [message("a")];
    expect(mergeMessages(base, [])).toBe(base);
    expect(mergeMessages(base, [message("a")])).toEqual(base);
  });
});
