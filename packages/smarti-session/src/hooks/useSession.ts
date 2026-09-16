import {
  useSessionCommit as useSessionCommitRaw,
  useCompleteItem as useCompleteItemRaw,
  useSkipItem as useSkipItemRaw,
  useCompleteSession as useCompleteSessionRaw,
  useAbortSession as useAbortSessionRaw,
} from '@smarti/api';
import type {
  SessionStartedDTO,
  CompleteAtomicItemRequestSchema,
  CompleteCompositeItemRequestSchema,
  ItemCompletedDTO,
  ItemSkipDTO,
  SessionResultDTO,
  SessionAbortedDTO,
  SkipItemRequestSchema,
  AbortSessionRequestSchema,
} from '@smarti/api';

export const useCommitSession = useSessionCommitRaw;
export const useCompleteItem = useCompleteItemRaw;
export const useSkipItem = useSkipItemRaw;
export const useCompleteSession = useCompleteSessionRaw;
export const useAbortSession = useAbortSessionRaw;

export type {
  SessionStartedDTO,
  CompleteAtomicItemRequestSchema,
  CompleteCompositeItemRequestSchema,
  ItemCompletedDTO,
  ItemSkipDTO,
  SessionResultDTO,
  SessionAbortedDTO,
  SkipItemRequestSchema,
  AbortSessionRequestSchema,
};
