import { describe, test, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { ScanPlayer } from "../players/ScanPlayer";
import type { PlayerProps, ItemContextResponse } from "../types";

const mockItem: PlayerProps["item"] = {
  content_data: {
    scan: {
      file_url: "https://example.com/test.pdf",
      checklist_items: [
        { id: "c1", text: "Aufgabe 1 lesen" },
        { id: "c2", text: "Aufgabe 1 lösen" },
      ],
    },
  },
  display_config: {},
  behavior_config: {},
};

const mockEmptyItem: PlayerProps["item"] = {
  content_data: { scan: {} },
  display_config: {},
  behavior_config: {},
};

const mockItemContext: ItemContextResponse = {
  mnemonic_text: null,
  pass_threshold: 100,
};

describe("ScanPlayer - Smoke", () => {
  beforeAll(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterAll(() => {
    vi.restoreAllMocks();
  });

  test("renders without crashing and shows preloaded checklist counts", () => {
    render(
      <ScanPlayer
        item={mockItem}
        itemContext={mockItemContext}
        mode="session"
        onCompleted={vi.fn()}
      />,
    );
    expect(screen.getByText(/0\s*\/\s*2/)).toBeTruthy();
    expect(screen.getByText(/Checkliste/i)).toBeTruthy();
  });

  test("adds a new checklist item via input", async () => {
    const user = userEvent.setup();
    render(
      <ScanPlayer
        item={mockEmptyItem}
        itemContext={mockItemContext}
        mode="session"
        onCompleted={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText(/Neuen Punkt hinzufügen/i);
    await user.type(input, "Notizen prüfen{Enter}");

    expect(screen.getByText(/0\s*\/\s*1/)).toBeTruthy();
  });

  test("calls onCompleted in session mode when finished", async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    render(
      <ScanPlayer
        item={mockItem}
        itemContext={mockItemContext}
        mode="session"
        onCompleted={onCompleted}
        onSkipped={vi.fn()}
        onError={vi.fn()}
      />,
    );

    const finishBtn = screen.getByRole("button", { name: /Abschließen/i });
    await user.click(finishBtn);

    expect(onCompleted).toHaveBeenCalledTimes(1);
    const payload = onCompleted.mock.calls[0][0];
    expect(payload.completion).toBe(true);
    expect(payload.progress).toBe(100);
  });

  test("does not call onCompleted in preview mode", async () => {
    const onCompleted = vi.fn();
    render(
      <ScanPlayer
        item={mockItem}
        itemContext={mockItemContext}
        mode="preview"
        onCompleted={onCompleted}
        onSkipped={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /Abschließen/i })).toBeNull();
    expect(onCompleted).not.toHaveBeenCalled();
  });
});
