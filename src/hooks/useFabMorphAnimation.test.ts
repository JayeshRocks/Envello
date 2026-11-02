import { describe, it, expect } from 'vitest';
import { calculateFabMorphCoords } from './useFabMorphAnimation';

describe('useFabMorphAnimation — Morphing Geometry & Math', () => {
  it('calculates exact delta vectors and scale factors for mobile portrait (iPhone)', () => {
    // iPhone 14/15 viewport: 393 x 852
    // FAB is 56x56, resting at bottom 20px, right 20px
    const fabRect = {
      left: 393 - 20 - 56, // 317
      top: 852 - 20 - 56,  // 776
      width: 56,
      height: 56,
    };
    const viewport = { width: 393, height: 852 };
    // Modal panel rendered dimensions
    const panel = { width: 369, height: 520 };

    const coords = calculateFabMorphCoords(fabRect, viewport, panel);

    // FAB center: (317 + 28, 776 + 28) = (345, 804)
    // Screen center: (393 / 2, 852 / 2) = (196.5, 426)
    // Delta: (345 - 196.5, 804 - 426) = (148.5, 378)
    expect(coords.deltaX).toBe(148.5);
    expect(coords.deltaY).toBe(378);

    // Scale factors: 56 / 369 ≈ 0.1517, 56 / 520 ≈ 0.1077
    expect(coords.scaleX).toBeCloseTo(0.1517, 3);
    expect(coords.scaleY).toBeCloseTo(0.1077, 3);
    expect(coords.fabWidth).toBe(56);
    expect(coords.fabHeight).toBe(56);
  });

  it('calculates correct delta vectors for tablet landscape (iPad)', () => {
    // iPad landscape: 1194 x 834
    // FAB is 56x56, resting at bottom 24px, right 32px
    const fabRect = {
      left: 1194 - 32 - 56, // 1106
      top: 834 - 24 - 56,   // 754
      width: 56,
      height: 56,
    };
    const viewport = { width: 1194, height: 834 };
    const panel = { width: 512, height: 560 };

    const coords = calculateFabMorphCoords(fabRect, viewport, panel);

    // FAB center: (1106 + 28, 754 + 28) = (1134, 782)
    // Screen center: (1194 / 2, 834 / 2) = (597, 417)
    // Delta: (1134 - 597, 782 - 417) = (537, 365)
    expect(coords.deltaX).toBe(537);
    expect(coords.deltaY).toBe(365);

    expect(coords.scaleX).toBeCloseTo(56 / 512, 3);
    expect(coords.scaleY).toBeCloseTo(56 / 560, 3);
  });

  it('clamps scale factors safely to prevent division by zero or extreme ratios', () => {
    const fabRect = { left: 0, top: 0, width: 56, height: 56 };
    const viewport = { width: 400, height: 800 };
    // Pathological tiny panel
    const tinyPanel = { width: 10, height: 10 };
    const coords = calculateFabMorphCoords(fabRect, viewport, tinyPanel);

    // Clamped at max 0.5
    expect(coords.scaleX).toBe(0.5);
    expect(coords.scaleY).toBe(0.5);

    // Pathological huge panel
    const hugePanel = { width: 5000, height: 5000 };
    const hugeCoords = calculateFabMorphCoords(fabRect, viewport, hugePanel);
    // Clamped at min 0.04
    expect(hugeCoords.scaleX).toBe(0.04);
    expect(hugeCoords.scaleY).toBe(0.04);
  });
});
