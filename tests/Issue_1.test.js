const { app } = require('../src/Issue_1');

describe('Issue_1 Tests', () => {
'Calculator', () => {
  let calculator;

  // Set up a fresh Calculator instance before each test
  beforeEach(() => {
    calculator = new Calculator();
  });

  describe('addNumbers', () => {
    // Test successful cases
    it('should correctly add two positive numbers', () => {
      const result = calculator.addNumbers(5, 3);
      expect(result).toBe(8);
    });

    it('should correctly add a positive and negative number', () => {
      const result = calculator.addNumbers(5, -3);
      expect(result).toBe(2);
    });

    it('should correctly add two negative numbers', () => {
      const result = calculator.addNumbers(-5, -3);
      expect(result).toBe(-8);
    });

    it('should correctly add decimal numbers', () => {
      const result = calculator.addNumbers(5.5, 3.2);
      expect(result).toBeCloseTo(8.7); // Using toBeCloseTo for floating-point comparison
    });

    it('should correctly add zero to a number', () => {
      const result = calculator.addNumbers(5, 0);
      expect(result).toBe(5);
    });

    // Test error cases
    it('should throw Error when first argument is a string', () => {
      expect(() => calculator.addNumbers("5", 3)).toThrow(Error);
      expect(() => calculator.addNumbers("5", 3)).toThrow("Both inputs must be numbers");
    });

    it('should throw Error when second argument is a string', () => {
      expect(() => calculator.addNumbers(5, "3")).toThrow(Error);
      expect(() => calculator.addNumbers(5, "3")).toThrow("Both inputs must be numbers");
    });

    it('should throw Error when both arguments are strings', () => {
      expect(() => calculator.addNumbers("5", "3")).toThrow(Error);
      expect(() => calculator.addNumbers("5", "3")).toThrow("Both inputs must be numbers");
    });

    it('should throw Error when first argument is NaN', () => {
      expect(() => calculator.addNumbers(NaN, 3)).toThrow(Error);
      expect(() => calculator.addNumbers(NaN, 3)).toThrow("Both inputs must be numbers");
    });

    it('should throw Error when second argument is NaN', () => {
      expect(() => calculator.addNumbers(5, NaN)).toThrow(Error);
      expect(() => calculator.addNumbers(5, NaN)).toThrow("Both inputs must be numbers");
    });

    it('should throw Error when first argument is undefined', () => {
      expect(() => calculator.addNumbers(undefined, 3)).toThrow(Error);
      expect(() => calculator.addNumbers(undefined, 3)).toThrow("Both inputs must be numbers");
    });

    it('should throw Error when second argument is null', () => {
      expect(() => calculator.addNumbers(5, null)).toThrow(Error);
      expect(() => calculator.addNumbers(5, null)).toThrow("Both inputs must be numbers");
    });

    it('should throw Error when both arguments are objects', () => {
      expect(() => calculator.addNumbers({}, {})).toThrow(Error);
      expect(() => calculator.addNumbers({}, {})).toThrow("Both inputs must be numbers");
    });
  });

  // Test Error class indirectly through Calculator
  describe('Error handling', () => {
    it('should create an Error with the correct message', () => {
      try {
        calculator.addNumbers("5", 3);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe("Both inputs must be numbers");
      }
    });
  });
});
This test suite:
Uses proper Jest syntax with describe, it, and expect
Organizes tests into logical groups using nested describe blocks
Includes a beforeEach setup to ensure a fresh Calculator instancia for each test
Tests the main functionality:
Successful addition with various number types (positive, negative, decimal, zero)
Error cases with various invalid inputs (strings, NaN, undefined, null, objects)
Error class behavior
Uses appropriate Jest matchers:
toBe for exact number comparisons
toBeCloseTo for floating-point numbers
toThrow for error checking
toBeInstanceOf for type checking
toBe for string comparison
To run these tests, you would need:
The original code in a file (e.g., calculator.js)
This test file (e.g., calculator.test.js)
Jest installed in your project (npm install --save-dev jest)
The Calculator and Error classes exported from calculator.js if in a separate file
The tests cover:
All success cases for valid number inputs
All error cases for invalid inputs
The Error class functionality through the Calculator's error throwing
Edge cases like decimals and negative numbers
No mocks are needed since this is a pure JavaScript implementation without external dependencies.
});