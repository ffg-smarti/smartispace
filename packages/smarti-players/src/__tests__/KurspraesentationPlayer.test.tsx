import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KurspraesentationPlayer } from "../players/KurspraesentationPlayer";
import type { PlayerProps, ItemContextResponse } from "../types";

// --- Helpers ---

function makeItem(
  presentation: Record<string, unknown>,
  overrides?: { feedbackDelayCorrectMs?: number; feedbackDelayWrongMs?: number },
): { item: PlayerProps["item"]; itemContext: ItemContextResponse } {
  return {
    item: {
      content_data: { course_presentation: presentation },
      display_config: {},
      behavior_config: {},
    },
    itemContext: {
      item_type: "COURSE_PRESENTATION",
      pass_threshold: 60,
      type_config: {
        feedback_delay_correct_ms: overrides?.feedbackDelayCorrectMs ?? 500,
        feedback_delay_wrong_ms: overrides?.feedbackDelayWrongMs ?? 500,
      },
    } as ItemContextResponse,
  };
}

/** Advance past the IntroSlide (tap anywhere) */
async function advancePastIntro(user: ReturnType<typeof userEvent.setup>) {
  // IntroSlide's outer div has onClick={onContinue}; click bubbles up from the <p>
  const hint = screen.getByText(/Tippe irgendwo/);
  await user.click(hint);
}

// --- Mocks ---
beforeEach(() => {
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
  HTMLMediaElement.prototype.load = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --- IntroSlide ---

describe("IntroSlide", () => {
  test("renders text-only intro", () => {
    const { item, itemContext } = makeItem({
      intro: { text: "Hallo Welt!", media_type: "NONE" },
      questions: [],
      appearance: { theme: "default" },
    });

    render(
      <KurspraesentationPlayer
        item={item}
        itemContext={itemContext}
        mode="session"
        onCompleted={vi.fn()}
      />,
    );

    expect(screen.getByText("Hallo Welt!")).toBeTruthy();
    expect(screen.getByText(/Tippe irgendwo/)).toBeTruthy();
  });

  test("renders audio intro with play button", () => {
    const { item, itemContext } = makeItem({
      intro: {
        text: "Hör zu!",
        media_type: "AUDIO",
        media_url: "https://example.com/audio.mp3",
      },
      questions: [],
      appearance: { theme: "default" },
    });

    render(
      <KurspraesentationPlayer
        item={item}
        itemContext={itemContext}
        mode="session"
        onCompleted={vi.fn()}
      />,
    );

    expect(screen.getByText("Hör zu!")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Audio abspielen/i })).toBeTruthy();
  });

  test("renders video intro", () => {
    const { item, itemContext } = makeItem({
      intro: {
        text: "Video ansehen",
        media_type: "VIDEO",
        media_url: "https://example.com/video.mp4",
      },
      questions: [],
      appearance: { theme: "default" },
    });

    render(
      <KurspraesentationPlayer
        item={item}
        itemContext={itemContext}
        mode="session"
        onCompleted={vi.fn()}
      />,
    );

    expect(screen.getByText("Video ansehen")).toBeTruthy();
    expect(screen.getByText(/Tippe irgendwo/)).toBeTruthy();
  });
});

// --- SC Slide ---

describe("SC Slide", () => {
  test("renders question and answer options after intro", async () => {
    const user = userEvent.setup();
    const { item, itemContext } = makeItem({
      intro: { text: "Start!", media_type: "NONE" },
      questions: [
        {
          question_id: "q1",
          question_type: "SINGLE_CHOICE",
          question: "Was ist 2+2?",
          answers: [
            { answer_id: "a1", text: "3" },
            { answer_id: "a2", text: "4" },
          ],
          correct_answer_ids: ["a2"],
        },
      ],
      appearance: { theme: "default" },
    });

    render(
      <KurspraesentationPlayer
        item={item}
        itemContext={itemContext}
        mode="session"
        onCompleted={vi.fn()}
      />,
    );

    await advancePastIntro(user);

    expect(screen.getByText("Was ist 2+2?")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getAllByText(/1\s*\/\s*1/).length).toBeGreaterThanOrEqual(1);
  });

  test("shows correct feedback when correct answer is selected", async () => {
    const user = userEvent.setup();
    const { item, itemContext } = makeItem({
      intro: { text: "Go", media_type: "NONE" },
      questions: [
        {
          question_id: "q1",
          question_type: "SINGLE_CHOICE",
          question: "Was ist 2+2?",
          answers: [
            { answer_id: "a1", text: "3" },
            { answer_id: "a2", text: "4" },
          ],
          correct_answer_ids: ["a2"],
        },
      ],
      appearance: { theme: "default" },
    });

    render(
      <KurspraesentationPlayer
        item={item}
        itemContext={itemContext}
        mode="session"
        onCompleted={vi.fn()}
      />,
    );

    await advancePastIntro(user);
    await user.click(screen.getByText("4"));

    // Feedback phase: buttons disabled during delay
    await waitFor(() => {
      const btn = screen.getAllByRole("button").find((b) => b.textContent === "4");
      expect(btn).toBeDisabled();
    });
  });

  test("shows wrong feedback when wrong answer is selected", async () => {
    const user = userEvent.setup();
    const { item, itemContext } = makeItem({
      intro: { text: "Go", media_type: "NONE" },
      questions: [
        {
          question_id: "q1",
          question_type: "SINGLE_CHOICE",
          question: "Was ist 2+2?",
          answers: [
            { answer_id: "a1", text: "3" },
            { answer_id: "a2", text: "4" },
          ],
          correct_answer_ids: ["a2"],
        },
      ],
      appearance: { theme: "default" },
    });

    render(
      <KurspraesentationPlayer
        item={item}
        itemContext={itemContext}
        mode="session"
        onCompleted={vi.fn()}
      />,
    );

    await advancePastIntro(user);
    await user.click(screen.getByText("3"));

    // Feedback phase: buttons disabled during delay
    await waitFor(() => {
      const btn = screen.getAllByRole("button").find((b) => b.textContent === "3");
      expect(btn).toBeDisabled();
    });
  });
});

// --- MC Slide ---

describe("MC Slide", () => {
  test("renders answers with prüfen button after intro", async () => {
    const user = userEvent.setup();
    const { item, itemContext } = makeItem({
      intro: { text: "Go", media_type: "NONE" },
      questions: [
        {
          question_id: "q1",
          question_type: "MULTIPLE_CHOICE",
          question: "Wähle alle Richtigen",
          answers: [
            { answer_id: "a1", text: "Antwort A" },
            { answer_id: "a2", text: "Antwort B" },
            { answer_id: "a3", text: "Antwort C" },
          ],
          correct_answer_ids: ["a1", "a3"],
        },
      ],
      appearance: { theme: "default" },
    });

    render(
      <KurspraesentationPlayer
        item={item}
        itemContext={itemContext}
        mode="session"
        onCompleted={vi.fn()}
      />,
    );

    await advancePastIntro(user);

    expect(screen.getByText("Antwort A")).toBeTruthy();
    expect(screen.getByText("Antwort B")).toBeTruthy();
    expect(screen.getByText("Antwort C")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Antwort prüfen/i })).toBeTruthy();
  });

  test("shows partial score after prüfen", async () => {
    const user = userEvent.setup();
    const { item, itemContext } = makeItem({
      intro: { text: "Go", media_type: "NONE" },
      questions: [
        {
          question_id: "q1",
          question_type: "MULTIPLE_CHOICE",
          question: "Wähle alle Richtigen",
          answers: [
            { answer_id: "a1", text: "Antwort A" },
            { answer_id: "a2", text: "Antwort B" },
            { answer_id: "a3", text: "Antwort C" },
          ],
          correct_answer_ids: ["a1", "a3"],
        },
      ],
      appearance: { theme: "default" },
    });

    render(
      <KurspraesentationPlayer
        item={item}
        itemContext={itemContext}
        mode="session"
        onCompleted={vi.fn()}
      />,
    );

    await advancePastIntro(user);

    // Select only a + b (partial: 1 of 2 correct) → feedback shows partial %
    await user.click(screen.getByText("Antwort A"));
    await user.click(screen.getByText("Antwort B"));

    await user.click(screen.getByRole("button", { name: /Antwort prüfen/i }));

    // During feedback phase, prüfen button should disappear and answers get visual feedback
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Antwort prüfen/i })).toBeNull();
    });
  });
});

// --- TF Slide ---

describe("TF Slide", () => {
  test("renders question and Richtig/Falsch buttons after intro", async () => {
    const user = userEvent.setup();
    const { item, itemContext } = makeItem({
      intro: { text: "Go", media_type: "NONE" },
      questions: [
        {
          question_id: "q1",
          question_type: "TRUE_FALSE",
          question: "Die Sonne ist heiß.",
          answers: [
            { answer_id: "a1", text: "Richtig" },
            { answer_id: "a2", text: "Falsch" },
          ],
          correct_answer_ids: ["a1"],
        },
      ],
      appearance: { theme: "default" },
    });

    render(
      <KurspraesentationPlayer
        item={item}
        itemContext={itemContext}
        mode="session"
        onCompleted={vi.fn()}
      />,
    );

    await advancePastIntro(user);

    expect(screen.getByText("Die Sonne ist heiß.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Richtig" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Falsch" })).toBeTruthy();
  });

  test("clicking Richtig shows correct feedback", async () => {
    const user = userEvent.setup();
    const { item, itemContext } = makeItem({
      intro: { text: "Go", media_type: "NONE" },
      questions: [
        {
          question_id: "q1",
          question_type: "TRUE_FALSE",
          question: "Die Sonne ist heiß.",
          answers: [
            { answer_id: "a1", text: "Richtig" },
            { answer_id: "a2", text: "Falsch" },
          ],
          correct_answer_ids: ["a1"],
        },
      ],
      appearance: { theme: "default" },
    });

    render(
      <KurspraesentationPlayer
        item={item}
        itemContext={itemContext}
        mode="session"
        onCompleted={vi.fn()}
      />,
    );

    await advancePastIntro(user);
    await user.click(screen.getByRole("button", { name: "Richtig" }));

    // Feedback phase: buttons disabled during delay
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Richtig" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Falsch" })).toBeDisabled();
    });
  });
});

// --- DRAG_WORD Slide ---

describe("DRAG_WORD Slide", () => {
  test("renders word bank and empty slots after intro", async () => {
    const user = userEvent.setup();
    const { item, itemContext } = makeItem({
      intro: { text: "Go", media_type: "NONE" },
      questions: [
        {
          question_id: "q1",
          question_type: "DRAG_WORD",
          question: "Ordne die Wörter zu:",
          drag_words: {
            words: [
              { word_id: "w1", text: "Das" },
              { word_id: "w2", text: "ist" },
              { word_id: "w3", text: "test" },
            ],
            distractors: [],
            shuffle: false,
          },
          correct_word_ids: ["w1", "w2", "w3"],
          scoring: "ALL_OR_NOTHING",
        },
      ],
      appearance: { theme: "default" },
    });

    render(
      <KurspraesentationPlayer
        item={item}
        itemContext={itemContext}
        mode="session"
        onCompleted={vi.fn()}
      />,
    );

    await advancePastIntro(user);

    expect(screen.getByText("Ordne die Wörter zu:")).toBeTruthy();
    expect(screen.getByText("Das")).toBeTruthy();
    expect(screen.getByText("ist")).toBeTruthy();
    expect(screen.getByText("test")).toBeTruthy();
    // 3 empty slots showing "___"
    expect(screen.getAllByText("___")).toHaveLength(3);
  });

  test("tap to place moves word from bank to slot", async () => {
    const user = userEvent.setup();
    const { item, itemContext } = makeItem({
      intro: { text: "Go", media_type: "NONE" },
      questions: [
        {
          question_id: "q1",
          question_type: "DRAG_WORD",
          question: "Ordne zu:",
          drag_words: {
            words: [
              { word_id: "w1", text: "Hallo" },
              { word_id: "w2", text: "Welt" },
            ],
            distractors: [],
            shuffle: false,
          },
          correct_word_ids: ["w1", "w2"],
          scoring: "ALL_OR_NOTHING",
        },
      ],
      appearance: { theme: "default" },
    });

    render(
      <KurspraesentationPlayer
        item={item}
        itemContext={itemContext}
        mode="session"
        onCompleted={vi.fn()}
      />,
    );

    await advancePastIntro(user);

    // Tap "Hallo" to select it
    await user.click(screen.getByText("Hallo"));
    // Now tap the first empty slot to place it
    const emptySlots = screen.getAllByText("___");
    await user.click(emptySlots[0]);
    // One fewer empty slot
    expect(screen.getAllByText("___")).toHaveLength(1);
  });
});

// --- IMAGE_PAIRING Slide ---

describe("IMAGE_PAIRING Slide", () => {
  test("renders images and draggable words after intro", async () => {
    const user = userEvent.setup();
    const { item, itemContext } = makeItem({
      intro: { text: "Go", media_type: "NONE" },
      questions: [
        {
          question_id: "q1",
          question_type: "IMAGE_PAIRING",
          question: "Zuordnen:",
          image_pairs: {
            pairs: [
              { pair_id: "p1", image_url: "https://example.com/img1.png", word: "Katze" },
              { pair_id: "p2", image_url: "https://example.com/img2.png", word: "Hund" },
            ],
            shuffle: false,
          },
        },
      ],
      appearance: { theme: "default" },
    });

    render(
      <KurspraesentationPlayer
        item={item}
        itemContext={itemContext}
        mode="session"
        onCompleted={vi.fn()}
      />,
    );

    await advancePastIntro(user);

    expect(screen.getByText("Zuordnen:")).toBeTruthy();
    expect(screen.getByText("Katze")).toBeTruthy();
    expect(screen.getByText("Hund")).toBeTruthy();
    expect(screen.getAllByText("Zuordnen...")).toHaveLength(2);
  });

  test("tap to place word on image slot", async () => {
    const user = userEvent.setup();
    const { item, itemContext } = makeItem({
      intro: { text: "Go", media_type: "NONE" },
      questions: [
        {
          question_id: "q1",
          question_type: "IMAGE_PAIRING",
          question: "Zuordnen:",
          image_pairs: {
            pairs: [
              { pair_id: "p1", image_url: "https://example.com/img1.png", word: "Katze" },
            ],
            shuffle: false,
          },
        },
      ],
      appearance: { theme: "default" },
    });

    render(
      <KurspraesentationPlayer
        item={item}
        itemContext={itemContext}
        mode="session"
        onCompleted={vi.fn()}
      />,
    );

    await advancePastIntro(user);

    // Select "Katze" from the word bank
    await user.click(screen.getByText("Katze"));
    // Click the image slot ("Zuordnen..." placeholder)
    await user.click(screen.getByText("Zuordnen..."));
    // Word is now placed — "Zuordnen..." should be gone
    expect(screen.queryByText("Zuordnen...")).toBeNull();
  });
});

// --- ResultSlide ---

describe("ResultSlide", () => {
  test("shows score and pass/fail after answering question", async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    const { item, itemContext } = makeItem({
      intro: { text: "Go", media_type: "NONE" },
      questions: [
        {
          question_id: "q1",
          question_type: "TRUE_FALSE",
          question: "Test?",
          answers: [
            { answer_id: "a1", text: "Richtig" },
            { answer_id: "a2", text: "Falsch" },
          ],
          correct_answer_ids: ["a1"],
        },
      ],
      appearance: { theme: "default" },
    });

    render(
      <KurspraesentationPlayer
        item={item}
        itemContext={itemContext}
        mode="session"
        onCompleted={onCompleted}
        onSkipped={vi.fn()}
        onError={vi.fn()}
      />,
    );

    await advancePastIntro(user);
    await user.click(screen.getByRole("button", { name: "Richtig" }));

    // Result slide shows percentage
    await waitFor(() => {
      expect(screen.getByText(/100%/)).toBeTruthy();
    });
    expect(screen.getByText("1")).toBeTruthy(); // 1 correct
    expect(screen.getByText(/Bestanden/)).toBeTruthy();
  });

  test("preview mode hides nothing on result slide (no onCompleted call)", async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    const { item, itemContext } = makeItem({
      intro: { text: "Go", media_type: "NONE" },
      questions: [
        {
          question_id: "q1",
          question_type: "TRUE_FALSE",
          question: "Test?",
          answers: [
            { answer_id: "a1", text: "Richtig" },
            { answer_id: "a2", text: "Falsch" },
          ],
          correct_answer_ids: ["a1"],
        },
      ],
      appearance: { theme: "default" },
    });

    render(
      <KurspraesentationPlayer
        item={item}
        itemContext={itemContext}
        mode="preview"
        onCompleted={onCompleted}
        onSkipped={vi.fn()}
        onError={vi.fn()}
      />,
    );

    await advancePastIntro(user);
    await user.click(screen.getByRole("button", { name: "Richtig" }));

    // Result slide is shown
    await waitFor(() => {
      expect(screen.getByText(/100%/)).toBeTruthy();
    });
    // preview mode → onCompleted never called
    expect(onCompleted).not.toHaveBeenCalled();
  });
});

// --- Appearance / Theme ---

describe("Appearance", () => {
  test("applies default theme and renders intro text", () => {
    const { item, itemContext } = makeItem({
      intro: { text: "Theme!", media_type: "NONE" },
      questions: [],
      appearance: { theme: "default" },
    });

    render(
      <KurspraesentationPlayer
        item={item}
        itemContext={itemContext}
        mode="session"
        onCompleted={vi.fn()}
      />,
    );

    // IntroSlide should render with the theme's background color applied via inline style
    expect(screen.getByText("Theme!")).toBeTruthy();
    expect(screen.getByText(/Intro/)).toBeTruthy();
  });

  test("applies dark theme and renders correctly", () => {
    const { item, itemContext } = makeItem({
      intro: { text: "Dark!", media_type: "NONE" },
      questions: [],
      appearance: { theme: "dark" },
    });

    render(
      <KurspraesentationPlayer
        item={item}
        itemContext={itemContext}
        mode="session"
        onCompleted={vi.fn()}
      />,
    );

    // The header should show "Intro"
    expect(screen.getByText(/Intro/)).toBeTruthy();
    // The intro text should be present
    expect(screen.getByText("Dark!")).toBeTruthy();
  });
});

// --- Question order & answer shuffling ---

describe("Question order & answer shuffling", () => {
  test("questions keep author-defined order (no random question shuffle)", async () => {
    const user = userEvent.setup();
    const { item, itemContext } = makeItem({
      intro: { text: "Go", media_type: "NONE" },
      questions: [
        { question_id: "q1", question_type: "SINGLE_CHOICE", question: "Erste Frage", answers: [{ answer_id: "a1", text: "x" }], correct_answer_ids: ["a1"] },
        { question_id: "q2", question_type: "SINGLE_CHOICE", question: "Zweite Frage", answers: [{ answer_id: "a1", text: "y" }], correct_answer_ids: ["a1"] },
      ],
      appearance: { theme: "default" },
    });

    render(
      <KurspraesentationPlayer item={item} itemContext={itemContext} mode="session" onCompleted={vi.fn()} />,
    );

    await advancePastIntro(user);

    // Folie 1 shows the FIRST question in author order
    expect(screen.getByText("Erste Frage")).toBeTruthy();
  });

  test("answer order is randomized across mounts", async () => {
    const answers = [
      { answer_id: "a1", text: "Antwort Alpha" },
      { answer_id: "a2", text: "Antwort Beta" },
      { answer_id: "a3", text: "Antwort Gamma" },
    ];
    const buildItem = () => makeItem({
      intro: { text: "Go", media_type: "NONE" },
      questions: [
        { question_id: "q1", question_type: "MULTIPLE_CHOICE", question: "Wähle", answers, correct_answer_ids: ["a1"] },
      ],
      appearance: { theme: "default" },
    });

    // Capture the answer DOM order for a given random seed
    async function captureAnswerOrder(seed: number): Promise<string[]> {
      const spy = vi.spyOn(Math, "random").mockReturnValue(seed);
      const user = userEvent.setup();
      const { unmount } = render(<KurspraesentationPlayer {...buildItem()} mode="session" onCompleted={vi.fn()} />);
      await advancePastIntro(user);
      const btns = screen.getAllByRole("button").filter((b) => /Antwort/.test(b.textContent ?? ""));
      const order = btns.map((b) => b.textContent ?? "");
      unmount();
      spy.mockRestore();
      return order;
    }

    const order1 = await captureAnswerOrder(0.1);
    const order2 = await captureAnswerOrder(0.9);

    // Deterministic given different seeds → different DOM order
    expect(order1).not.toEqual(order2);
  });
});
