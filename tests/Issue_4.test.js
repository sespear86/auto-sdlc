const { app } = require('../src/Issue_4');

describe('Issue_4 Tests', () => {
'BlogDatabase', () => {
  let db;

  beforeEach(() => {
    db = new BlogDatabase();
  });

  // Users Tests
  describe('Users', () => {
    it('should add a new user successfully', () => {
      const user = db.addUser('test_user', 'test@example.com', 'hashed_pass');
      expect(user).toBeInstanceOf(Users);
      expect(user.username).toBe('test_user');
      expect(user.email).toBe('test@example.com');
      expect(user.password_hash).toBe('hashed_pass');
      expect(db.users.size).toBe(1);
    });

    it('should throw error for duplicate username', () => {
      db.addUser('test_user', 'test1@example.com', 'hashed_pass');
      expect(() => db.addUser('test_user', 'test2@example.com', 'hashed_pass')).toThrow('Username must be unique');
    });

    it('should throw error for duplicate email', () => {
      db.addUser('test_user1', 'test@example.com', 'hashed_pass');
      expect(() => db.addUser('test_user2', 'test@example.com', 'hashed_pass')).toThrow('Email must be unique');
    });
  });

  // Posts Tests
  describe('Posts', () => {
    it('should add a new post successfully', () => {
      const user = db.addUser('test_user', 'test@example.com', 'hashed_pass');
      const post = db.addPost(user.user_id, 'Test Post', 'Test Content', 'published');
      expect(post).toBeInstanceOf(Posts);
      expect(post.user_id).toBe(user.user_id);
      expect(post.title).toBe('Test Post');
      expect(post.status).toBe('published');
      expect(db.posts.size).toBe(1);
    });

    it('should throw error if user does not exist', () => {
      expect(() => db.addPost(999, 'Test Post', 'Test Content')).toThrow('User does not exist');
    });
  });

  // Categories Tests
  describe('Categories', () => {
    it('should add a new category successfully', () => {
      const category = db.addCategory('Tech', 'Tech posts');
      expect(category).toBeInstanceOf(Categories);
      expect(category.name).toBe('Tech');
      expect(category.description).toBe('Tech posts');
      expect(db.categories.size).toBe(1);
    });

    it('should throw error for duplicate category name', () => {
      db.addCategory('Tech', 'Tech posts');
      expect(() => db.addCategory('Tech', 'More tech posts')).toThrow('Category name must be unique');
    });
  });

  // Post_Categories Tests
  describe('Post_Categories', () => {
    it('should link post to category successfully', () => {
      const user = db.addUser('test_user', 'test@example.com', 'hashed_pass');
      const post = db.addPost(user.user_id, 'Test Post', 'Test Content');
      const category = db.addCategory('Tech', 'Tech posts');
      db.linkPostToCategory(post.post_id, category.category_id);
      expect(db.post_categories.size).toBe(1);
      const link = db.post_categories.get(`${post.post_id}-${category.category_id}`);
      expect(link).toBeInstanceOf(Post_Categories);
    });

    it('should throw error if post does not exist', () => {
      const category = db.addCategory('Tech', 'Tech posts');
      expect(() => db.linkPostToCategory(999, category.category_id)).toThrow('Post does not exist');
    });

    it('should throw error if category does not exist', () => {
      const user = db.addUser('test_user', 'test@example.com', 'hashed_pass');
      const post = db.addPost(user.user_id, 'Test Post', 'Test Content');
      expect(() => db.linkPostToCategory(post.post_id, 999)).toThrow('Category does not exist');
    });
  });

  // Comments Tests
  describe('Comments', () => {
    it('should add a new comment successfully', () => {
      const user = db.addUser('test_user', 'test@example.com', 'hashed_pass');
      const post = db.addPost(user.user_id, 'Test Post', 'Test Content');
      const comment = db.addComment(post.post_id, user.user_id, 'Great post!');
      expect(comment).toBeInstanceOf(Comments);
      expect(comment.post_id).toBe(post.post_id);
      expect(comment.user_id).toBe(user.user_id);
      expect(comment.content).toBe('Great post!');
      expect(db.comments.size).toBe(1);
    });

    it('should throw error if post does not exist', () => {
      const user = db.addUser('test_user', 'test@example.com', 'hashed_pass');
      expect(() => db.addComment(999, user.user_id, 'Comment')).toThrow('Post does not exist');
    });

    it('should throw error if user does not exist', () => {
      const user = db.addUser('test_user', 'test@example.com', 'hashed_pass');
      const post = db.addPost(user.user_id, 'Test Post', 'Test Content');
      expect(() => db.addComment(post.post_id, 999, 'Comment')).toThrow('User does not exist');
    });
  });

  // Cascade Delete Tests
  describe('Cascade Delete', () => {
    it('should delete user and cascade to posts and comments', () => {
      const user = db.addUser('test_user', 'test@example.com', 'hashed_pass');
      const post = db.addPost(user.user_id, 'Test Post', 'Test Content');
      db.addComment(post.post_id, user.user_id, 'Great post!');
      const category = db.addCategory('Tech', 'Tech posts');
      db.linkPostToCategory(post.post_id, category.category_id);

      db.deleteUser(user.user_id);
      expect(db.users.size).toBe(0);
      expect(db.posts.size).toBe(0);
      expect(db.comments.size).toBe(0);
      expect(db.post_categories.size).toBe(0);
      expect(db.categories.size).toBe(1); // Categories remain
    });

    it('should delete post and cascade to comments and post_categories', () => {
      const user = db.addUser('test_user', 'test@example.com', 'hashed_pass');
      const post = db.addPost(user.user_id, 'Test Post', 'Test Content');
      db.addComment(post.post_id, user.user_id, 'Great post!');
      const category = db.addCategory('Tech', 'Tech posts');
      db.linkPostToCategory(post.post_id, category.category_id);

      db.deletePost(post.post_id);
      expect(db.posts.size).toBe(0);
      expect(db.comments.size).toBe(0);
      expect(db.post_categories.size).toBe(0);
      expect(db.users.size).toBe(1); // User remains
      expect(db.categories.size).toBe(1); // Category remains
    });
  });

  // Query Methods Tests
  describe('Query Methods', () => {
    it('should get posts by user', () => {
      const user = db.addUser('test_user', 'test@example.com', 'hashed_pass');
      const post1 = db.addPost(user.user_id, 'Post 1', 'Content 1');
      const post2 = db.addPost(user.user_id, 'Post 2', 'Content 2');
      const posts = db.getPostsByUser(user.user_id);
      expect(posts.length).toBe(2);
      expect(posts).toContain(post1);
      expect(posts).toContain(post2);
    });

    it('should get comments by post', () => {
      const user = db.addUser('test_user', 'test@example.com', 'hashed_pass');
      const post = db.addPost(user.user_id, 'Test Post', 'Test Content');
      const comment1 = db.addComment(post.post_id, user.user_id, 'Comment 1');
      const comment2 = db.addComment(post.post_id, user.user_id, 'Comment 2');
      const comments = db.getCommentsByPost(post.post_id);
      expect(comments.length).toBe(2);
      expect(comments).toContain(comment1);
      expect(comments).toContain(comment2);
    });

    it('should get categories by post', () => {
      const user = db.addUser('test_user', 'test@example.com', 'hashed_pass');
      const post = db.addPost(user.user_id, 'Test Post', 'Test Content');
      const category1 = db.addCategory('Tech', 'Tech posts');
      const category2 = db.addCategory('News', 'News posts');
      db.linkPostToCategory(post.post_id, category1.category_id);
      db.linkPostToCategory(post.post_id, category2.category_id);
      const categories = db.getCategoriesByPost(post.post_id);
      expect(categories.length).toBe(2);
      expect(categories).toContain(category1);
      expect(categories).toContain(category2);
    });
  });
});
Notes on the Test Suite:
Structure: The tests are organized using describe blocks for each major component (Users, Posts, Categories, etc.), making it easy to read and maintain.
Setup: beforeEach resets the BlogDatabase instance before each test to ensure isolation.
Coverage: Tests cover:
Basic CRUD operations for each entity.
Validation (e.g., unique constraints for username, email, category name).
Foreign key constraints (e.g., user/post existence checks).
Cascade delete behavior for deleteUser and deletePost.
Query methods (getPostsByUser, getCommentsByPost, getCategoriesByPost).
Assertions: Uses Jest's expect to verify object instances, properties, and collection sizes.
Error Handling: Tests error cases with toThrow to ensure proper exception throwing.
No Mocks: Since this is an in-memory implementation, no external dependencies (e.g., a real database) need mocking. The tests interact directly with the classes.
Running the Tests:
To run these tests, ensure you have Jest installed (npm install --save-dev jest), and place the test file alongside your implementation file (adjust the require path as needed). Then run:
bash
npx jest blogDatabase.test.js
This test suite provides good coverage of the main functionality while adhering to Jest best practices. Let me know if you'd like additional test cases or modifications!
});