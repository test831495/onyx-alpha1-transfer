export interface SimulationClock {
  currentIso(): string;
  currentDate(): Date;
  advanceByMs(ms: number): string;
  advanceBySeconds(seconds: number): string;
}

export function createSimulationClock(startIso: string): SimulationClock {
  if (!startIso) {
    throw new Error("Simulation clock requires a fixed ISO timestamp.");
  }
  const startDate = new Date(startIso);
  if (Number.isNaN(startDate.getTime())) {
    throw new Error(`Invalid fixed ISO timestamp: ${startIso}`);
  }

  let current = new Date(startDate.getTime());
  return {
    currentIso() {
      return current.toISOString();
    },
    currentDate() {
      return new Date(current.getTime());
    },
    advanceByMs(ms: number) {
      current = new Date(current.getTime() + ms);
      return current.toISOString();
    },
    advanceBySeconds(seconds: number) {
      current = new Date(current.getTime() + seconds * 1000);
      return current.toISOString();
    },
  };
}

export interface SimulationIdentifierSource {
  nextId(): string;
  nextSequence(): number;
}

export function createSimulationIdentifierSource(scenarioId: string, entityType: string): SimulationIdentifierSource {
  if (!scenarioId || !entityType) {
    throw new Error("Simulation identifier source requires both scenario ID and entity type.");
  }
  let sequence = 0;
  return {
    nextId() {
      sequence += 1;
      return `${scenarioId}-${entityType}-${String(sequence).padStart(4, "0")}`;
    },
    nextSequence() {
      sequence += 1;
      return sequence;
    },
  };
}
