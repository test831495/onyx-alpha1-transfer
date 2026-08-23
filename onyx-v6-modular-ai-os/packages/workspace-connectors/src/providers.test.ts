import { describe, expect, it } from "vitest";
import { plannedProviderSnapshots } from "./providers";
describe("workspace providers",()=>{it("keeps Google and Yahoo honest placeholders",()=>{const values=plannedProviderSnapshots();expect(values.map(v=>v.provider)).toEqual(["google","yahoo"]);expect(values.every(v=>v.state==="unconfigured")).toBe(true);expect(values.flatMap(v=>v.capabilities).every(v=>!v.enabled)).toBe(true);});});
