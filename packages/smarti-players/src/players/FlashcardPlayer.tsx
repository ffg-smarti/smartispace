/**
 * FlashcardPlayer — vollständiger Standalone-Karteikarten-Player aus der
 * Frontend-Design-Phase (smarti_lv). Arbeitet mit einem lokalen Deck und
 * ohne Backend-Anbindung.
 *
 * Abgrenzung zu CardPlayer.tsx:
 *  - CardPlayer  → Backend-gebunden, folgt PlayerProps/PlayerHandle-Pattern,
 *                  erhält itemData + itemContext vom Session-Shell und meldet
 *                  Completion an den Session-Lifecycle.
 *  - FlashcardPlayer → Standalone-Demo, eigenes lokales Deck (INITIAL_DECK),
 *                  keine onCompleted-Callback-Pflicht, volle UI mit Flip-
 *                  Animation, Farbwahl, Eselsbrücke, Stats.
 *
 * TODO: Langfristig soll der CardPlayer.tsx dieselbe UI übernehmen und das
 *       itemData/itemContext-DTO als Datenquelle nutzen statt INITIAL_DECK.
 */
import { useState } from "react";
import { ImageIcon, Settings2, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button, Popover, PopoverContent, PopoverTrigger, Textarea, Label, RadioGroup, RadioGroupItem, cn } from "@smarti/ui";

// Unused imports removed: ImageIcon, Settings2, ThumbsDown, ThumbsUp

type CardColor = "green" | "blue" | "red" | "yellow";
type Technique = "eselsbruecke" | "body-map" | "story" | "other";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint: string;
  example: string;
  color: CardColor;
  technique: Technique;
}

const INITIAL_DECK: Flashcard[] = [
  {
    id: "1",
    front: "to remember",
    back: "sich erinnern",
    hint: "Re-member: ein Mitglied (member) wieder (re) aufnehmen.",
    example: "I remember her face.\nDo you remember the song?",
    color: "green",
    technique: "eselsbruecke",
  },
  {
    id: "2",
    front: "improve",
    back: "verbessern",
    hint: "Im-prove: be-weisen, dass etwas besser wird.",
    example: "She wants to improve her English.\nThe weather will improve tomorrow.",
    color: "blue",
    technique: "story",
  },
  {
    id: "3",
    front: "challenge",
    back: "Herausforderung",
    hint: "Klingt wie 'Schall' – eine laute Aufgabe.",
    example: "Learning a language is a challenge.\nI accept the challenge.",
    color: "yellow",
    technique: "body-map",
  },
  {
    id: "4",
    front: "to borrow",
    back: "ausleihen (sich)",
    hint: "Borrow = von jemandem holen. Lend = jemandem geben.",
    example: "Can I borrow your pen?\nShe borrowed a book from the library.",
    color: "red",
    technique: "other",
  },
];

const COLOR_CLASSES: Record<CardColor, string> = {
  green: "bg-[hsl(140_45%_88%)]",
  blue: "bg-[hsl(210_55%_90%)]",
  red: "bg-[hsl(5_60%_90%)]",
  yellow: "bg-[hsl(48_75%_88%)]",
};

const COLOR_DOT: Record<CardColor, string> = {
  green: "bg-[hsl(140_45%_70%)]",
  blue: "bg-[hsl(210_55%_72%)]",
  red: "bg-[hsl(5_60%_75%)]",
  yellow: "bg-[hsl(48_75%_70%)]",
};

const TECHNIQUES: { value: Technique; label: string }[] = [
  { value: "eselsbruecke", label: "Eselsbrücke" },
  { value: "body-map", label: "Body-Map" },
  { value: "story", label: "Story" },
  { value: "other", label: "Other" },
];

export function FlashcardPlayer() {
  const [deck, setDeck] = useState<Flashcard[]>(INITIAL_DECK);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState({ up: 0, down: 0 });
  const done = stats.up + stats.down;

  const card = deck[index];

  const updateCard = (patch: Partial<Flashcard>) => {
    setDeck((d) => d.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const next = () => {
    setFlipped(false);
    setIndex((i) => (i + 1) % deck.length);
  };

  const rate = (good: boolean) => {
    setStats((s) => (good ? { ...s, up: s.up + 1 } : { ...s, down: s.down + 1 }));
    next();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Frame around the card */}
      <div className="w-full max-w-xl rounded-3xl border-2 border-foreground/15 bg-card/60 p-4 shadow-sm">
        <div className="[perspective:1200px] w-full">
          <div
            className={cn(
              "relative h-[460px] w-full transition-transform duration-500 [transform-style:preserve-3d]",
              flipped && "[transform:rotateY(180deg)]",
            )}
          >
            {/* FRONT */}
            <CardFace color={card.color}>
              <CardTopBar card={card} onChange={updateCard} />
              <div
                role="button"
                tabIndex={0}
                onClick={() => setFlipped(true)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setFlipped(true)}
                className="flex flex-1 cursor-pointer flex-col px-6 pb-6 pt-2 text-left"
                aria-label="Karte umdrehen"
              >
                <div className="flex items-center gap-4">
                  <ImageSlot />
                  <div className="flex-1">
                    <p className="text-3xl font-semibold text-foreground">{card.front}</p>
                  </div>
                </div>

                <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Eselsbrücke
                  </p>
                  <Textarea
                    value={card.hint}
                    onChange={(e) => updateCard({ hint: e.target.value })}
                    rows={3}
                    placeholder="Eselsbrücke hinzufügen…"
                    className="mt-1 resize-none border-foreground/10 bg-white/40 text-xs italic text-foreground/80 focus-visible:ring-1"
                  />
                </div>
              </div>
            </CardFace>

            {/* BACK */}
            <CardFace color={card.color} back>
              <CardTopBar card={card} onChange={updateCard} />
              <div
                role="button"
                tabIndex={0}
                onClick={() => setFlipped(false)}
                className="flex flex-1 cursor-pointer flex-col px-6 pb-2 pt-2"
              >
                <div className="flex items-center gap-4">
                  <ImageSlot />
                  <div className="flex-1">
                    <p className="text-3xl font-semibold text-foreground">{card.back}</p>
                  </div>
                </div>
                <div className="mt-4 flex-1 overflow-auto" onClick={(e) => e.stopPropagation()}>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Beispiele
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-foreground/80">{card.example}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-black/5 px-6 py-3">
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    rate(false);
                  }}
                  className="flex-1 bg-[hsl(5_55%_88%)] text-[hsl(5_55%_35%)] hover:bg-[hsl(5_55%_82%)]"
                >
                  <ThumbsDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    rate(true);
                  }}
                  className="flex-1 bg-[hsl(140_40%_85%)] text-[hsl(140_40%_30%)] hover:bg-[hsl(140_40%_78%)]"
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
              </div>
            </CardFace>
          </div>
        </div>
      </div>

      {/* Stats below the card */}
      <div className="grid w-full max-w-xl grid-cols-3 gap-3">
        <StatBox label="Karten gesamt" value={deck.length} />
        <StatBox label="Bearbeitet" value={done} />
        <StatBox label="Richtig" value={stats.up} accent="text-[hsl(140_40%_35%)]" />
      </div>

      <p className="text-xs text-muted-foreground">Tipp: Karte antippen zum Umdrehen.</p>
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
      <p className={cn("text-2xl font-semibold text-foreground", accent)}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function CardFace({
  children,
  color,
  back,
}: {
  children: React.ReactNode;
  color: CardColor;
  back?: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-black/5 shadow-md [backface-visibility:hidden]",
        COLOR_CLASSES[color],
        back && "[transform:rotateY(180deg)]",
      )}
    >
      {children}
    </div>
  );
}

function CardTopBar({
  card,
  onChange,
}: {
  card: Flashcard;
  onChange: (patch: Partial<Flashcard>) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 pt-3">
      <div className="flex items-center gap-1.5">
        {(Object.keys(COLOR_DOT) as CardColor[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange({ color: c });
            }}
            className={cn(
              "h-4 w-4 rounded-full ring-offset-2 transition",
              COLOR_DOT[c],
              card.color === c && "ring-2 ring-foreground/40",
            )}
            aria-label={`Farbe ${c}`}
          />
        ))}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            <Settings2 className="h-4 w-4 text-foreground/70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-72 space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-1.5">
            <Label className="text-xs">Eselsbrücke</Label>
            <Textarea
              value={card.hint}
              onChange={(e) => onChange({ hint: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Lerntechnik</Label>
            <RadioGroup
              value={card.technique}
              onValueChange={(v) => onChange({ technique: v as Technique })}
              className="grid grid-cols-2 gap-1.5"
            >
              {TECHNIQUES.map((t) => (
                <label
                  key={t.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-input px-2 py-1.5 text-sm"
                >
                  <RadioGroupItem value={t.value} />
                  {t.label}
                </label>
              ))}
            </RadioGroup>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ImageSlot() {
  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-foreground/20 bg-white/40 text-foreground/30">
      <ImageIcon className="h-6 w-6" />
    </div>
  );
}
