const { app } = require('../src/Issue_1');

describe('Issue_1 Tests', () => {
'Calculator class tests', () => {
    let calculator;

    beforeEach(() => {
        calculator = new Calculator();
    });

    it('should correctly add two valid numbers', () => {
        const result = calculator.addNumbers(5, 3);
        expect(result).toBe(8);
    });

    it('should return a number type when adding valid numbers', () => {
        const result = calculator.addNumbers(2, 4);
        expect(typeof result).toBe('number');
    });

    it('should throw Error when first parameter is a string', () => {
        expect(() => {
            calculator.addNumbers("5", 3);
        }).toThrow(Error);
        expect(() => {
            calculator.addNumbers("5", 3);
        }).toThrow("Both inputs must be numbers");
    });

    it('should throw Error when second parameter is a string', () => {
        expect(() => {
            calculator.addNumbers(5, "3");
        }).toThrow(Error);
        expect(() => {
            calculator.addNumbers(5, "3");
        }).toThrow("Both inputs must be numbers");
    });

    it('should throw Error when first parameter is NaN', () => {
        expect(() => {
            calculator.addNumbers(NaN, 3);
        }).toThrow(Error);
        expect(() => {
            calculator.addNumbers(NaN, 3);
        }).toThrow("Both inputs must be numbers");
    });

    it('should throw Error when second parameter is NaN', () => {
        expect(() => {
            calculator.addNumbers(5, NaN);
        }).toThrow(Error);
        expect(() => {
            calculator.addNumbers(5, NaN);
        }).toThrow("Both inputs must be numbers");
    });

    it('should throw Error when both parameters are invalid', () => {
        expect(() => {
            calculator.addNumbers("abc", null);
        }).toThrow(Error);
        expect(() => {
            calculator.addNumbers("abc", null);
        }).toThrow("Both inputs must be numbers");
    });

    it('should handle negative numbers correctly', () => {
        const result = calculator.addNumbers(-2, -3);
        expect(result).toBe(-5);
    });

    it('should handle decimal numbers correctly', () => {
        const result = calculator.addNumbers(2.5, 3.7);
        expect(result).toBeCloseTo(6.2); // Using toBeCloseTo for floating-point comparison
    });
});
This test suite:
Uses proper Jest syntax with describe and it blocks;
Includes necessary imports (assumes the code is in '../src/Calculator');
Wraps all tests in a single describe block;
Uses semicolons consistently;
Tests the main functionality:
Valid number addition
Return type checking
Various invalid input scenarios
Negative numbers
Decimal numbers
Uses beforeEach to create a fresh Calculator instance for each test;
Tests both the error throwing and the specific error message;
Uses appropriate Jest matchers:
toBe for exact matches
toThrow for error checking
toBeCloseTo for floating-point comparisons
typeof for type checking
The tests cover:
Happy path (valid number inputs)
Error cases (strings, NaN, null)
Edge cases (negative numbers, decimals)
Type validation
Error message verification
To use this test suite:
Save your original code in a file (e.g., Calculator.js)
Save this test code in a file with .test.js extension (e.g., Calculator.test.js)
Adjust the require path based on your project structure
Run with jest command
The tests will verify that the Calculator class behaves as specified in the implementation and matches the described functionality from the PlantUML design.
});