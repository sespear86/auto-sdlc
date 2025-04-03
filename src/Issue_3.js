const express = require('express');
const { body, validationResult } = require('express-validator');

// Post class
class Post {
    constructor(title, content, category_id) {
        this.id = Date.now(); // Simple ID generation
        this.title = title;
        this.content = content;
        this.category_id = category_id;
    }
}

// DataSource class (simulated database)
class DataSource {
    constructor() {
        this.posts = new Map();
        this.categories = new Set([1, 2, 3]); // Sample category IDs
    }

    savePost(post) {
        this.posts.set(post.id, post);
        return post;
    }

    categoryExists(category_id) {
        return this.categories.has(category_id);
    }
}

// ErrorDetail class
class ErrorDetail {
    constructor(field, message) {
        this.field = field;
        this.message = message;
    }
}

// ErrorResponse class
class ErrorResponse {
    constructor(errors) {
        this.status = 'error';
        this.errors = errors;
    }
}

// ValidationRule class (wrapper for express-validator)
class ValidationRule {
    constructor(field) {
        this.field = field;
        this.rules = [];
    }

    trim() {
        this.rules.push(body(this.field).trim());
        return this;
    }

    isLength(min, max) {
        this.rules.push(body(this.field).isLength({ min, max }));
        return this;
    }

    notEmpty() {
        this.rules.push(body(this.field).notEmpty());
        return this;
    }

    isInt(min) {
        this.rules.push(body(this.field).isInt({ min }));
        return this;
    }

    withMessage(msg) {
        const lastRule = this.rules[this.rules.length - 1];
        if (lastRule) {
            this.rules[this.rules.length - 1] = lastRule.withMessage(msg);
        }
        return this;
    }
}

// ValidationMiddleware class
class ValidationMiddleware {
    validatePost() {
        return [
            new ValidationRule('title')
                .trim()
                .notEmpty()
                .withMessage('Title is required')
                .isLength(3, 100)
                .withMessage('Title must be between 3 and 100 characters')
                .rules,
            new ValidationRule('content')
                .trim()
                .notEmpty()
                .withMessage('Content is required')
                .isLength(10, 1000)
                .withMessage('Content must be between 10 and 1000 characters'),
            new ValidationRule('category_id')
                .isInt(1)
                .withMessage('Category ID must be a positive integer')
                .rules
        ].flat();
    }

    checkErrors(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorDetails = errors.array().map(err => new ErrorDetail(err.path, err.msg));
            const errorResponse = new ErrorResponse(errorDetails);
            return res.status(400).json(errorResponse);
        }
        next();
    }
}

// APIApplication class
class APIApplication {
    constructor(port) {
        this.port = port;
        this.app = express();
        this.app.use(express.json());

        this.validationMiddleware = new ValidationMiddleware();
        this.dataSource = new DataSource();

        this.registerEndpoints();
    }

    registerEndpoint(endpoint, handler) {
        this.app[endpoint.method](endpoint.path, handler);
    }

    registerEndpoints() {
        this.registerEndpoint(
            { method: 'post', path: '/api/posts' },
            [
                ...this.validationMiddleware.validatePost(),
                this.validationMiddleware.checkErrors.bind(this.validationMiddleware),
                (req, res) => {
                    const { title, content, category_id } = req.body;

                    // Additional validation for category existence
                    if (category_id && !this.dataSource.categoryExists(category_id)) {
                        const errorResponse = new ErrorResponse([
                            new ErrorDetail('category_id', 'Category does not exist')
                        ]);
                        return res.status(400).json(errorResponse);
                    }

                    const post = new Post(title, content, category_id);
                    const savedPost = this.dataSource.savePost(post);
                    res.status(201).json({
                        status: 'success',
                        post: {
                            id: savedPost.id,
                            title: savedPost.title,
                            content: savedPost.content,
                            category_id: savedPost.category_id
                        }
                    });
                }
            ]
        );
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`Server running on port ${this.port}`);
        });
    }
}

// Usage example
const app = new APIApplication(3000);
app.start();
This implementation:
Uses required libraries:
Express for the API server
express-validator for validation
Implements all classes:
APIApplication: Manages the Express server and endpoints
ValidationMiddleware: Handles validation logic
ValidationRule: Wraps express-validator's chainable API
ErrorResponse: Structures error responses
ErrorDetail: Details individual errors
DataSource: Simulates a database
Post: Represents a blog post
Follows the relationships:
APIApplication uses ValidationMiddleware and DataSource
ValidationMiddleware applies ValidationRules and returns ErrorResponse
ErrorResponse contains ErrorDetails
DataSource manages Posts
Features:
Validates POST /api/posts endpoint
Checks title (not empty, 3-100 chars)
Checks content (not empty, 10-1000 chars)
Checks category_id (positive integer, exists)
Returns structured error responses
Saves valid posts
To run:
Install dependencies: npm install express express-validator
Save as a .js file and run with Node.js
Test with a tool like Postman:
Valid: POST /api/posts { "title": "Test", "content": "Test content", "category_id": 1 }
Invalid: POST /api/posts { "title": "", "content": "short" }
Note: The DataSource uses an in-memory Map for simplicity. In production, replace it with a real database. The ValidationRule class wraps express-validator's API to match the UML design while leveraging its functionality.