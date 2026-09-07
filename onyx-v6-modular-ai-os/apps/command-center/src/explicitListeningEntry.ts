export type ExplicitListeningMode = "PUSH_TO_TALK" | "ORBITAL_LISTEN";

export interface ExplicitListeningEntryDependencies {
  readonly beginExplicitSession: () => void;
  readonly startListening: (mode: ExplicitListeningMode) => void;
  readonly beforeStartListening?: () => void;
}

export function createExplicitListeningEntryHandler(
  mode: ExplicitListeningMode,
  dependencies: ExplicitListeningEntryDependencies,
): () => void {
  return () => {
    dependencies.beginExplicitSession();
    dependencies.beforeStartListening?.();
    dependencies.startListening(mode);
  };
}