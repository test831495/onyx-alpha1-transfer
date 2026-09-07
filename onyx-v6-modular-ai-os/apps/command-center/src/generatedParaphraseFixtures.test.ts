import { describe, expect, it } from "vitest";
import { parseConversationalRequest } from "./conversationIntentGrammar";

const fillers = ["", "please ", "can you ", "could you "];
const dateForms = [
  "what is tomorrow's date",
  "what date is tomorrow",
  "which day is tomorrow",
  "tell me tomorrow's date",
  "can you tell me tomorrow's date",
  "please tell me tomorrow's date",
  "could you tell me tomorrow's date",
  "what is tomorrow's date please",
  "tell me the date for tomorrow",
  "what date is tomorrow please",
  "which day is tomorrow please",
  "what date is tomorrow?",
  "what is tomorrow's date?",
  "tell me tomorrow's date?",
  "could you tell me what date is tomorrow",
];
const calendarForms = [
  "what meetings do i have tomorrow",
  "what meeting do i have tomorrow",
  "can you tell me which meetings i have tomorrow",
  "do i have anything scheduled tomorrow",
  "what's on my calendar tomorrow",
  "how does tomorrow look",
  "tell me tomorrow's agenda",
  "are there any appointments tomorrow",
];
const navigationObjects = ["calendar", "home", "workspace", "tasks", "news"];
const navigationVerbs = ["open", "show", "display", "launch", "go to", "take me to"];

describe("generated bounded natural-intent fixtures", () => {
  it("maps generated date paraphrases to one local fact", () => {
    const results = dateForms.flatMap(form => fillers.map(filler => parseConversationalRequest(`${filler}${form}`)));
    expect(results.length).toBeGreaterThanOrEqual(25);
    expect(results.every(result => result.kind === "DATE_QUESTION" && result.factKind === "TOMORROW_DATE")).toBe(true);
  });

  it("maps calendar event paraphrases to one truthful provider limitation", () => {
    const results = calendarForms.map(form => parseConversationalRequest(form));
    expect(results.length).toBeGreaterThanOrEqual(8);
    expect(results.every(result => result.kind === "CALENDAR_PROVIDER_LIMITATION")).toBe(true);
    expect(results.every(result => result.availability === "UNAVAILABLE_PROVIDER")).toBe(true);
  });

  it("maps navigation verb/object combinations without protected execution", () => {
    const results = navigationVerbs.flatMap(verb => navigationObjects.map(object => parseConversationalRequest(`${verb} ${object}`)));
    expect(results.length).toBeGreaterThanOrEqual(15);
    expect(results.every(result => result.kind === "NAVIGATION" || result.kind === "COMPOSITE_NAVIGATE_AND_FACT" || result.clarificationRequired)).toBe(true);
    expect(results.some(result => result.risk === "R5_PROHIBITED")).toBe(false);
  });
});