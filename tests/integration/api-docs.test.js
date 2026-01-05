const request = require('supertest');
const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const app = require('../../src/index');
const { dbConnection } = require('../../src/config/database');
const { createTestUser, loginTestUser, createTestProduct } = require('../utils/testHelpers');

describe('API Documentation Integration Tests', () => {
  let server;
  let testUser;
  let adminUser;
  let userToken;
  let adminToken;
  let testProduct;

  beforeAll(async () => {
    server = app.listen(0);
    await dbConnection.connect();
  });

  afterAll(async () => {
    await dbConnection.disconnect();
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Clean up and create fresh test data
    await dbConnection.cleanup();
    
    testUser = await createTestUser('user@test.com', 'Test User');
    adminUser = await createTestUser('admin@test.com', 'Admin User', 'ADMIN');
    
    userToken = await loginTestUser(testUser.email, 'Password123!');
    adminToken = await loginTestUser(adminUser.email, 'Password123!');
    
    testProduct = await createTestProduct('Test Product', 99.99, 'Electronics');
  });

  describe('Documentation Accessibility', () => {
    it('should serve Swagger UI to unauthenticated users', async () => {
      const response = await request(app)
        .get('/api-docs')
        .expect(200);

      expect(response.text).toContain('swagger-ui');
      expect(response.text).toContain('Interview Backend API');
    });

    it('should serve OpenAPI spec to unauthenticated users', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200);

      expect(response.body.openapi).toBe('3.0.0');
      expect(response.body.info.title).toBe('Interview Backend API');
    });

    it('should provide API overview to unauthenticated users', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.documentation).toBeDefined();
    });

    it('should serve documentation under load', async () => {
      const requests = Array(20).fill().map(() => 
        request(app).get('/api-docs.json')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.openapi).toBe('3.0.0');
      });
    });
  });

  describe('Documentation Content Validation', () => {
    it('should document actual working endpoints', async () => {
      const specResponse = await request(app).get('/api-docs.json');
      const spec = specResponse.body;

      // Test that documented endpoints actually work
      const documentedPaths = Object.keys(spec.paths);
      
      for (const path of documentedPaths) {
        const operations = Object.keys(spec.paths[path]);
        
        for (const operation of operations) {
          // Skip endpoints that require special setup
          if (path.includes('avatar') && operation === 'post') continue;
          if (path.includes('avatar') && operation === 'delete') continue;
          
          // Test public endpoints
          if (path === '/api/users/register' && operation === 'post') {
            await request(app)
              .post(path)
              .send({
                email: 'docs-test@example.com',
                name: 'Docs Test User',
                password: 'Password123!'
              })
              .expect(201);
          }
          
          if (path === '/api/users/login' && operation === 'post') {
            await request(app)
              .post(path)
              .send({
                email: testUser.email,
                password: 'Password123!'
              })
              .expect(200);
          }
          
          if (path === '/health' && operation === 'get') {
            await request(app).get(path).expect(200);
          }
          
          if (path === '/api/products' && operation === 'get') {
            await request(app).get(path).expect(200);
          }
          
          if (path === '/api/products/search' && operation === 'get') {
            await request(app)
              .get(path)
              .query({ q: 'test' })
              .expect(200);
          }
        }
      }
    });

    it('should have accurate response schemas', async () => {
      // Test login response matches documented schema
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: testUser.email,
          password: 'Password123!'
        })
        .expect(200);

      const loginData = loginResponse.body;
      
      // Should match documented LoginResponse schema
      expect(loginData.success).toBe(true);
      expect(loginData.data).toBeDefined();
      expect(loginData.data.token).toBeDefined();
      expect(loginData.data.user).toBeDefined();
      expect(loginData.data.user.email).toBe(testUser.email);
      expect(loginData.timestamp).toBeDefined();
    });

    it('should have accurate error responses', async () => {
      // Test validation error matches documented schema
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'invalid-email',
          password: '123'
        })
        .expect(400);

      const errorData = response.body;
      
      // Should match documented Error schema
      expect(errorData.success).toBe(false);
      expect(errorData.message).toBeDefined();
      expect(errorData.errors).toBeDefined();
      expect(errorData.timestamp).toBeDefined();
    });

    it('should document authentication requirements correctly', async () => {
      // Test that documented protected endpoints actually require auth
      await request(app)
        .get('/api/users/profile')
        .expect(401);

      await request(app)
        .get('/api/users')
        .expect(401);

      await request(app)
        .post('/api/products')
        .send({
          name: 'New Product',
          price: 29.99,
          category: 'Test'
        })
        .expect(401);
    });

    it('should document rate limiting behavior', async () => {
      // Test rate limiting on auth endpoints (documented behavior)
      const promises = Array(10).fill().map(() =>
        request(app)
          .post('/api/users/login')
          .send({
            email: 'ratelimit@test.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(promises);
      
      // Should eventually hit rate limit (documented RateLimitError)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Swagger UI Functionality', () => {
    it('should load Swagger UI with all required assets', async () => {
      const response = await request(app)
        .get('/api-docs')
        .expect(200);

      const html = response.text;
      
      // Check for essential Swagger UI components
      expect(html).toContain('swagger-ui-container');
      expect(html).toContain('swagger-ui');
      expect(html).toContain('Try it out');
      expect(html).toContain('Authorize');
      
      // Check for custom configuration
      expect(html).toContain('Interview Backend API Documentation');
      expect(html).toContain('customCss');
    });

    it('should include API specification in Swagger UI', async () => {
      const response = await request(app)
        .get('/api-docs')
        .expect(200);

      const html = response.text;
      
      // Should embed the API specification
      expect(html).toContain('openapi');
      expect(html).toContain('3.0.0');
      expect(html).toContain('Interview Backend API');
    });

    should('have working authorization button', async () => {
      const response = await request(app)
        .get('/api-docs')
        .expect(200);

      const html = response.text;
      
      // Should have authorization functionality
      expect(html).toContain('Authorize');
      expect(html).toContain('bearerAuth');
      expect(html).toContain('JWT');
    });
  });

  describe('Documentation Integration with Features', () => {
    it('should document file upload endpoints correctly', async () => {
      const specResponse = await request(app).get('/api-docs.json');
      const spec = specResponse.body;

      // Check avatar upload documentation
      const avatarPath = spec.paths['/api/users/avatar'];
      expect(avatarPath).toBeDefined();
      expect(avatarPath.post).toBeDefined();
      expect(avatarPath.post.tags).toContain('Upload');
      expect(avatarPath.post.requestBody).toBeDefined();
      expect(avatarPath.post.requestBody.content['multipart/form-data']).toBeDefined();
    });

    it('should document pagination correctly', async () => {
      // Test paginated response matches documentation
      const response = await request(app)
        .get('/api/products')
        .query({ page: 1, limit: 5 })
        .expect(200);

      const data = response.body;
      
      // Should match documented PaginatedResponse schema
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.items).toBeDefined();
      expect(data.data.pagination).toBeDefined();
      expect(data.data.pagination.page).toBe(1);
      expect(data.data.pagination.limit).toBe(5);
      expect(data.timestamp).toBeDefined();
    });

    it('should document search functionality correctly', async () => {
      const specResponse = await request(app).get('/api-docs.json');
      const spec = specResponse.body;

      // Check search endpoint documentation
      const searchPath = spec.paths['/api/products/search'];
      expect(searchPath).toBeDefined();
      expect(searchPath.get).toBeDefined();
      expect(searchPath.get.parameters).toBeDefined();
      
      const queryParam = searchPath.get.parameters.find(p => p.name === 'q');
      expect(queryParam).toBeDefined();
      expect(queryParam.required).toBe(true);
    });

    it('should document filtering correctly', async () => {
      const specResponse = await request(app).get('/api-docs.json');
      const spec = specResponse.body;

      // Check category filter documentation
      const categoryPath = spec.paths['/api/products/category/{category}'];
      expect(categoryPath).toBeDefined();
      expect(categoryPath.get).toBeDefined();
      
      const categoryParam = categoryPath.get.parameters.find(p => p.name === 'category');
      expect(categoryParam).toBeDefined();
      expect(categoryParam.required).toBe(true);
      expect(categoryParam.in).toBe('path');
    });
  });

  describe('Documentation Performance', () => {
    it('should serve documentation quickly under load', async () => {
      const startTime = Date.now();
      
      const requests = Array(50).fill().map(() => 
        request(app).get('/api-docs.json')
      );

      await Promise.all(requests);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should handle 50 requests within 2 seconds
      expect(totalTime).toBeLessThan(2000);
    });

    it('should maintain documentation availability during high load', async () => {
      // Generate high load on API endpoints
      const apiRequests = Array(100).fill().map(() =>
        request(app).get('/api/products')
      );

      // Simultaneously request documentation
      const docRequests = Array(10).fill().map(() =>
        request(app).get('/api-docs.json')
      );

      const [apiResponses, docResponses] = await Promise.all([
        Promise.all(apiRequests),
        Promise.all(docRequests)
      ]);

      // Documentation should still be available
      docResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.openapi).toBe('3.0.0');
      });
    });

    it('should handle concurrent documentation requests', async () => {
      const concurrentRequests = Array(20).fill().map(() =>
        request(app).get('/api-docs')
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.text).toContain('swagger-ui');
      });
    });
  });

  describe('Documentation Security', () => {
    it('should not expose sensitive information', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200);

      const spec = response.body;
      
      // Should not contain sensitive information
      const specString = JSON.stringify(spec);
      expect(specString).not.toContain('password');
      expect(specString).not.toContain('secret');
      expect(specString).not.toContain('private_key');
      expect(specString).not.toContain('database');
    });

    it('should have proper CORS headers for documentation', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle malicious requests gracefully', async () => {
      // Test with malicious headers
      await request(app)
        .get('/api-docs.json')
        .set('User-Agent', '<script>alert("xss")</script>')
        .expect(200);

      // Test with malicious query parameters
      await request(app)
        .get('/api-docs.json?malicious=<script>alert("xss")</script>')
        .expect(200);

      // Test with extremely long path
      await request(app)
        .get('/api-docs.json/' + 'a'.repeat(1000))
        .expect(404);
    });
  });

  describe('Documentation Maintenance', () => {
    it('should reflect API changes', async () => {
      // Get current documentation
      const specResponse = await request(app).get('/api-docs.json');
      const spec = specResponse.body;

      // Documentation should include all current endpoints
      const documentedPaths = Object.keys(spec.paths);
      
      // Should include authentication endpoints
      expect(documentedPaths).toContain('/api/users/register');
      expect(documentedPaths).toContain('/api/users/login');
      
      // Should include user endpoints
      expect(documentedPaths).toContain('/api/users/profile');
      expect(documentedPaths).toContain('/api/users/avatar');
      
      // Should include product endpoints
      expect(documentedPaths).toContain('/api/products');
      expect(documentedPaths).toContain('/api/products/search');
      
      // Should include health endpoints
      expect(documentedPaths).toContain('/health');
    });

    it('should have consistent versioning', async () => {
      const specResponse = await request(app).get('/api-docs.json');
      const apiResponse = await request(app).get('/api');

      const specVersion = specResponse.body.info.version;
      const apiVersion = apiResponse.body.version;

      expect(specVersion).toBe(apiVersion);
      expect(specVersion).toBe('1.0.0');
    });

    it('should have working examples', async () => {
      // Test that examples in documentation work
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: testUser.email,
          password: 'Password123!'
        })
        .expect(200);

      // Response should match documented example structure
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();
      expect(loginResponse.body.data.user).toBeDefined();
      expect(loginResponse.body.timestamp).toBeDefined();
    });
  });
});
