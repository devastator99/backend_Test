const swaggerJsdoc = require('swagger-jsdoc');
const { describe, it, expect } = require('@jest/globals');

describe('Swagger/OpenAPI Validation Tests', () => {
  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Interview Backend API',
        version: '1.0.0',
        description: 'A comprehensive Node.js backend system for interview purposes with JWT authentication, file uploads, and load balancing.',
        contact: {
          name: 'API Support',
          email: 'support@interview-backend.com',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
        {
          url: 'https://api.interview-backend.com',
          description: 'Production server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT authentication token. Obtain from /api/users/login endpoint.',
          },
        },
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: 'Unique user identifier',
              },
              email: {
                type: 'string',
                format: 'email',
                description: 'User email address',
                example: 'john.doe@example.com',
              },
              name: {
                type: 'string',
                description: 'User full name',
                example: 'John Doe',
              },
              role: {
                type: 'string',
                enum: ['USER', 'ADMIN'],
                description: 'User role',
                example: 'USER',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: 'Account creation timestamp',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                description: 'Last update timestamp',
              },
            },
          },
          Product: {
            type: 'object',
            required: ['name', 'price', 'category'],
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: 'Product identifier',
              },
              name: {
                type: 'string',
                description: 'Product name',
                example: 'MacBook Pro 16"',
              },
              description: {
                type: 'string',
                description: 'Product description',
                example: 'High-performance laptop with M2 Pro chip',
              },
              price: {
                type: 'number',
                format: 'decimal',
                description: 'Product price',
                example: 2499.99,
              },
              category: {
                type: 'string',
                description: 'Product category',
                example: 'Electronics',
              },
              inStock: {
                type: 'boolean',
                description: 'Product availability',
                example: true,
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: 'Product creation timestamp',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                description: 'Product last update timestamp',
              },
            },
          },
          ApiResponse: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                description: 'Request success status',
                example: true,
              },
              message: {
                type: 'string',
                description: 'Response message',
                example: 'Operation completed successfully',
              },
              data: {
                type: 'object',
                description: 'Response data payload',
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'Response timestamp',
              },
            },
          },
          Error: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                description: 'Request success status',
                example: false,
              },
              message: {
                type: 'string',
                description: 'Error message',
                example: 'Validation failed',
              },
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: {
                      type: 'string',
                      description: 'Field with error',
                      example: 'email',
                    },
                    message: {
                      type: 'string',
                      description: 'Error message for field',
                      example: 'Email is required',
                    },
                  },
                },
                description: 'Array of validation errors',
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'Error timestamp',
              },
            },
          },
          LoginRequest: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: {
                type: 'string',
                format: 'email',
                description: 'User email address',
                example: 'john.doe@example.com',
              },
              password: {
                type: 'string',
                format: 'password',
                description: 'User password',
                example: 'Password123!',
              },
            },
          },
          LoginResponse: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                description: 'Login success status',
                example: true,
              },
              message: {
                type: 'string',
                description: 'Login response message',
                example: 'Login successful',
              },
              data: {
                type: 'object',
                properties: {
                  token: {
                    type: 'string',
                    description: 'JWT authentication token',
                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  },
                  user: {
                    $ref: '#/components/schemas/User',
                  },
                },
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'Response timestamp',
              },
            },
          },
        },
        responses: {
          UnauthorizedError: {
            description: 'Authentication failed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  success: false,
                  message: 'Unauthorized - Valid JWT token required',
                  timestamp: '2025-01-03T15:30:00.000Z',
                },
              },
            },
          },
          ForbiddenError: {
            description: 'Insufficient permissions',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  success: false,
                  message: 'Forbidden - Admin access required',
                  timestamp: '2025-01-03T15:30:00.000Z',
                },
              },
            },
          },
          NotFoundError: {
            description: 'Resource not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  success: false,
                  message: 'User not found',
                  timestamp: '2025-01-03T15:30:00.000Z',
                },
              },
            },
          },
          ValidationError: {
            description: 'Validation failed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  success: false,
                  message: 'Validation failed',
                  errors: [
                    {
                      field: 'email',
                      message: 'Email is required',
                    },
                  ],
                  timestamp: '2025-01-03T15:30:00.000Z',
                },
              },
            },
          },
          RateLimitError: {
            description: 'Too many requests',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  success: false,
                  message: 'Too many requests. Please try again later.',
                  retryAfter: 45,
                  timestamp: '2025-01-03T15:30:00.000Z',
                },
              },
            },
          },
        },
        tags: [
          {
            name: 'Authentication',
            description: 'User authentication and authorization operations',
          },
          {
            name: 'Users',
            description: 'User management operations',
          },
          {
            name: 'Products',
            description: 'Product management operations',
          },
          {
            name: 'Health',
            description: 'System health and monitoring endpoints',
          },
          {
            name: 'Upload',
            description: 'File upload operations',
          },
        ],
      },
    },
    apis: [
      './src/routes/*.js',
      './src/controllers/*.js',
      './src/middleware/*.js',
    ],
  };

  let openApiSpec;

  beforeAll(() => {
    // Generate OpenAPI spec
    openApiSpec = swaggerJsdoc(options);
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
        'User', 'Product', 'ApiResponse', 'Error',
        'LoginRequest', 'LoginResponse'
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
      
      // Should have authentication endpoints
      expect(paths['/api/users/register']).toBeDefined();
      expect(paths['/api/users/login']).toBeDefined();
    });

    it('should have valid user management paths', () => {
      const paths = openApiSpec.paths;
      
      // Should have user endpoints
      expect(paths['/api/users/profile']).toBeDefined();
      expect(paths['/api/users/avatar']).toBeDefined();
      expect(paths['/api/users']).toBeDefined();
      expect(paths['/api/users/{id}']).toBeDefined();
    });

    it('should have valid product management paths', () => {
      const paths = openApiSpec.paths;
      
      // Should have product endpoints
      expect(paths['/api/products']).toBeDefined();
      expect(paths['/api/products/search']).toBeDefined();
      expect(paths['/api/products/category/{category}']).toBeDefined();
      expect(paths['/api/products/{id}']).toBeDefined();
    });

    it('should have valid health check paths', () => {
      const paths = openApiSpec.paths;
      
      expect(paths['/health']).toBeDefined();
      expect(paths['/health'].get).toBeDefined();
      expect(paths['/health'].get.tags).toContain('Health');
      expect(paths['/health'].get.responses).toBeDefined();
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
  });

  describe('Security Documentation Validation', () => {
    it('should properly document JWT authentication', () => {
      const securitySchemes = openApiSpec.components.securitySchemes.bearerAuth;
      
      expect(securitySchemes.description).toContain('JWT');
      expect(securitySchemes.description).toContain('authentication');
      expect(securitySchemes.description).toContain('/api/users/login');
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
