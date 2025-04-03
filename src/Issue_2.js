libraries (Express, JWT, bcrypt):
javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// ValidationError class
class ValidationError {
    constructor(field, message) {
        this.field = field;
        this.message = message;
    }
}

// User class
class User {
    constructor(username, email, password_hash) {
        this.user_id = Date.now(); // Simple ID generation
        this.username = username;
        this.email = email;
        this.password_hash = password_hash;
        this.created_at = new Date();
    }
}

// DataSource class (simulated database)
class DataSource {
    constructor() {
        this.users = new Map();
    }

    saveUser(user) {
        this.users.set(user.user_id, user);
        return user;
    }

    findUserByUsername(username) {
        for (let user of this.users.values()) {
            if (user.username === username) return user;
        }
        return null;
    }
}

// PasswordService class
class PasswordService {
    constructor() {
        this.saltRounds = 10;
    }

    async hashPassword(password) {
        return await bcrypt.hash(password, this.saltRounds);
    }

    async comparePassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }
}

// TokenService class
class TokenService {
    constructor(secretKey) {
        this.secretKey = secretKey;
    }

    signToken(payload, expiresIn = '1h') {
        return jwt.sign(payload, this.secretKey, { expiresIn });
    }

    verifyToken(token) {
        return jwt.verify(token, this.secretKey);
    }
}

// AuthenticationMiddleware class
class AuthenticationMiddleware {
    constructor(tokenService) {
        this.tokenService = tokenService;
    }

    authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        try {
            const decoded = this.tokenService.verifyToken(token);
            req.user = decoded;
            next();
        } catch (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
    }
}

// UserManager class
class UserManager {
    constructor(tokenService, passwordService, dataSource) {
        this.tokenService = tokenService;
        this.passwordService = passwordService;
        this.dataSource = dataSource;
    }

    validateInput(req) {
        const errors = [];
        const { username, email, password } = req;

        if (!username || username.length < 3) {
            errors.push(new ValidationError('username', 'Username must be at least 3 characters'));
        }
        if (!email || !email.includes('@')) {
            errors.push(new ValidationError('email', 'Invalid email format'));
        }
        if (!password || password.length < 6) {
            errors.push(new ValidationError('password', 'Password must be at least 6 characters'));
        }

        return errors;
    }

    async registerUser(username, email, password) {
        const req = { username, email, password };
        const errors = this.validateInput(req);

        if (errors.length > 0) {
            throw errors;
        }

        const existingUser = this.dataSource.findUserByUsername(username);
        if (existingUser) {
            throw [new ValidationError('username', 'Username already exists')];
        }

        const password_hash = await this.passwordService.hashPassword(password);
        const user = new User(username, email, password_hash);
        return this.dataSource.saveUser(user);
    }

    async loginUser(username, password) {
        const user = this.dataSource.findUserByUsername(username);
        if (!user) {
            throw [new ValidationError('username', 'User not found')];
        }

        const isValid = await this.passwordService.comparePassword(password, user.password_hash);
        if (!isValid) {
            throw [new ValidationError('password', 'Invalid password')];
        }

        const payload = { user_id: user.user_id, username: user.username };
        return this.tokenService.signToken(payload);
    }
}

// APIApplication class
class APIApplication {
    constructor(port, secretKey) {
        this.port = port;
        this.secretKey = secretKey;
        this.app = express();
        this.app.use(express.json());

        this.tokenService = new TokenService(secretKey);
        this.passwordService = new PasswordService();
        this.dataSource = new DataSource();
        this.userManager = new UserManager(this.tokenService, this.passwordService, this.dataSource);
        this.authMiddleware = new AuthenticationMiddleware(this.tokenService);

        this.registerEndpoints();
    }

    registerEndpoint(endpoint, handler) {
        this.app[endpoint.method](endpoint.path, handler);
    }

    registerEndpoints() {
        this.registerEndpoint(
            { method: 'post', path: '/api/register' },
            async (req, res) => {
                try {
                    const { username, email, password } = req.body;
                    const user = await this.userManager.registerUser(username, email, password);
                    res.status(201).json({ user_id: user.user_id, username: user.username });
                } catch (errors) {
                    res.status(400).json({ errors });
                }
            }
        );

        this.registerEndpoint(
            { method: 'post', path: '/api/login' },
            async (req, res) => {
                try {
                    const { username, password } = req.body;
                    const token = await this.userManager.loginUser(username, password);
                    res.json({ token });
                } catch (errors) {
                    res.status(401).json({ errors });
                }
            }
        );

        this.registerEndpoint(
            { method: 'get', path: '/api/profile' },
            [this.authMiddleware.authenticateToken.bind(this.authMiddleware)],
            (req, res) => {
                res.json({ user: req.user });
            }
        );
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`Server running on port ${this.port}`);
        });
    }
}

// Usage example
const app = new APIApplication(3000, 'your-secret-key');
app.start();
This implementation:
Uses real-world libraries:
Express for the API server
jsonwebtoken for JWT handling
bcrypt for password hashing
Implements all classes as specified:
APIApplication: Sets up Express server with endpoints
UserManager: Handles registration and login logic
AuthenticationMiddleware: Protects routes with JWT
TokenService: Manages JWT tokens
PasswordService: Handles password hashing
User: User data model
DataSource: Simple in-memory database
ValidationError: Error reporting
Follows the relationships:
Proper composition between classes
Error handling with ValidationError arrays
Token verification for protected routes
Features:
Input validation
Secure password storage
JWT authentication
RESTful endpoints (/api/register, /api/login, /api/profile)
To run this:
Install dependencies: npm install express jsonwebtoken bcrypt
Save as a .js file and run with Node.js
Test with tools like Postman
Note: This uses an in-memory DataSource for simplicity. In production, you'd replace it with a real database (e.g., MongoDB, PostgreSQL). The secret key should also be stored securely (e.g., in environment variables).