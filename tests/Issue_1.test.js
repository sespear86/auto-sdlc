const { app } = require('../src/Issue_1');

describe('Issue_1 Tests', () => {
'Calculator', () => {
  let calculator;

  // Setup before each test
  beforeEach(() => {
    calculator = new Calculator();
  });

  describe('addNumbers', () => {
    // Test successful cases
    it('should correctly add two positive numbers', () => {
      expect(calculator.addNumbers(5, 3)).toBe(8);
    });

    it('should correctly add a positive and negative number', () => {
      expect(calculator.addNumbers(5, -3)).toBe(2);
    });

    it('should correctly add two negative numbers', () => {
      expect(calculator.addNumbers(-5, -3)).toBe(-8);
    });

    it('should correctly add decimal numbers', () => {
      expect(calculator.addNumbers(5.5, 3.2)).toBeCloseTo(8.7); // Using toBeCloseTo for floating-point comparison
    });

    it('should correctly add zero to a number', () => {
      expect(calculator.addNumbers(5, 0)).toBe(5);
    });

    // Test error cases
    it('should throw Error when first parameter is a string', () => {
      expect(() => calculator.addNumbers('5', 3)).toThrow('Both inputs must be numbers');
    });

    it('should throw Error when second parameter is a string', () => {
      expect(() => calculator.addNumbers(5, '3')).toThrow('Both inputs must be numbers');
    });

    it('should throw Error when both parameters are strings', () => {
      expect(() => calculator.addNumbers('5', '3')).toThrow('Both inputs must be numbers');
    });

    it('should throw Error when first parameter is NaN', () => {
      expect(() => calculator.addNumbers(NaN, 3)).toThrow('Both inputs must be numbers');
    });

    it('should throw Error when second parameter is NaN', () => {
      expect(() => calculator.addNumbers(5, NaN)).toThrow('Both inputs must be numbers');
    });

    it('should throw Error when first parameter is undefined', () => {
      expect(() => calculator.addNumbers(undefined, 3)).toThrow('Both inputs must be numbers');
    });

    it('should throw Error when second parameter is null', () => {
      expect(() => calculator.addNumbers(5, null)).toThrow('Both inputs must be numbers');
    });

    it('should throw Error when first parameter is an object', () => {
      expect(() => calculator.addNumbers({}, 3)).toThrow('Both inputs must be numbers');
    });

    it('should throw Error when second parameter is an array', () => {
      expect(() => calculator.addNumbers(5, [])).toThrow('Both inputs must be numbers');
    });
  });

  // Test Error class indirectly through Calculator
  describe('Error handling', () => {
    it('should throw an Error object with correct message', () => {
      try {
        calculator.addNumbers('5', 3);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Both inputs must be numbers');
      }
    });
  });
});
This test suite:
Uses proper Jest syntax with describe blocks to organize tests and ` it'descriptions for individual test cases
Includes a beforeEach setup to create a fresh Calculator instance for each test
Tests the main functionality of addNumbers:
Successful addition with various number types (positive, negative, decimal, zero)
Error cases with different invalid inputs (strings, NaN, undefined, null, objects, arrays)
Verifies the Error class functionality through the Calculator's error throwing
Uses appropriate Jest matchers:
toBe for exact number comparisons
toBeCloseTo for floating-point numbers
toThrow for error checking
toBeInstanceOf for type checking
toBe for string message comparison
To run these tests, you would need:
Jest installed in your project (npm install --save-dev jest)
The test file saved with a .test.js extension
The original code in a separate file (e.g., calculator.js) that you import if you split them
Run with npx jest or through your package.json scripts
The tests cover:
All main success cases for number addition
All specified validation checks (type checking and NaN checking)
Error message accuracy
Proper error object creation
Edge cases with different types of invalid inputs
No mocks are needed since the code has no external dependencies, and the Error class is a simple implementation used directly by Calculator.
});