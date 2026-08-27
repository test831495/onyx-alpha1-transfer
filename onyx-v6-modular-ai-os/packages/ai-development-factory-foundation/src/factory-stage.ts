import { cloneFreeze } from "./factory-constitution";
export const FACTORY_STAGES = ["F0", "F1", "F2", "F3", "F4"] as const;
export type FactoryStage = (typeof FACTORY_STAGES)[number];
export const isFactoryStage = (value: unknown): value is FactoryStage => typeof value === "string" && (FACTORY_STAGES as readonly string[]).includes(value);
export const freezeFactoryStage = (stage: FactoryStage): FactoryStage => cloneFreeze(stage);
