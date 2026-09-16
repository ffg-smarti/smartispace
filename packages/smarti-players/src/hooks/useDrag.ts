/**
 * useDrag — Shared drag/place utility for DRAG_WORD and IMAGE_PAIRING players.
 *
 * Provides state-based item placement (tap-to-select, tap-to-place)
 * with full touch/mouse/keyboard accessibility.
 *
 * REQ-CONTENT-PRES-027: DRAG_WORD slots + word bank
 * REQ-CONTENT-PRES-031: IMAGE_PAIRING two-column drag
 * REQ-CONTENT-PRES-035: Placed items can be returned to bank
 */
import { useState, useCallback, useMemo } from 'react';

export interface DragItem {
  id: string;
  text: string;
}

export interface DragSlot {
  id: string;
  label?: string;
}

export interface UseDragReturn {
  /** Map: slotId → placed itemId (or null) */
  placements: Record<string, string | null>;
  /** Currently selected item id (for tap-to-place) */
  selectedItemId: string | null;
  /** Select an item from the bank (or a placed item to move it) */
  selectItem: (itemId: string) => void;
  /** Place the selected item into a slot */
  placeItem: (slotId: string) => void;
  /** Remove item from slot, return to bank */
  removeFromSlot: (slotId: string) => void;
  /** Get the item currently in a slot */
  getItemInSlot: (slotId: string) => DragItem | null;
  /** Check if an item is placed in any slot */
  isItemPlaced: (itemId: string) => boolean;
  /** Get all unplaced items (still in bank) */
  getUnplacedItems: () => DragItem[];
  /** Get all items in correct positions (for feedback) */
  getCorrectPlacements: (correctOrder: string[]) => Record<string, boolean>;
  /** Check if all slots are filled */
  isComplete: boolean;
  /** Reset all placements */
  reset: () => void;
}

/**
 * State-based drag/place hook.
 *
 * Usage:
 * 1. User taps a word in the bank → selectItem(wordId)
 * 2. User taps a slot → placeItem(slotId) places the selected word
 * 3. User taps a placed word → selectItem(wordId) picks it up (removes from slot)
 * 4. All slots filled → isComplete becomes true
 */
export function useDrag(
  items: DragItem[],
  slots: DragSlot[],
): UseDragReturn {
  const [placements, setPlacements] = useState<Record<string, string | null>>(() => {
    const initial: Record<string, string | null> = {};
    for (const slot of slots) {
      initial[slot.id] = null;
    }
    return initial;
  });
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const itemsById = useMemo(() => {
    const map = new Map<string, DragItem>();
    for (const item of items) {
      map.set(item.id, item);
    }
    return map;
  }, [items]);

  const selectItem = useCallback((itemId: string) => {
    // If item is in a slot, remove it first (pick up)
    setPlacements((prev) => {
      const next = { ...prev };
      for (const [slotId, placedId] of Object.entries(next)) {
        if (placedId === itemId) {
          next[slotId] = null;
          break;
        }
      }
      return next;
    });
    setSelectedItemId(itemId);
  }, []);

  const placeItem = useCallback((slotId: string) => {
    if (!selectedItemId) return;

    setPlacements((prev) => {
      const next = { ...prev };
      // If this item is already in another slot, remove it
      for (const [sid, placedId] of Object.entries(next)) {
        if (placedId === selectedItemId) {
          next[sid] = null;
        }
      }
      // If slot already has an item, swap it back to bank
      // (the previous item becomes unplaced)
      next[slotId] = selectedItemId;
      return next;
    });
    setSelectedItemId(null);
  }, [selectedItemId]);

  const removeFromSlot = useCallback((slotId: string) => {
    setPlacements((prev) => ({ ...prev, [slotId]: null }));
  }, []);

  const getItemInSlot = useCallback((slotId: string): DragItem | null => {
    const itemId = placements[slotId];
    if (!itemId) return null;
    return itemsById.get(itemId) ?? null;
  }, [placements, itemsById]);

  const isItemPlaced = useCallback((itemId: string): boolean => {
    return Object.values(placements).includes(itemId);
  }, [placements]);

  const getUnplacedItems = useCallback((): DragItem[] => {
    const placedIds = new Set(Object.values(placements).filter(Boolean));
    return items.filter((item) => !placedIds.has(item.id));
  }, [items, placements]);

  const getCorrectPlacements = useCallback((correctOrder: string[]): Record<string, boolean> => {
    const result: Record<string, boolean> = {};
    const slotIds = Object.keys(placements);
    for (let i = 0; i < slotIds.length; i++) {
      const slotId = slotIds[i];
      const placedId = placements[slotId];
      result[slotId] = placedId === correctOrder[i];
    }
    return result;
  }, [placements]);

  const isComplete = useMemo(() => {
    return Object.values(placements).every((v) => v !== null);
  }, [placements]);

  const reset = useCallback(() => {
    const initial: Record<string, string | null> = {};
    for (const slot of slots) {
      initial[slot.id] = null;
    }
    setPlacements(initial);
    setSelectedItemId(null);
  }, [slots]);

  return {
    placements,
    selectedItemId,
    selectItem,
    placeItem,
    removeFromSlot,
    getItemInSlot,
    isItemPlaced,
    getUnplacedItems,
    getCorrectPlacements,
    isComplete,
    reset,
  };
}
