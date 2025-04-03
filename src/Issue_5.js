const express = require('express');
const redis = require('redis');

// Post class
class Post {
    constructor(id, title) {
        this.id = id;
        this.title = title;
    }
}

// DataSource class (simulated database)
class DataSource {
    constructor() {
        this.posts = [
            new Post(1, "First Post"),
            new Post(2, "Second Post")
        ];
    }

    fetchPosts() {
        // Simulate database query
        return this.posts;
    }

    savePost(post) {
        this.posts.push(post);
    }
}

// RedisClient class
class RedisClient {
    constructor(url) {
        this.url = url;
        this.client = redis.createClient({ url });
    }

    async connect() {
        await this.client.connect();
    }

    async get(key) {
        return await this.client.get(key);
    }

    async setEx(key, ttl, value) {
        await this.client.setEx(key, ttl, value);
    }

    async del(key) {
        await this.client.del(key);
    }
}

// CacheMiddleware class
class CacheMiddleware {
    constructor(redisClient, cacheTTL = 60) { // Default TTL: 60 seconds
        this.redisClient = redisClient;
        this.cacheTTL = cacheTTL;
    }

    generateCacheKey(req) {
        return `${req.method}:${req.url}`;
    }

    async handleRequest(req, res, next) {
        const cacheKey = this.generateCacheKey(req);

        try {
            const cachedData = await this.redisClient.get(cacheKey);
            if (cachedData) {
                console.log('Cache hit');
                return res.json(JSON.parse(cachedData));
            }

            // Store original send method
            const originalSend = res.send;
            res.send = async (body) => {
                // Cache the response before sending
                await this.redisClient.setEx(cacheKey, this.cacheTTL, JSON.stringify(body));
                console.log('Cache miss - storing result');
                res.send = originalSend; // Restore original method
                res.send(body);
            };
            next();
        } catch (err) {
            console.error('Cache error:', err);
            next(); // Proceed without caching on error
        }
    }
}

// APIApplication class
class APIApplication {
    constructor(port) {
        this.port = port;
        this.app = express();
        this.app.use(express.json());

        this.redisClient = new RedisClient('redis://localhost:6379');
        this.cacheMiddleware = new CacheMiddleware(this.redisClient);
        this.dataSource = new DataSource();

        this.registerEndpoints();
    }

    async start() {
        await this.redisClient.connect();
        this.app.listen(this.port, () => {
            console.log(`Server running on port ${this.port}`);
        });
    }

    registerEndpoint(endpoint, handler) {
        this.app[endpoint.method](endpoint.path, handler);
    }

    registerEndpoints() {
        // GET /api/posts - cached endpoint
        this.registerEndpoint(
            { method: 'get', path: '/api/posts' },
            [
                this.cacheMiddleware.handleRequest.bind(this.cacheMiddleware),
                (req, res) => {
                    const posts = this.dataSource.fetchPosts();
                    res.json(posts);
                }
            ]
        );

        // POST /api/posts - invalidates cache
        this.registerEndpoint(
            { method: 'post', path: '/api/posts' },
            async (req, res) => {
                const { title } = req.body;
                const newPost = new Post(Date.now(), title);
                this.dataSource.savePost(newPost);

                // Invalidate cache for GET /api/posts
                const cacheKey = 'GET:/api/posts';
                await this.redisClient.del(cacheKey);

                res.status(201).json(newPost);
            }
        );
    }
}

// Usage example
const app = new APIApplication(3000);
app.start();

// Test with:
// GET /api/posts - should cache response
// POST /api/posts {"title": "New Post"} - should invalidate cache
This implementation:
Uses required libraries:
Express for the API server
redis for caching (requires Redis server running locally)
Implements all classes:
APIApplication: Manages Express server and endpoints
CacheMiddleware: Handles caching logic
RedisClient: Wraps Redis operations
DataSource: Simulates a database
Post: Represents blog post data
Follows relationships:
APIApplication uses CacheMiddleware and depends on RedisClient
CacheMiddleware interacts with RedisClient
APIApplication queries DataSource
DataSource returns Posts
Features:
Caches GET /api/posts responses with a TTL (60 seconds by default)
Generates cache keys based on method and URL
Invalidates cache on POST /api/posts
Handles cache misses by fetching from DataSource and storing results
To run:
Install Redis locally and start the server (redis-server)
Install dependencies: npm install express redis
Save as a .js file and run with Node.js
Test with tools like Postman:
GET /api/posts (first call: miss, subsequent: hit)
POST /api/posts {"title": "New Post"} (invalidates cache)
Notes:
The Redis URL assumes a local instance (redis://localhost:6379). Adjust for your setup.
The DataSource is in-memory for simplicity; replace with a real database in production.
Error handling is basic; enhance with try-catch blocks and logging for production.
The cache TTL is set to 60 seconds but can be adjusted via the CacheMiddleware constructor.