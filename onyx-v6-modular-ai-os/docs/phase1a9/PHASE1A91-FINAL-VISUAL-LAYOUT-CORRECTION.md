# Phase 1A.9.1 Final Visual Layout Correction

## Scope

Presentation-only correction for the final ONYX/NOVA card-layout defects:

- Right-side card gutter in both ONYX and NOVA.
- Overflow navigation overlapping the centered Wake Armed control.
- Minimum visible vertical gap between automatically positioned cards.

No pagination state, overflow counting, dragging behavior, card dimensions, app content, minimized lifecycle, character protection, scheduler behavior, governance behavior, deployment, or Git closure was changed.

## Measured Causes

### Right Gutter

Browser measurement at 1440x900 showed the CardCanvas itself already reached the safe shell width:

- main shell: 1440px wide
- CardCanvas: 1416px wide, left 12px, right 1428px

The remaining gutter came from automatic card positions, not from canvas width. Right-side automatic cards used the existing 70% x-position, producing:

- left card margin: 28.3px
- right card margin: 124.8px

The correction keeps CardCanvas at the full safe shell width and uses equal automatic card rails:

- left automatic rail: 24px
- right automatic rail: `100% - card width - 24px`

### Wake / Overflow Overlap

Browser measurement showed overflow navigation was absolutely positioned inside the scene:

```css
.overflow-navigation-region {
  position: absolute;
  left: 50%;
  bottom: 8px;
  transform: translateX(-50%);
}
```

That placed it over the centered Wake Armed status row:

- Wake Armed bottom: 790px
- overflow top: 772.8px
- measured overlap: 17.2px

The correction moves overflow navigation into the existing bottom stack above the footer, keeps it content-sized, and adds card-scene-only Wake clearance.

## Final Measured Result

At 1440x900 with overflow active:

### NOVA

- CardCanvas: 1416px safe shell width
- left/right card margins: 24px / 24px
- rightmost card right edge: 1404px inside 1428px canvas right edge
- Wake/overflow gap: 22px
- overflow/footer gap: 48.8px
- overflow width: 278.8px
- minimum vertical card gap: 16px

### ONYX

- CardCanvas: 1416px safe shell width
- left/right card margins: 24px / 24px
- rightmost card right edge: 1404px inside 1428px canvas right edge
- Wake/overflow gap: 22px
- overflow/footer gap: 18.8px
- overflow width: 285.3px
- minimum vertical card gap: 16px

## Files

- `apps/command-center/src/App.tsx`
- `apps/command-center/src/components/AppCardShell.tsx`
- `apps/command-center/src/styles.css`
- `apps/command-center/src/workspaceLayout.test.tsx`
