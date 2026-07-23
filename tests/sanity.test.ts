import { describe, it, expect, vi, afterEach } from 'vitest';

describe('Sanity & Math Calculation Stubbing Suite', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Math Sanity', () => {
    it('sanity_basicMathAddition', () => {
      const add = (a: number, b: number): number => a + b;
      expect(add(2, 3)).toBe(5);
    });

    it('sanity_mathCalculationStubbing', () => {
      const calculateTotal = vi.fn((price: number, taxRate: number) => price * (1 + taxRate));
      calculateTotal.mockReturnValue(120);
      const result = calculateTotal(100, 0.2);
      expect(calculateTotal).toHaveBeenCalledTimes(1);
      expect(calculateTotal).toHaveBeenCalledWith(100, 0.2);
      expect(result).toBe(120);
    });

    it('sanity_mathFunctionRestoration', () => {
      const calculator = {
        multiply: (a: number, b: number) => a * b,
      };
      const spy = vi.spyOn(calculator, 'multiply').mockReturnValue(999);
      expect(calculator.multiply(3, 4)).toBe(999);
      spy.mockRestore();
      expect(calculator.multiply(3, 4)).toBe(12);
    });
  });

  describe('Mocking Infrastructure Verification', () => {
    it('mocking_asyncPromiseResolution', async () => {
      const fetchData = vi.fn().mockResolvedValue({ status: 200, value: 42 });
      const response = await fetchData();
      expect(fetchData).toHaveBeenCalled();
      expect(response).toEqual({ status: 200, value: 42 });
    });

    it('mocking_spyOnObjectMethod', () => {
      const mathSpy = vi.spyOn(Math, 'max');
      const maxVal = Math.max(10, 20, 5);
      expect(mathSpy).toHaveBeenCalledWith(10, 20, 5);
      expect(maxVal).toBe(20);
    });

    it('mocking_fakeTimers', () => {
      vi.useFakeTimers();
      const callback = vi.fn();
      setTimeout(callback, 1000);
      expect(callback).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });
});
