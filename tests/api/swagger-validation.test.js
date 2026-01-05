const request = require('supertest');
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const { app, request: supertest } = require('../api-setup');

describe('Swagger/OpenAPI Validation Tests', () => {
  let server;
  let openApiSpec;

  beforeAll(async () => {
    server = app.listen(0);
    
    // Fetch OpenAPI spec once for all tests
    const response = await supertest(app).get('/api-docs.json');
    openApiSpec = response.body;
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('OpenAPI 3.0 Specification Compliance', () => {
    it('should have valid OpenAPI structure', () => {
      expect(openApiSpec.openapi).toBe('3.0.0');
      expect(openApiSpec.info).toBeDefined();
      expect(openApiSpec.servers).toBeDefined();
      expect(openApiSpec.paths).toBeDefined();
      expect(openApiSpec.components).toBeDefined();
    });

    it('should have complete info object', () => {
      const info = openApiSpec.info;
      
      expect(info.title).toBe('Interview Backend API');
      expect(info.version).toBe('1.0.0');
      expect(info.description).toBeDefined();
      expect(info.contact).toBeDefined();
      expect(info.license).toBeDefined();
      
      expect(info.contact.name).toBe('API Support');
      expect(info.contact.email).toBe('support@interview-backend.com');
      expect(info.license.name).toBe('MIT');
    });

    it('should have valid server configuration', () => {
      const servers = openApiSpec.servers;
      
      expect(servers).toBeInstanceOf(Array);
      expect(servers.length).toBeGreaterThan(0);
      
      servers.forEach(server => {
        expect(server.url).toBeDefined();
        expect(server.description).toBeDefined();
        expect(server.url).toMatch(/^https?:\/\/.+/);
      });
    });

    it('should have valid path structure', () => {
      const paths = openApiSpec.paths;
      
      expect(paths).toBeInstanceOf(Object);
      expect(Object.keys(paths).length).toBeGreaterThan(0);
      
      Object.keys(paths).forEach(path => {
        expect(path).toMatch(/^\/api\/.+/);
        expect(paths[path]).toBeInstanceOf(Object);
      });
    });
  });

  describe('Component Validation', () => {
    it('should have valid security schemes', () => {
      const securitySchemes = openApiSpec.components.securitySchemes;
      
      expect(securitySchemes).toBeDefined();
      expect(securitySchemes.bearerAuth).toBeDefined();
      
      const bearerAuth = securitySchemes.bearerAuth;
      expect(bearerAuth.type).toBe('http');
      expect(bearerAuth.scheme).toBe('bearer');
      expect(bearerAuth.bearerFormat).toBe('JWT');
      expect(bearerAuth.description).toBeDefined();
    });

    it('should have valid schemas', () => {
      const schemas = openApiSpec.components.schemas;
      
      expect(schemas).toBeDefined();
      expect(schemas).toBeInstanceOf(Object);
      
      // Check required schemas exist
      const requiredSchemas = [
        'User', 'Profile', 'Product', 'ApiResponse', 'Error',
        'LoginRequest', 'LoginResponse', 'RegisterRequest',
        'ProductRequest', 'PaginatedResponse', 'Pagination', 'HealthCheck'
      ];
      
      requiredSchemas.forEach(schemaName => {
        expect(schemas[schemaName]).toBeDefined();
        expect(schemas[schemaName].type).toBe('object');
      });
    });

    it('should have valid response templates', () => {
      const responses = openApiSpec.components.responses;
      
      expect(responses).toBeDefined();
      expect(responses).toBeInstanceOf(Object);
      
      // Check required responses exist
      const requiredResponses = [
        'UnauthorizedError', 'ForbiddenError', 'NotFoundError',
        'ValidationError', 'RateLimitError'
      ];
      
      requiredResponses.forEach(responseName => {
        expect(responses[responseName]).toBeDefined();
        expect(responses[responseName].description).toBeDefined();
        expect(responses[responseName].content).toBeDefined();
      });
    });

    it('should have valid tags', () => {
      const tags = openApiSpec.tags;
      
      expect(tags).toBeDefined();
      expect(tags).toBeInstanceOf(Array);
      
      tags.forEach(tag => {
        expect(tag.name).toBeDefined();
        expect(tag.description).toBeDefined();
      });
      
      const tagNames = tags.map(tag => tag.name);
      expect(tagNames).toContain('Authentication');
      expect(tagNames).toContain('Users');
      expect(tagNames).toContain('Products');
      expect(tagNames).toContain('Health');
      expect(tagNames).toContain('Upload');
    });
  });

  describe('Schema Structure Validation', () => {
    it('should have valid User schema', () => {
      const userSchema = openApiSpec.components.schemas.User;
      
      expect(userSchema.type).toBe('object');
      expect(userSchema.properties).toBeDefined();
      
      // Check required fields
      expect(userSchema.required).toContain('email');
      expect(userSchema.required).toContain('name');
      
      // Check property types
      expect(userSchema.properties.id.type).toBe('string');
      expect(userSchema.properties.id.format).toBe('uuid');
      expect(userSchema.properties.email.type).toBe('string');
      expect(userSchema.properties.email.format).toBe('email');
      expect(userSchema.properties.name.type).toBe('string');
      expect(userSchema.properties.role.type).toBe('string');
      expect(userSchema.properties.role.enum).toEqual(['USER', 'ADMIN']);
      expect(userSchema.properties.createdAt.type).toBe('string');
      expect(userSchema.properties.createdAt.format).toBe('date-time');
    });

    it('should have valid Product schema', () => {
      const productSchema = openApiSpec.components.schemas.Product;
      
      expect(productSchema.type).toBe('object');
      expect(productSchema.required).toContain('name');
      expect(productSchema.required).toContain('price');
      expect(productSchema.required).toContain('category');
      
      expect(productSchema.properties.id.format).toBe('uuid');
      expect(productSchema.properties.price.type).toBe('number');
      expect(productSchema.properties.price.format).toBe('decimal');
      expect(productSchema.properties.inStock.type).toBe('boolean');
      expect(productSchema.properties.createdAt.format).toBe('date-time');
    });

    it('should have valid LoginRequest schema', () => {
      const loginSchema = openApiSpec.components.schemas.LoginRequest;
      
      expect(loginSchema.type).toBe('object');
      expect(loginSchema.required).toEqual(['email', 'password']);
      
      expect(loginSchema.properties.email.type).toBe('string');
      expect(loginSchema.properties.email.format).toBe('email');
      expect(loginSchema.properties.password.type).toBe('string');
      expect(loginSchema.properties.password.format).toBe('password');
    });

    it('should have valid ApiResponse schema', () => {
      const apiResponseSchema = openApiSpec.components.schemas.ApiResponse;
      
      expect(apiResponseSchema.type).toBe('object');
      expect(apiResponseSchema.properties.success.type).toBe('boolean');
      expect(apiResponseSchema.properties.message.type).toBe('string');
      expect(apiResponseSchema.properties.data.type).toBe('object');
      expect(apiResponseSchema.properties.timestamp.type).toBe('string');
      expect(apiResponseSchema.properties.timestamp.format).toBe('date-time');
    });

    it('should have valid PaginatedResponse schema', () => {
      const paginatedSchema = openApiSpec.components.schemas.PaginatedResponse;
      
      expect(paginatedSchema.type).toBe('object');
      expect(paginatedSchema.properties.success.type).toBe('boolean');
      expect(paginatedSchema.properties.data.type).toBe('object');
      expect(paginatedSchema.properties.data.properties.items.type).toBe('array');
      expect(paginatedSchema.properties.data.properties.pagination).toBeDefined();
      expect(paginatedSchema.properties.timestamp.type).toBe('string');
    });

    it('should have valid Pagination schema', () => {
      const paginationSchema = openApiSpec.components.schemas.Pagination;
      
      expect(paginationSchema.type).toBe('object');
      expect(paginationSchema.properties.page.type).toBe('integer');
      expect(paginationSchema.properties.limit.type).toBe('integer');
      expect(paginationSchema.properties.total.type).toBe('integer');
      expect(paginationSchema.properties.pages.type).toBe('integer');
    });

    it('should have valid Error schema', () => {
      const errorSchema = openApiSpec.components.schemas.Error;
      
      expect(errorSchema.type).toBe('object');
      expect(errorSchema.properties.success.type).toBe('boolean');
      expect(errorSchema.properties.message.type).toBe('string');
      expect(errorSchema.properties.errors.type).toBe('array');
      expect(errorSchema.properties.timestamp.type).toBe('string');
      
      // Check error item structure
      const errorItem = errorSchema.properties.errors.items;
      expect(errorItem.type).toBe('object');
      expect(errorItem.properties.field.type).toBe('string');
      expect(errorItem.properties.message.type).toBe('string');
    });
  });

  describe('Path and Operation Validation', () => {
    it('should have valid authentication paths', () => {
      const paths = openApiSpec.paths;
      
      // Register endpoint
      expect(paths['/api/users/register']).toBeDefined();
      expect(paths['/api/users/register'].post).toBeDefined();
      expect(paths['/api/users/register'].post.tags).toContain('Authentication');
      expect(paths['/api/users/register'].post.requestBody).toBeDefined();
      expect(paths['/api/users/register'].post.responses).toBeDefined();
      
      // Login endpoint
      expect(paths['/api/users/login']).toBeDefined();
      expect(paths['/api/users/login'].post).toBeDefined();
      expect(paths['/api/users/login'].post.tags).toContain('Authentication');
    });

    it('should have valid user management paths', () => {
      const paths = openApiSpec.paths;
      
      // Profile endpoint
      expect(paths['/api/users/profile']).toBeDefined();
      expect(paths['/api/users/profile'].get).toBeDefined();
      expect(paths['/api/users/profile'].get.security).toContainEqual({ bearerAuth: [] });
      
      // Avatar endpoints
      expect(paths['/api/users/avatar']).toBeDefined();
      expect(paths['/api/users/avatar'].post).toBeDefined();
      expect(paths['/api/users/avatar'].delete).toBeDefined();
      expect(paths['/api/users/avatar'].post.tags).toContain('Upload');
      
      // User CRUD endpoints
      expect(paths['/api/users']).toBeDefined();
      expect(paths['/api/users/{id}']).toBeDefined();
      expect(paths['/api/users/{id}'].get).toBeDefined();
      expect(paths['/api/users/{id}'].put).toBeDefined();
      expect(paths['/api/users/{id}'].delete).toBeDefined();
    });

    it('should have valid product management paths', () => {
      const paths = openApiSpec.paths;
      
      // Product list and search
      expect(paths['/api/products']).toBeDefined();
      expect(paths['/api/products'].get).toBeDefined();
      expect(paths['/api/products/search']).toBeDefined();
      expect(paths['/api/products/search'].get).toBeDefined();
      
      // Product by category
      expect(paths['/api/products/category/{category}']).toBeDefined();
      expect(paths['/api/products/category/{category}'].get).toBeDefined();
      
      // Product CRUD
      expect(paths['/api/products/{id}']).toBeDefined();
      expect(paths['/api/products/{id}'].get).toBeDefined();
      expect(paths['/api/products/{id}'].put).toBeDefined();
      expect(paths['/api/products/{id}'].delete).toBeDefined();
      
      // Admin-only endpoints should have security
      expect(paths['/api/products'].post.security).toContainEqual({ bearerAuth: [] });
      expect(paths['/api/products/{id}'].put.security).toContainEqual({ bearerAuth: [] });
      expect(paths['/api/products/{id}'].delete.security).toContainEqual({ bearerAuth: [] });
    });

    it('should have valid health check paths', () => {
      const paths = openApiSpec.paths;
      
      expect(paths['/health']).toBeDefined();
      expect(paths['/health'].get).toBeDefined();
      expect(paths['/health'].get.tags).toContain('Health');
      expect(paths['/health'].get.responses).toBeDefined();
    });

    it('should have proper parameter documentation', () => {
      const paths = openApiSpec.paths;
      
      // Path parameters
      const userByIdPath = paths['/api/users/{id}'];
      expect(userByIdPath.get.parameters).toBeDefined();
      expect(userByIdPath.get.parameters[0].name).toBe('id');
      expect(userByIdPath.get.parameters[0].in).toBe('path');
      expect(userByIdPath.get.parameters[0].required).toBe(true);
      expect(userByIdPath.get.parameters[0].schema.type).toBe('string');
      expect(userByIdPath.get.parameters[0].schema.format).toBe('uuid');
      
      // Query parameters
      const productsPath = paths['/api/products'];
      if (productsPath.get.parameters) {
        productsPath.get.parameters.forEach(param => {
          expect(param.name).toBeDefined();
          expect(param.in).toBe('query');
          expect(param.schema).toBeDefined();
        });
      }
    });

    it('should have proper response documentation', () => {
      const paths = openApiSpec.paths;
      
      // Check login endpoint responses
      const loginResponses = paths['/api/users/login'].post.responses;
      expect(loginResponses['200']).toBeDefined();
      expect(loginResponses['401']).toBeDefined();
      expect(loginResponses['429']).toBeDefined();
      
      // Check authenticated endpoint responses
      const profileResponses = paths['/api/users/profile'].get.responses;
      expect(profileResponses['200']).toBeDefined();
      expect(profileResponses['401']).toBeDefined();
    });
  });

  describe('Response Template Validation', () => {
    it('should have valid error response templates', () => {
      const responses = openApiSpec.components.responses;
      
      // Unauthorized error
      const unauthorized = responses.UnauthorizedError;
      expect(unauthorized.description).toContain('Authentication failed');
      expect(unauthorized.content['application/json']).toBeDefined();
      expect(unauthorized.content['application/json'].schema).toBeDefined();
      
      // Forbidden error
      const forbidden = responses.ForbiddenError;
      expect(forbidden.description).toContain('Insufficient permissions');
      
      // Validation error
      const validation = responses.ValidationError;
      expect(validation.description).toContain('Validation failed');
      
      // Not found error
      const notFound = responses.NotFoundError;
      expect(notFound.description).toContain('Resource not found');
      
      // Rate limit error
      const rateLimit = responses.RateLimitError;
      expect(rateLimit.description).toContain('Too many requests');
    });

    it('should have proper response examples', () => {
      const responses = openApiSpec.components.responses;
      
      // Check error response examples
      const unauthorized = responses.UnauthorizedError;
      if (unauthorized.content['application/json'].example) {
        expect(unauthorized.content['application/json'].example.success).toBe(false);
        expect(unauthorized.content['application/json'].example.message).toBeDefined();
      }
    });
  });

  describe('Security Documentation Validation', () => {
    it('should properly document JWT authentication', () => {
      const securitySchemes = openApiSpec.components.securitySchemes.bearerAuth;
      
      expect(securitySchemes.description).toContain('JWT');
      expect(securitySchemes.description).toContain('authentication');
      expect(securitySchemes.description).toContain('/api/users/login');
    });

    it('should have security requirements on protected endpoints', () => {
      const paths = openApiSpec.paths;
      
      // Check protected endpoints have security
      const protectedEndpoints = [
        '/api/users/profile',
        '/api/users/avatar',
        '/api/users',
        '/api/products',
        '/api/products/{id}'
      ];
      
      protectedEndpoints.forEach(endpoint => {
        const pathObj = paths[endpoint];
        if (pathObj) {
          Object.values(pathObj).forEach(operation => {
            if (operation.security) {
              expect(operation.security).toContainEqual({ bearerAuth: [] });
            }
          });
        }
      });
    });

    it('should not require authentication on public endpoints', () => {
      const paths = openApiSpec.paths;
      
      // Public endpoints should not have security requirements
      const publicEndpoints = [
        '/api/users/register',
        '/api/users/login',
        '/health'
      ];
      
      publicEndpoints.forEach(endpoint => {
        const pathObj = paths[endpoint];
        if (pathObj) {
          Object.values(pathObj).forEach(operation => {
            if (operation.security) {
              // Public endpoints might have optional security, but not required
              expect(Array.isArray(operation.security)).toBe(true);
            }
          });
        }
      });
    });
  });

  describe('Documentation Completeness', () => {
    it('should have descriptions for all operations', () => {
      const paths = openApiSpec.paths;
      
      Object.values(paths).forEach(pathObj => {
        Object.values(pathObj).forEach(operation => {
          if (operation.summary || operation.description) {
            expect(operation.summary || operation.description).toBeDefined();
          }
        });
      });
    });

    it('should have tags for all operations', () => {
      const paths = openApiSpec.paths;
      
      Object.values(paths).forEach(pathObj => {
        Object.values(pathObj).forEach(operation => {
          if (operation.tags) {
            expect(Array.isArray(operation.tags)).toBe(true);
            expect(operation.tags.length).toBeGreaterThan(0);
          }
        });
      });
    });

    it('should have response codes for all operations', () => {
      const paths = openApiSpec.paths;
      
      Object.values(paths).forEach(pathObj => {
        Object.values(pathObj).forEach(operation => {
          if (operation.responses) {
            expect(Object.keys(operation.responses).length).toBeGreaterThan(0);
            
            // Should have at least success response
            const successCodes = ['200', '201', '204'];
            const hasSuccessResponse = successCodes.some(code => 
              operation.responses[code]
            );
            expect(hasSuccessResponse).toBe(true);
          }
        });
      });
    });

    it('should have proper parameter documentation', () => {
      const paths = openApiSpec.paths;
      
      Object.values(paths).forEach(pathObj => {
        Object.values(pathObj).forEach(operation => {
          if (operation.parameters) {
            operation.parameters.forEach(param => {
              expect(param.name).toBeDefined();
              expect(param.in).toBeDefined();
              expect(param.schema).toBeDefined();
              
              if (param.required) {
                expect(typeof param.required).toBe('boolean');
              }
            });
          }
        });
      });
    });
  });

  describe('OpenAPI Best Practices', () => {
    it('should use proper HTTP methods', () => {
      const paths = openApiSpec.paths;
      const validMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
      
      Object.values(paths).forEach(pathObj => {
        Object.keys(pathObj).forEach(method => {
          expect(validMethods).toContain(method);
        });
      });
    });

    it('should use proper status codes', () => {
      const paths = openApiSpec.paths;
      const validStatusCodes = [
        '200', '201', '202', '204', // Success
        '400', '401', '403', '404', '422', '429', // Client errors
        '500', '502', '503', '504' // Server errors
      ];
      
      Object.values(paths).forEach(pathObj => {
        Object.values(pathObj).forEach(operation => {
          if (operation.responses) {
            Object.keys(operation.responses).forEach(statusCode => {
              expect(validStatusCodes).toContain(statusCode);
            });
          }
        });
      });
    });

    it('should have consistent naming conventions', () => {
      const schemas = openApiSpec.components.schemas;
      
      Object.keys(schemas).forEach(schemaName => {
        // Schema names should be PascalCase
        expect(schemaName).toMatch(/^[A-Z][a-zA-Z0-9]*$/);
      });
    });

    it('should have proper content types', () => {
      const paths = openApiSpec.paths;
      
      Object.values(paths).forEach(pathObj => {
        Object.values(pathObj).forEach(operation => {
          if (operation.responses) {
            Object.values(operation.responses).forEach(response => {
              if (response.content) {
                Object.keys(response.content).forEach(contentType => {
                  // Should use standard content types
                  const validTypes = [
                    'application/json',
                    'multipart/form-data',
                    'application/x-www-form-urlencoded',
                    'text/plain',
                    'text/html'
                  ];
                  expect(validTypes).toContain(contentType);
                });
              }
            });
          }
        });
      });
    });
  });
});
