export type GeometryRect = { left: number; top: number; right: number; bottom: number };

export type CardCanvasGeometry = {
  canvas: { width: number; height: number };
  card: { width: number; height: number };
  protectedCharacter: GeometryRect;
  safeHorizontalInset: number;
  safeVerticalInset: number;
};

export function toCanvasRect(rect: DOMRect | GeometryRect, canvasRect: DOMRect | GeometryRect): GeometryRect {
  return {
    left: rect.left - canvasRect.left,
    top: rect.top - canvasRect.top,
    right: rect.right - canvasRect.left,
    bottom: rect.bottom - canvasRect.top,
  };
}

export function protectedCharacterRect(
  portraitRect: DOMRect | GeometryRect,
  coreRect: DOMRect | GeometryRect,
  nameRect: DOMRect | GeometryRect,
  canvasRect: DOMRect | GeometryRect,
  safetyMargin = 16,
): GeometryRect {
  const portrait = toCanvasRect(portraitRect, canvasRect);
  const core = toCanvasRect(coreRect, canvasRect);
  const name = toCanvasRect(nameRect, canvasRect);
  const character = {
    left: portrait.left + (portrait.right - portrait.left) * 0.22,
    top: portrait.top + (portrait.bottom - portrait.top) * 0.08,
    right: portrait.left + (portrait.right - portrait.left) * 0.78,
    bottom: portrait.top + (portrait.bottom - portrait.top) * 0.82,
  };
  return {
    left: Math.max(0, Math.min(character.left, core.left, name.left) - safetyMargin),
    top: Math.max(0, Math.min(character.top, core.top, name.top) - safetyMargin),
    right: Math.max(character.right, core.right, name.right) + safetyMargin,
    bottom: Math.min(canvasRect.bottom - canvasRect.top, Math.max(character.bottom, core.bottom, name.bottom) + safetyMargin),
  };
}

export function cardHorizontalBounds(canvasWidth: number, cardWidth: number, safeHorizontalInset: number): { minX: number; maxX: number } {
  const maxX = Math.max(safeHorizontalInset, canvasWidth - cardWidth - safeHorizontalInset);
  return { minX: safeHorizontalInset, maxX };
}

function overlaps(first: GeometryRect, second: GeometryRect): boolean {
  return first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
}

export function resolveCardPosition(
  x: number,
  y: number,
  geometry: CardCanvasGeometry,
): { x: number; y: number } {
  const { width: canvasWidth, height: canvasHeight } = geometry.canvas;
  const bounds = cardHorizontalBounds(canvasWidth, geometry.card.width, geometry.safeHorizontalInset);
  const minY = geometry.safeVerticalInset;
  const maxY = Math.max(minY, canvasHeight - geometry.card.height - geometry.safeVerticalInset);
  const initial = {
    left: Math.max(bounds.minX, Math.min(bounds.maxX, x / 100 * canvasWidth)),
    top: Math.max(minY, Math.min(maxY, y / 100 * canvasHeight)),
  };
  const cardAt = (left: number, top: number): GeometryRect => ({
    left,
    top,
    right: left + geometry.card.width,
    bottom: top + geometry.card.height,
  });
  const current = cardAt(initial.left, initial.top);
  if (overlaps(current, geometry.protectedCharacter)) {
    const candidates = [
      { left: geometry.protectedCharacter.left - geometry.card.width, top: initial.top },
      { left: geometry.protectedCharacter.right, top: initial.top },
      { left: initial.left, top: geometry.protectedCharacter.top - geometry.card.height },
      { left: initial.left, top: geometry.protectedCharacter.bottom },
    ].map((candidate) => ({
      left: Math.max(bounds.minX, Math.min(bounds.maxX, candidate.left)),
      top: Math.max(minY, Math.min(maxY, candidate.top)),
    })).filter((candidate) => !overlaps(cardAt(candidate.left, candidate.top), geometry.protectedCharacter));
    if (candidates.length > 0) {
      candidates.sort((first, second) =>
        Math.abs(first.left - initial.left) + Math.abs(first.top - initial.top)
        - Math.abs(second.left - initial.left) - Math.abs(second.top - initial.top));
        const nearest = candidates[0]!;
        return { x: nearest.left / canvasWidth * 100, y: nearest.top / canvasHeight * 100 };
    }
  }
  return { x: initial.left / canvasWidth * 100, y: initial.top / canvasHeight * 100 };
}