const { app } = require('../src/Issue_5');

describe('Issue_5 Tests', () => {
'Post Class', () => {
  it('should create a post with id and title', () => {
    const post = new Post(1, 'Test Post');
    expect(post.id).toBe(1);
    expect(post.title).toBe('Test Post');
  });
});

describe('DataSource Class', () => {
  let dataSource;

  beforeEach(() => {
    dataSource = new DataSource();
  });

  it('should initialize with default posts', () => {
    expect(dataSource.posts).toHaveLength(2);
    expect(dataSource.posts[0]).toBeInstanceOf(Post);
  });

  it('should fetch posts', () => {
    const posts = dataSource.fetchPosts();
    expect(posts).toEqual(dataSource.posts);
  });

  it('should save a new post', () => {
    const newPost = new Post(3, 'New Post');
    dataSource.savePost(newPost);
    expect(dataSource.posts).toHaveLength(3);
    expect(dataSource.posts[2]).toBe(newPost);
  });
});

describe('RedisClient Class', () => {
  let redisClient;

  beforeEach(() => {
    redisClient = new RedisClient('redis://localhost:6379');
    redis.createClient.mockClear();
  });

  it('should initialize with correct URL', () => {
    expect(redisClient.url).toBe('redis://localhost:6379');
    expect(redis.createClient).toHaveBeenCalledWith({ url: 'redis://localhost:6379' });
  });

  it('should connect to Redis', async () => {
    await redisClient.connect();
    expect(redisClient.client.connect).toHaveBeenCalled();
  });

  it('should get value from Redis', async () => {
    redisClient.client.get.mockResolvedValue('test');
    const result = await redisClient.get('key');
    expect(result).toBe('test');
    expect(redisClient.client.get).toHaveBeenCalledWith('key');
  });

  it('should set value with expiration', async () => {
    await redisClient.setEx('key', 60, 'value');
    expect(redisClient.client.setEx).toHaveBeenCalledWith('key', 60, 'value');
  });

  it('should delete key from Redis', async () => {
    await redisClient.del('key');
    expect(redisClient.client.del).toHaveBeenCalledWith('key');
  });
});

describe('CacheMiddleware Class', () => {
  let cacheMiddleware;
  let mockRedisClient;
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockRedisClient = new RedisClient('redis://localhost:6379');
    cacheMiddleware = new CacheMiddleware(mockRedisClient, 60);
    mockReq = { method: 'GET', url: '/api/posts' };
    mockRes = { json: jest.fn(), send: jest.fn() };
    mockNext = jest.fn();
  });

  it('should generate correct cache key', () => {
    const key = cacheMiddleware.generateCacheKey(mockReq);
    expect(key).toBe('GET:/api/posts');
  });

  it('should return cached data on cache hit', async () => {
    mockRedisClient.get.mockResolvedValue(JSON.stringify({ data: 'cached' }));
    await cacheMiddleware.handleRequest(mockReq, mockRes, mockNext);
    expect(mockRes.json).toHaveBeenCalledWith({ data: 'cached' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should proceed to next middleware on cache miss and cache response', async () => {
    mockRedisClient.get.mockResolvedValue(null);
    const originalSend = mockRes.send;
    await cacheMiddleware.handleRequest(mockReq, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    // Simulate response
    await mockRes.send({ data: 'new' });
    expect(mockRedisClient.setEx).toHaveBeenCalledWith(
      'GET:/api/posts',
      60,
      JSON.stringify({ data: 'new' })
    );
    expect(mockRes.send).toBe(originalSend);
  });

  it('should proceed to next middleware on cache error', async () => {
    mockRedisClient.get.mockRejectedValue(new Error('Redis error'));
    await cacheMiddleware.handleRequest(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});

describe('APIApplication Class', () => {
  let apiApp;
  let mockRedisClient;

  beforeEach(() => {
    mockRedisClient = new RedisClient('redis://localhost:6379');
    jest.spyOn(APIApplication.prototype, 'start').mockImplementation(() => {});
    apiApp = new APIApplication(3000);
    apiApp.redisClient = mockRedisClient; // Override for testing
  });

  it('should initialize with correct port and middleware', () => {
    expect(apiApp.port).toBe(3000);
    expect(apiApp.app).toBeInstanceOf(Function); // Express app
    expect(apiApp.cacheMiddleware).toBeInstanceOf(CacheMiddleware);
    expect(apiApp.dataSource).toBeInstanceOf(DataSource);
  });

  it('should handle GET /api/posts', async () => {
    const mockReq = { method: 'get' };
    const mockRes = { json: jest.fn() };
    const handler = apiApp.app._router.stack.find(layer => 
      layer.route?.path === '/api/posts' && layer.route?.methods.get
    ).route.stack[1].handle;
    
    await handler(mockReq, mockRes);
    expect(mockRes.json).toHaveBeenCalledWith([
      { id: 1, title: 'First Post' },
      { id: 2, title: 'Second Post' },
    ]);
  });

  it('should handle POST /api/posts and invalidate cache', async () => {
    const mockReq = { method: 'post', body: { title: 'New Post' } };
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const handler = apiApp.app._router.stack.find(layer => 
      layer.route?.path === '/api/posts' && layer.route?.methods.post
    ).route.stack[0].handle;
    
    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRedisClient.del).toHaveBeenCalledWith('GET:/api/posts');
    expect(apiApp.dataSource.posts).toHaveLength(3);
  });
});

// Cleanup
afterAll(() => {
  jest.restoreAllMocks();
});
Notes on the Test Cases:
Setup:
Mocks the redis module to avoid actual Redis connections during testing.
Uses beforeEach to reset state between tests where needed.
Coverage:
Tests each class independently (unit tests).
Verifies main functionality:
Post: Basic construction
DataSource: Post management
RedisClient: Redis operations
CacheMiddleware: Cache hit/miss/error scenarios
APIApplication: Endpoint registration and handling
Mocks:
Mocks Redis client methods (connect, get, setEx, del).
Mocks Express request/response objects for middleware and endpoint testing.
Overrides start method to prevent actual server startup.
Assertions:
Uses Jest's expect for property checks, method calls, and behavior verification.
Tests both success and error paths where applicable.
Running the Tests:
Save this in a file named your-file-name.test.js.
Ensure the original code exports the classes: 
javascript
module.exports = { Post, DataSource, RedisClient, CacheMiddleware, APIApplication };
Install dependencies: npm install --save-dev jest @jest/globals.
Run with: npx jest your-file-name.test.js.
Limitations:
Doesn't test actual HTTP requests (would require supertest for integration testing).
Assumes Redis mock behavior; real Redis interactions might need additional testing.
Simplifies some Express routing tests by accessing handlers directly.
These tests provide good coverage of the core logic while maintaining isolation through mocks. For production, you might want to add integration tests with a real Redis instance and HTTP requests.
});