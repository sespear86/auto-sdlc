// Users class
class Users {
    constructor(username, email, password_hash) {
        this.user_id = Date.now(); // Simulated auto-increment PK
        this.username = username;
        this.email = email;
        this.password_hash = password_hash;
        this.created_at = new Date();
    }
}

// Posts class
class Posts {
    constructor(user_id, title, content, status = 'draft') {
        this.post_id = Date.now(); // Simulated auto-increment PK
        this.user_id = user_id; // FK to Users
        this.title = title;
        this.content = content;
        this.created_at = new Date();
        this.updated_at = new Date();
        this.status = status; // 'draft' or 'published'
    }
}

// Categories class
class Categories {
    constructor(name, description) {
        this.category_id = Date.now(); // Simulated auto-increment PK
        this.name = name;
        this.description = description;
    }
}

// Post_Categories class (junction table)
class Post_Categories {
    constructor(post_id, category_id) {
        this.post_id = post_id; // FK to Posts, part of composite PK
        this.category_id = category_id; // FK to Categories, part of composite PK
    }
}

// Comments class
class Comments {
    constructor(post_id, user_id, content) {
        this.comment_id = Date.now(); // Simulated auto-increment PK
        this.post_id = post_id; // FK to Posts
        this.user_id = user_id; // FK to Users
        this.content = content;
        this.created_at = new Date();
    }
}

// Database simulation class
class BlogDatabase {
    constructor() {
        this.users = new Map();
        this.posts = new Map();
        this.categories = new Map();
        this.post_categories = new Map(); // Key: `${post_id}-${category_id}`
        this.comments = new Map();
    }

    // Users methods
    addUser(username, email, password_hash) {
        if (this.users.size > 0) {
            for (let user of this.users.values()) {
                if (user.username === username) throw new Error('Username must be unique');
                if (user.email === email) throw new Error('Email must be unique');
            }
        }
        const user = new Users(username, email, password_hash);
        this.users.set(user.user_id, user);
        return user;
    }

    // Posts methods
    addPost(user_id, title, content, status) {
        if (!this.users.has(user_id)) throw new Error('User does not exist');
        const post = new Posts(user_id, title, content, status);
        this.posts.set(post.post_id, post);
        return post;
    }

    // Categories methods
    addCategory(name, description) {
        if (this.categories.size > 0) {
            for (let category of this.categories.values()) {
                if (category.name === name) throw new Error('Category name must be unique');
            }
        }
        const category = new Categories(name, description);
        this.categories.set(category.category_id, category);
        return category;
    }

    // Post_Categories methods
    linkPostToCategory(post_id, category_id) {
        if (!this.posts.has(post_id)) throw new Error('Post does not exist');
        if (!this.categories.has(category_id)) throw new Error('Category does not exist');
        const key = `${post_id}-${category_id}`;
        if (this.post_categories.has(key)) return; // Already linked
        const link = new Post_Categories(post_id, category_id);
        this.post_categories.set(key, link);
    }

    // Comments methods
    addComment(post_id, user_id, content) {
        if (!this.posts.has(post_id)) throw new Error('Post does not exist');
        if (!this.users.has(user_id)) throw new Error('User does not exist');
        const comment = new Comments(post_id, user_id, content);
        this.comments.set(comment.comment_id, comment);
        return comment;
    }

    // Simulate ON DELETE CASCADE
    deleteUser(user_id) {
        if (!this.users.has(user_id)) return;
        
        // Delete user's posts and related data
        for (let [post_id, post] of this.posts) {
            if (post.user_id === user_id) {
                this.deletePost(post_id);
            }
        }
        
        // Delete user's comments
        for (let [comment_id, comment] of this.comments) {
            if (comment.user_id === user_id) {
                this.comments.delete(comment_id);
            }
        }
        
        this.users.delete(user_id);
    }

    deletePost(post_id) {
        if (!this.posts.has(post_id)) return;
        
        // Delete post's comments
        for (let [comment_id, comment] of this.comments) {
            if (comment.post_id === post_id) {
                this.comments.delete(comment_id);
            }
        }
        
        // Delete post's category links
        for (let [key, link] of this.post_categories) {
            if (link.post_id === post_id) {
                this.post_categories.delete(key);
            }
        }
        
        this.posts.delete(post_id);
    }

    // Query methods
    getPostsByUser(user_id) {
        return Array.from(this.posts.values()).filter(post => post.user_id === user_id);
    }

    getCommentsByPost(post_id) {
        return Array.from(this.comments.values()).filter(comment => comment.post_id === post_id);
    }

    getCategoriesByPost(post_id) {
        const categoryIds = Array.from(this.post_categories.values())
            .filter(link => link.post_id === post_id)
            .map(link => link.category_id);
        return Array.from(this.categories.values())
            .filter(category => categoryIds.includes(category.category_id));
    }
}

// Usage example
const db = new BlogDatabase();

// Add sample data
const user = db.addUser('john_doe', 'john@example.com', 'hashed_password');
const post = db.addPost(user.user_id, 'My First Post', 'Hello, world!', 'published');
const category = db.addCategory('Tech', 'Technology-related posts');
db.linkPostToCategory(post.post_id, category.category_id);
const comment = db.addComment(post.post_id, user.user_id, 'Great post!');

// Test relationships
console.log('User posts:', db.getPostsByUser(user.user_id));
console.log('Post categories:', db.getCategoriesByPost(post.post_id));
console.log('Post comments:', db.getCommentsByPost(post.post_id));

// Test cascade delete
db.deleteUser(user.user_id);
console.log('Users after delete:', db.users.size); // 0
console.log('Posts after delete:', db.posts.size); // 0
console.log('Comments after delete:', db.comments.size); // 0
This implementation:
Defines all classes:
Users, Posts, Categories, Post_Categories, Comments with their specified attributes
Uses simulated primary keys (Date.now()) and enforces uniqueness where specified
Implements relationships:
One-to-Many: Users to Posts, Users to Comments, Posts to Comments
Many-to-Many: Posts to Categories via Post_Categories
Features:
Enforces foreign key constraints (checks existence before linking)
Implements ON DELETE CASCADE for Users (deletes related Posts and Comments)
Simulates unique constraints for username, email, and category name
Provides query methods to demonstrate relationships
Uses a BlogDatabase class to:
Manage all entities in memory using Maps
Handle CRUD operations
Enforce schema constraints
Note: This is an in-memory simulation. For a production system:
Use a real database (e.g., PostgreSQL) with proper SQL schema
Replace Date.now() with auto-incrementing IDs
Use an ORM (e.g., Sequelize) or raw SQL for database operations
Add proper error handling and transactions
Implement password hashing for security
The code demonstrates the schema structure and relationships while keeping it executable in a Node.js environment without external dependencies.