import { describe, expect, it } from "vitest";
import { cardHorizontalBounds, protectedCharacterRect, resolveCardPosition, toCanvasRect } from "./cardGeometry";

const rect = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });

describe("production card geometry", () => {
  const canvas = rect(100, 200, 1100, 1000);
  const protectedCore = protectedCharacterRect(
    rect(300, 250, 900, 850),
    rect(550, 650, 650, 750),
    rect(525, 770, 675, 800),
    canvas,
    10,
  );

  it("expresses the protected character rectangle in CardCanvas coordinates", () => {
    expect(toCanvasRect(rect(300, 250, 900, 850), canvas)).toEqual(rect(200, 50, 800, 650));
    expect(protectedCore.left).toBeGreaterThan(0);
    expect(protectedCore.right).toBeLessThan(1000);
  });

  it("resolves a complete overlapping card using the smallest valid displacement", () => {
    const result = resolveCardPosition(45, 45, {
      canvas: { width: 1000, height: 800 },
      card: { width: 220, height: 180 },
      protectedCharacter: rect(400, 300, 600, 500),
      safeHorizontalInset: 16,
      safeVerticalInset: 8,
    });
    expect(result).toEqual({ x: 45, y: 62.5 });
  });

  it("keeps News outside the protected face, torso, name, and aura region", () => {
    const result = resolveCardPosition(45, 45, {
      canvas: { width: 1000, height: 800 },
      card: { width: 220, height: 180 },
      protectedCharacter: protectedCore,
      safeHorizontalInset: 16,
      safeVerticalInset: 8,
    });
    expect(result.x).not.toBe(45);
  });

  it("uses equal safe insets and allows both outer safe edges", () => {
    const bounds = cardHorizontalBounds(1000, 220, 16);
    expect(bounds).toEqual({ minX: 16, maxX: 764 });
    expect(bounds.minX).toBe(1000 - bounds.maxX - 220);
    const geometry = {
      canvas: { width: 1000, height: 800 }, card: { width: 220, height: 180 },
      protectedCharacter: rect(450, 300, 550, 500), safeHorizontalInset: 16, safeVerticalInset: 8,
    };
    expect(resolveCardPosition(0, 10, geometry).x).toBe(1.6);
    expect(resolveCardPosition(100, 10, geometry).x).toBe(76.4);
  });

  it("does not use automatic slot placement and preserves clear manual positions", () => {
    const result = resolveCardPosition(8, 70, {
      canvas: { width: 1000, height: 800 }, card: { width: 220, height: 180 },
      protectedCharacter: rect(450, 300, 550, 500), safeHorizontalInset: 16, safeVerticalInset: 8,
    });
    expect(result).toEqual({ x: 8, y: 70 });
  });
});