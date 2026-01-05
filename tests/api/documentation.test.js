const request = require('supertest');
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const { app, request: supertest } = require('../api-setup');

describe('API Documentation Tests', () => {
  let server;

  beforeAll(async () => {
    // Start test server
    server = app.listen(0); // Use random available port
  });

  afterAll(async () => {
    // Cleanup
    if (server) {
      server.close();
    }
  });

  describe('Documentation Endpoints', () => {
    it('should serve Swagger UI documentation', async () => {
      const response = await supertest(app)
        .get('/api-docs')
        .expect(200);

      expect(response.text).toContain('swagger-ui');
      expect(response.text).toContain('Interview Backend API');
    });

    it('should serve OpenAPI JSON specification', async () => {
      const response = await supertest(app)
        .get('/api-docs.json')
        .expect(200);

      const spec = response.body;
      
      // Validate OpenAPI structure
      expect(spec.openapi).toBe('3.0.0');
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBe('Interview Backend API');
      expect(spec.info.version).toBe('1.0.0');
      expect(spec.paths).toBeDefined();
      expect(spec.components).toBeDefined();
    });

    it('should provide API overview endpoint', async () => {
      const response = await supertest(app)
        .get('/api')
        .expect(200);

      const apiInfo = response.body;
      
      expect(apiInfo.success).toBe(true);
      expect(apiInfo.message).toBe('Interview Backend API');
      expect(apiInfo.version).toBe('1.0.0');
      expect(apiInfo.documentation).toBeDefined();
      expect(apiInfo.documentation.swagger).toContain('/api-docs');
      expect(apiInfo.documentation.json).toContain('/api-docs.json');
      expect(apiInfo.endpoints).toBeDefined();
      expect(apiInfo.features).toBeDefined();
    });

    it('should provide swagger information endpoint', async () => {
      const response = await supertest(app)
        .get('/api/swagger-info')
        .expect(200);

      const swaggerInfo = response.body;
      
      expect(swaggerInfo.success).toBe(true);
      expect(swaggerInfo.data.title).toBe('Interview Backend API');
      expect(swaggerInfo.data.version).toBe('1.0.0');
      expect(swaggerInfo.data.endpoints).toBeDefined();
      expect(swaggerInfo.data.features).toBeDefined();
    });
  });

  describe('OpenAPI Specification Validation', () => {
    it('should have valid authentication scheme', async () => {
      const response = await supertest(app)
        .get('/api-docs.json')
        .expect(200);

      const spec = response.body;
      
      expect(spec.components.securitySchemes).toBeDefined();
      expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
      expect(spec.components.securitySchemes.bearerAuth.type).toBe('http');
      expect(spec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
      expect(spec.components.securitySchemes.bearerAuth.bearerFormat).toBe('JWT');
    });

    it('should have all required schemas', async () => {
      const response = await supertest(app)
        .get('/api-docs.json')
        .expect(200);

      const spec = response.body;
      const schemas = spec.components.schemas;
      
      // User schemas
      expect(schemas.User).toBeDefined();
      expect(schemas.Profile).toBeDefined();
      expect(schemas.LoginRequest).toBeDefined();
      expect(schemas.LoginResponse).toBeDefined();
      expect(schemas.RegisterRequest).toBeDefined();
      
      // Product schemas
      expect(schemas.Product).toBeDefined();
      expect(schemas.ProductRequest).toBeDefined();
      
      // Common schemas
      expect(schemas.ApiResponse).toBeDefined();
      expect(schemas.PaginatedResponse).toBeDefined();
      expect(schemas.Pagination).toBeDefined();
      expect(schemas.Error).toBeDefined();
      expect(schemas.HealthCheck).toBeDefined();
    });

    it('should have all required response templates', async () => {
      const response = await supertest(app)
        .get('/api-docs.json')
        .expect(200);

      const spec = response.body;
      const responses = spec.components.responses;
      
      expect(responses.UnauthorizedError).toBeDefined();
      expect(responses.ForbiddenError).toBeDefined();
      expect(responses.NotFoundError).toBeDefined();
      expect(responses.ValidationError).toBeDefined();
      expect(responses.RateLimitError).toBeDefined();
    });

    it('should have all API paths documented', async () => {
      const response = await supertest(app)
        .get('/api-docs.json')
        .expect(200);

      const spec = response.body;
      const paths = spec.paths;
      
      // Authentication paths
      expect(paths['/api/users/register']).toBeDefined();
      expect(paths['/api/users/login']).toBeDefined();
      
      // User paths
      expect(paths['/api/users/profile']).toBeDefined();
      expect(paths['/api/users/avatar']).toBeDefined();
      expect(paths['/api/users']).toBeDefined();
      expect(paths['/api/users/{id}']).toBeDefined();
      
      // Product paths
      expect(paths['/api/products']).toBeDefined();
      expect(paths['/api/products/{id}']).toBeDefined();
      expect(paths['/api/products/category/{category}']).toBeDefined();
      expect(paths['/api/products/search']).toBeDefined();
      
      // Health paths
      expect(paths['/health']).toBeDefined();
    });

    it('should have proper tags organization', async () => {
      const response = await supertest(app)
        .get('/api-docs.json')
        .expect(200);

      const spec = response.body;
      const tags = spec.tags;
      
      expect(tags).toBeDefined();
      expect(tags.length).toBeGreaterThan(0);
      
      const tagNames = tags.map(tag => tag.name);
      expect(tagNames).toContain('Authentication');
      expect(tagNames).toContain('Users');
      expect(tagNames).toContain('Products');
      expect(tagNames).toContain('Health');
      expect(tagNames).toContain('Upload');
    });
  });

  describe('Schema Validation', () => {
    it('should have valid User schema', async () => {
      const response = await supertest(app)
        .get('/api-docs.json')
        .expect(200);

      const userSchema = response.body.components.schemas.User;
      
      expect(userSchema.type).toBe('object');
      expect(userSchema.properties).toBeDefined();
      expect(userSchema.properties.id).toBeDefined();
      expect(userSchema.properties.email).toBeDefined();
      expect(userSchema.properties.name).toBeDefined();
      expect(userSchema.properties.role).toBeDefined();
      expect(userSchema.properties.createdAt).toBeDefined();
      
      expect(userSchema.properties.email.format).toBe('email');
      expect(userSchema.properties.role.enum).toEqual(['USER', 'ADMIN']);
      expect(userSchema.properties.id.format).toBe('uuid');
    });

    it('should have valid Product schema', async () => {
      const response = await supertest(app)
        .get('/api-docs.json')
        .expect(200);

      const productSchema = response.body.components.schemas.Product;
      
      expect(productSchema.type).toBe('object');
      expect(productSchema.required).toContain('name');
      expect(productSchema.required).toContain('price');
      expect(productSchema.required).toContain('category');
      
      expect(productSchema.properties.id.format).toBe('uuid');
      expect(productSchema.properties.price.format).toBe('decimal');
      expect(productSchema.properties.inStock.type).toBe('boolean');
    });

    it('should have valid LoginRequest schema', async () => {
      const response = await supertest(app)
        .get('/api-docs.json')
        .expect(200);

      const loginSchema = response.body.components.schemas.LoginRequest;
      
      expect(loginSchema.type).toBe('object');
      expect(loginSchema.required).toContain('email');
      expect(loginSchema.required).toContain('password');
      
      expect(loginSchema.properties.email.format).toBe('email');
      expect(loginSchema.properties.password.format).toBe('password');
    });

    it('should have valid PaginatedResponse schema', async () => {
      const response = await supertest(app)
        .get('/api-docs.json')
        .expect(200);

      const paginatedSchema = response.body.components.schemas.PaginatedResponse;
      
      expect(paginatedSchema.type).toBe('object');
      expect(paginatedSchema.properties.data).toBeDefined();
      expect(paginatedSchema.properties.data.properties.pagination).toBeDefined();
      expect(paginatedSchema.properties.data.properties.items).toBeDefined();
      expect(paginatedSchema.properties.timestamp).toBeDefined();
    });
  });

  describe('Documentation Integration', () => {
    it('should have Swagger UI with custom styling', async () => {
      const response = await supertest(app)
        .get('/api-docs')
        .expect(200);

      const html = response.text;
      
      // Check for custom CSS
      expect(html).toContain('swagger-ui');
      expect(html).toContain('Interview Backend API Documentation');
      
      // Check for custom styling elements
      expect(html).toContain('topbar { display: none }');
      expect(html).toContain('opblock.opblock-post');
      expect(html).toContain('opblock.opblock-get');
    });

    it('should have proper CORS headers for documentation', async () => {
      const response = await supertest(app)
        .get('/api-docs.json')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle documentation requests with compression', async () => {
      const response = await supertest(app)
        .get('/api-docs.json')
        .set('Accept-Encoding', 'gzip')
        .expect(200);

      // Should be compressed
      expect(response.headers['content-encoding']).toBe('gzip');
    });
  });

  describe('Security Documentation', () => {
    it('should document JWT authentication properly', async () => {
      const response = await supertest(app)
        .get('/api-docs.json')
        .expect(200);

      const spec = response.body;
      
      // Check security scheme
      expect(spec.components.securitySchemes.bearerAuth.description).toContain('JWT');
      
      // Check authenticated endpoints have security
      expect(paths['/api/users/profile'].get.security).toBeDefined();
      expect(paths['/api/users/profile'].get.security).toContainEqual({ bearerAuth: [] });
    });

    it('should document rate limiting responses', async () => {
      const response = await supertest(app)
        .get('/api-docs.json')
        .expect(200);

      const rateLimitResponse = response.body.components.responses.RateLimitError;
      
      expect(rateLimitResponse.description).toContain('Too many requests');
      expect(rateLimitResponse.content['application/json'].schema).toBeDefined();
    });

    it('should document validation errors', async () => {
      const response = await supertest(app)
        .get('/api-docs.json')
        .expect(200);

      const validationResponse = response.body.components.responses.ValidationError;
      
      expect(validationResponse.description).toContain('Validation failed');
      expect(validationResponse.content['application/json'].schema).toBeDefined();
    });
  });

  describe('Documentation Performance', () => {
    it('should serve documentation quickly', async () => {
      const startTime = Date.now();
      
      await supertest(app)
        .get('/api-docs.json')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should respond within 500ms
      expect(responseTime).toBeLessThan(500);
    });

    it('should serve Swagger UI quickly', async () => {
      const startTime = Date.now();
      
      await supertest(app)
        .get('/api-docs')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should respond within 1 second (HTML is larger)
      expect(responseTime).toBeLessThan(1000);
    });

    it('should handle concurrent documentation requests', async () => {
      const requests = Array(10).fill().map(() => 
        supertest(app).get('/api-docs.json')
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.openapi).toBe('3.0.0');
      });
    });
  });

  describe('Error Handling in Documentation', () => {
    it('should handle invalid documentation paths', async () => {
      await supertest(app)
        .get('/api-docs/invalid')
        .expect(404);
    });

    it('should handle malformed JSON requests gracefully', async () => {
      await supertest(app)
        .get('/api-docs.json')
        .set('Accept', 'application/xml')
        .expect(200); // Should still return JSON
    });

    it('should maintain documentation during server errors', async () => {
      // Documentation should be available even if other parts fail
      await supertest(app)
        .get('/api-docs')
        .expect(200);
        
      await supertest(app)
        .get('/api-docs.json')
        .expect(200);
    });
  });
});
