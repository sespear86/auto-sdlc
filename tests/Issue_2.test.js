const { app } = require('../src/Issue_2');

describe('Issue_2 Tests', () => {
'Authentication System Tests', () => {
  // Mock setup
  let dataSource, passwordService, tokenService, userManager, authMiddleware;
  const secretKey = 'test-secret';

  beforeEach(() => {
    dataSource = new DataSource();
    passwordService = new PasswordService();
    tokenService = new TokenService(secretKey);
    userManager = new UserManager(tokenService, passwordService, dataSource);
    authMiddleware = new AuthenticationMiddleware(tokenService);
    
    // Reset mocks
    jest.clearAllMocks();
    bcrypt.hash.mockReset();
    bcrypt.compare.mockReset();
    jwt.sign.mockReset();
    jwt.verify.mockReset();
  });

  // ValidationError Tests
  describe('ValidationError', () => {
    it('should create error with field and message', () => {
      const error = new ValidationError('username', 'Invalid username');
      expect(error.field).toBe('username');
      expect(error.message).toBe('Invalid username');
    });
  });

  // User Tests
  describe('User', () => {
    it('should create user with correct properties', () => {
      const user = new User('testuser', 'test@example.com', 'hashedpass');
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.password_hash).toBe('hashedpass');
      expect(typeof user.user_id).toBe('number');
      expect(user.created_at).toBeInstanceOf(Date);
    });
  });

  // DataSource Tests
  describe('DataSource', () => {
    it('should save and find user by username', () => {
      const user = new User('testuser', 'test@example.com', 'hashedpass');
      dataSource.saveUser(user);
      const foundUser = dataSource.findUserByUsername('testuser');
      expect(foundUser).toEqual(user);
      expect(dataSource.findUserByUsername('nonexistent')).toBeNull();
    });
  });

  // PasswordService Tests
  describe('PasswordService', () => {
    it('should hash password', async () => {
      bcrypt.hash.mockResolvedValue('hashedpass');
      const hash = await passwordService.hashPassword('password123');
      expect(hash).toBe('hashedpass');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });

    it('should compare password with hash', async () => {
      bcrypt.compare.mockResolvedValue(true);
      const result = await passwordService.comparePassword('password123', 'hashedpass');
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpass');
    });
  });

  // TokenService Tests
  describe('TokenService', () => {
    it('should sign token', () => {
      const payload = { user_id: 123 };
      jwt.sign.mockReturnValue('token123');
      const token = tokenService.signToken(payload);
      expect(token).toBe('token123');
      expect(jwt.sign).toHaveBeenCalledWith(payload, secretKey, { expiresIn: '1h' });
    });

    it('should verify token', () => {
      const payload = { user_id: 123 };
      jwt.verify.mockReturnValue(payload);
      const decoded = tokenService.verifyToken('token123');
      expect(decoded).toEqual(payload);
      expect(jwt.verify).toHaveBeenCalledWith('token123', secretKey);
    });
  });

  // AuthenticationMiddleware Tests
  describe('AuthenticationMiddleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = { headers: {} };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    it('should reject request with no token', () => {
      authMiddleware.authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token', () => {
      req.headers.authorization = 'Bearer invalidtoken';
      jwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });
      authMiddleware.authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should authenticate valid token', () => {
      req.headers.authorization = 'Bearer validtoken';
      const payload = { user_id: 123 };
      jwt.verify.mockReturnValue(payload);
      authMiddleware.authenticateToken(req, res, next);
      expect(req.user).toEqual(payload);
      expect(next).toHaveBeenCalled();
    });
  });

  // UserManager Tests
  describe('UserManager', () => {
    describe('validateInput', () => {
      it('should validate input correctly', () => {
        const errors = userManager.validateInput({
          username: 'ab',
          email: 'invalid',
          password: '123'
        });
        expect(errors).toHaveLength(3);
        expect(errors[0].field).toBe('username');
        expect(errors[1].field).toBe('email');
        expect(errors[2].field).toBe('password');
      });
    });

    describe('registerUser', () => {
      it('should register new user', async () => {
        bcrypt.hash.mockResolvedValue('hashedpass');
        const user = await userManager.registerUser('testuser', 'test@example.com', 'password123');
        expect(user.username).toBe('testuser');
        expect(user.password_hash).toBe('hashedpass');
      });

      it('should throw error for existing username', async () => {
        await userManager.registerUser('testuser', 'test@example.com', 'password123');
        await expect(userManager.registerUser('testuser', 'test2@example.com', 'password123'))
          .rejects.toContainEqual(expect.objectContaining({
            field: 'username',
            message: 'Username already exists'
          }));
      });
    });

    describe('loginUser', () => {
      it('should login valid user', async () => {
        bcrypt.hash.mockResolvedValue('hashedpass');
        bcrypt.compare.mockResolvedValue(true);
        jwt.sign.mockReturnValue('token123');
        await userManager.registerUser('testuser', 'test@example.com', 'password123');
        const token = await userManager.loginUser('testuser', 'password123');
        expect(token).toBe('token123');
      });

      it('should reject invalid password', async () => {
        bcrypt.hash.mockResolvedValue('hashedpass');
        bcrypt.compare.mockResolvedValue(false);
        await userManager.registerUser('testuser', 'test@example.com', 'password123');
        await expect(userManager.loginUser('testuser', 'wrongpass'))
          .rejects.toContainEqual(expect.objectContaining({
            field: 'password',
            message: 'Invalid password'
          }));
      });
    });
  });

  // APIApplication Tests
  describe('APIApplication', () => {
    let app, request;
    const supertest = require('supertest');

    beforeEach(() => {
      app = new APIApplication(3000, secretKey);
      request = supertest(app.app);
    });

    it('should register user via POST /api/register', async () => {
      bcrypt.hash.mockResolvedValue('hashedpass');
      const res = await request
        .post('/api/register')
        .send({ username: 'testuser', email: 'test@example.com', password: 'password123' });
      expect(res.status).toBe(201);
      expect(res.body.username).toBe('testuser');
    });

    it('should login user via POST /api/login', async () => {
      bcrypt.hash.mockResolvedValue('hashedpass');
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('token123');
      await userManager.registerUser('testuser', 'test@example.com', 'password123');
      const res = await request
        .post('/api/login')
        .send({ username: 'testuser', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBe('token123');
    });

    it('should get profile with valid token via GET /api/profile', async () => {
      jwt.verify.mockReturnValue({ user_id: 123, username: 'testuser' });
      const res = await request
        .get('/api/profile')
        .set('Authorization', 'Bearer validtoken');
      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('testuser');
    });
  });
});
To run these tests, you'll need to:
Install dependencies:
bash
npm install --save-dev jest supertest
Save the tests in a file (e.g., auth.test.js) in a __tests__ folder or with a .test.js suffix.
Ensure the classes are exported from your main file (add module.exports = { ...all classes... }).
Run with:
bash
npx jest
Key features of these tests:
Uses Jest's describe and it for organization
Mocks bcrypt and jsonwebtoken to avoid real hashing/token operations
Tests each class independently
Includes API endpoint tests with supertest
Covers success and error cases
Verifies main functionality (registration, login, authentication)
Uses proper async/await handling
Resets mocks between tests to prevent state leakage
The tests verify:
Class instantiation and basic properties
Core functionality (hashing, token signing/verification)
Input validation
Authentication flow
API endpoint responses
Error handling
Note: You might need to adjust the import path and export structure based on your actual file organization. The tests assume all classes are exported from a single file.
});