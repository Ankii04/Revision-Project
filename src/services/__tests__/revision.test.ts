import { describe, it, expect } from "vitest";
import { calculateSM2 } from "../revision.service";

/**
 * Unit tests for the core spaced-repetition logic.
 * Every interview candidate knows: the algorithm is the source of truth.
 */
describe("SM-2 Spaced Repetition Algorithm", () => {
  // Initial state as per our Prisma schema defaults
  const initialCard = {
    easeFactor: 2.5,
    interval: 1,
    repetition: 0,
  };

  it("should reset interval to 1 on failure (AGAIN)", () => {
    const result = calculateSM2(initialCard, "AGAIN");
    expect(result.newInterval).toBe(1);
    expect(result.newRepetition).toBe(0);
    expect(result.newEaseFactor).toBeLessThan(2.5);
  });

  it("should set interval to 1 on first success (GOOD)", () => {
    const result = calculateSM2(initialCard, "GOOD");
    expect(result.newInterval).toBe(1);
    expect(result.newRepetition).toBe(1);
    expect(result.newEaseFactor).toBe(2.5);
  });

  it("should set interval to 6 on second consecutive success", () => {
    const firstSuccess = calculateSM2(initialCard, "GOOD");
    const secondSuccess = calculateSM2(
      {
        easeFactor: firstSuccess.newEaseFactor,
        interval: firstSuccess.newInterval,
        repetition: firstSuccess.newRepetition,
      },
      "GOOD"
    );
    expect(secondSuccess.newInterval).toBe(6);
    expect(secondSuccess.newRepetition).toBe(2);
  });

  it("should exponentially increase interval for Easy responses", () => {
    const state = { easeFactor: 2.5, interval: 6, repetition: 2 };
    const result = calculateSM2(state, "EASY");
    // 6 * 2.5 = 15
    expect(result.newInterval).toBe(15);
    expect(result.newEaseFactor).toBeGreaterThan(2.5);
  });

  it("should never drop ease factor below 1.3", () => {
    let state = { easeFactor: 1.4, interval: 1, repetition: 0 };
    // Force many failures
    for (let i = 0; i < 5; i++) {
        const result = calculateSM2(state, "AGAIN");
        state = { 
            easeFactor: result.newEaseFactor, 
            interval: result.newInterval, 
            repetition: result.newRepetition 
        };
    }
    expect(state.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});
