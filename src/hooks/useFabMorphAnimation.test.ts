import { describe, it, expect } from 'vitest';
import { calculateFabDeltaVector } from './useFabMorphAnimation';

describe('useFabMorphAnimation — Neon Traveler Geometry & Math', () => {
  it('calculates exact delta vector from resting FAB to viewport center on mobile portrait (iPhone)', () => {
    // iPhone 14/15 viewport: 393 x 852
    // FAB is 56x56, resting at bottom 20px, right 20px
    const fabRect = {
      left: 393 - 20 - 56, // 317
      top: 852 - 20 - 56,  // 776
      width: 56,
      height: 56,
    };
    const viewport = { width: 393, height: 852 };

    const vector = calculateFabDeltaVector(fabRect, viewport);

    // FAB center: (317 + 28, 776 + 28) = (345, 804)
    // Screen center: (393 / 2, 852 / 2) = (196.5, 426)
    // Delta: (345 - 196.5, 804 - 426) = (148.5, 378)
    expect(vector.deltaX).toBe(148.5);
    expect(vector.deltaY).toBe(378);
  });

  it('calculates exact delta vector for tablet landscape (iPad)', () => {
    // iPad landscape: 1194 x 834
    // FAB is 56x56, resting at bottom 24px, right 32px
    const fabRect = {
      left: 1194 - 32 - 56, // 1106
      top: 834 - 24 - 56,   // 754
      width: 56,
      height: 56,
    };
    const viewport = { width: 1194, height: 834 };

    const vector = calculateFabDeltaVector(fabRect, viewport);

    // FAB center: (1106 + 28, 754 + 28) = (1134, 782)
    // Screen center: (1194 / 2, 834 / 2) = (597, 417)
    // Delta: (1134 - 597, 782 - 417) = (537, 365)
    expect(vector.deltaX).toBe(537);
    expect(vector.deltaY).toBe(365);
  });

  it('handles custom FAB positions including negative delta and center alignment', () => {
    const viewport = { width: 400, height: 800 };

    // FAB at top-left corner
    const topLeftFab = { left: 0, top: 0, width: 56, height: 56 };
    const topLeftVector = calculateFabDeltaVector(topLeftFab, viewport);
    // Center: (28, 28) - (200, 400) = (-172, -372)
    expect(topLeftVector.deltaX).toBe(-172);
    expect(topLeftVector.deltaY).toBe(-372);

    // FAB at exact center
    const centerFab = { left: 200 - 28, top: 400 - 28, width: 56, height: 56 };
    const centerVector = calculateFabDeltaVector(centerFab, viewport);
    expect(centerVector.deltaX).toBe(0);
    expect(centerVector.deltaY).toBe(0);
  });
});
