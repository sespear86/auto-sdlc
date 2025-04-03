const { app } = require('../src/Issue_3');

describe('Issue_3 Tests', () => {
'Post Class', () => {
  it('should create a post with correct properties', () => {
    const post = new Post('Test Title', 'Test Content', 1);
    expect(post).toHaveProperty('id');
    expect(post.title).toBe('Test Title');
    expect(post.content).toBe('Test Content');
    expect(post.category_id).toBe(1);
  });
});

describe('DataSource Class', () => {
  let dataSource;
  
  beforeEach(() => {
    dataSource = new DataSource();
  });

  it('should save a post', () => {
    const post = new Post('Test', 'Content', 1);
    const savedPost = dataSource.savePost(post);
    expect(dataSource.posts.get(post.id)).toBe(post);
    expect(savedPost).toBe(post);
  });

  it('should check category existence', () => {
    expect(dataSource.categoryExists(1)).toBe(true);
    expect(dataSource.categoryExists(4)).toBe(false);
  });
});

describe('ErrorDetail and ErrorResponse Classes', () => {
  it('should create ErrorDetail with correct properties', () => {
    const error = new ErrorDetail('title', 'Title is required');
    expect(error.field).toBe('title');
    expect(error.message).toBe('Title is required');
  });

  it('should create ErrorResponse with errors array', () => {
    const errors = [new ErrorDetail('title', 'Title is required')];
    const response = new ErrorResponse(errors);
    expect(response.status).toBe('error');
    expect(response.errors).toBe(errors);
  });
});

describe('ValidationRule Class', () => {
  it('should chain validation rules correctly', () => {
    const rule = new ValidationRule('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength(3, 100);
    
    expect(rule.rules).toHaveLength(3);
    expect(rule.rules[0].builder._sanitize).toBeDefined(); // trim
    expect(rule.rules[1].builder._validators).toHaveProperty('notEmpty'); // notEmpty
    expect(rule.rules[1].builder._message).toBe('Title is required'); // withMessage
  });
});

describe('ValidationMiddleware Class', () => {
  it('should return validation rules array', () => {
    const middleware = new ValidationMiddleware();
    const rules = middleware.validatePost();
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThan(0);
  });
});

describe('APIApplication', () => {
  let app;
  
  beforeEach(() => {
    app = new APIApplication(3000);
    // Mock the listen method to prevent actual server start
    app.app.listen = jest.fn((port, callback) => callback());
    app.start();
  });

  describe('POST /api/posts', () => {
    it('should create a post with valid data', async () => {
      const response = await request(app.app)
        .post('/api/posts')
        .send({
          title: 'Valid Title',
          content: 'This is valid content for testing',
          category_id: 1
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.post).toHaveProperty('id');
      expect(response.body.post.title).toBe('Valid Title');
    });

    it('should reject post with invalid title', async () => {
      const response = await request(app.app)
        .post('/api/posts')
        .send({
          title: 'ab', // Too short
          content: 'This is valid content for testing',
          category_id: 1
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.errors[0].field).toBe('title');
      expect(response.body.errors[0].message).toBe('Title must be between 3 and 100 characters');
    });

    it('should reject post with invalid category_id', async () => {
      const response = await request(app.app)
        .post('/api/posts')
        .send({
          title: 'Valid Title',
          content: 'This is valid content for testing',
          category_id: 999 // Non-existent category
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.errors[0].field).toBe('category_id');
      expect(response.body.errors[0].message).toBe('Category does not exist');
    });

    it('should reject post with missing content', async () => {
      const response = await request(app.app)
        .post('/api/posts')
        .send({
          title: 'Valid Title',
          category_id: 1
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.errors[0].field).toBe('content');
      expect(response.body.errors[0].message).toBe('Content is required');
    });
  });
});

// Mock the Date.now() for consistent ID generation in tests
beforeAll(() => {
  jest.spyOn(Date, 'now').mockImplementation(() => 1234567890);
});

afterAll(() => {
  jest.restoreAllMocks();
});
To run these tests, you'll need to:
Install the required dependencies:
bash
npm install --save-dev jest supertest
npm install express express-validator
Save the tests in a file named your-file-name.test.js
Ensure your classes are exported from the main file using:
javascript
module.exports = {
  Post,
  DataSource,
  ErrorDetail,
  ErrorResponse,
  ValidationRule,
  ValidationMiddleware,
  APIApplication
};
Run the tests with:
bash
npx jest
These tests cover:
Unit tests for each class's basic functionality
Integration tests for the API endpoint
Validation rules and error handling
Successful post creation
Various error cases (invalid title, content, category_id)
Key features of the test suite:
Uses supertest for HTTP request testing
Mocks the server listen method to avoid actual port binding
Mocks Date.now() for consistent ID generation
Uses proper Jest syntax with describe, it, and expect
Includes setup/teardown with beforeEach and beforeAll/afterAll
Tests both success and failure cases
Verifies response structure and content
The tests assume the code is in a single file. If you split it into multiple files, adjust the imports accordingly. The tests focus on the main functionality while maintaining good coverage of edge cases and error conditions.
});