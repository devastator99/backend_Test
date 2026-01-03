const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

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
      {
        url: 'http://localhost',
        description: 'Load balanced endpoint',
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
            profile: {
              $ref: '#/components/schemas/Profile',
            },
          },
        },
        Profile: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Profile identifier',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'Associated user ID',
            },
            bio: {
              type: 'string',
              description: 'User biography',
              example: 'Software developer passionate about Node.js',
            },
            avatar: {
              type: 'string',
              format: 'uri',
              description: 'Avatar image URL',
              example: '/uploads/avatars/user_123_processed.jpg',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Profile creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Profile last update timestamp',
            },
          },
        },
        Product: {
          type: 'object',
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
        Post: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Post identifier',
            },
            title: {
              type: 'string',
              description: 'Post title',
              example: 'Getting Started with Node.js',
            },
            content: {
              type: 'string',
              description: 'Post content',
              example: 'Node.js is a JavaScript runtime...',
            },
            published: {
              type: 'boolean',
              description: 'Post publication status',
              example: true,
            },
            authorId: {
              type: 'string',
              format: 'uuid',
              description: 'Post author ID',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Post creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Post last update timestamp',
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
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Request success status',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                  },
                  description: 'Array of items',
                },
                pagination: {
                  $ref: '#/components/schemas/Pagination',
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
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Current page number',
              example: 1,
            },
            limit: {
              type: 'integer',
              description: 'Items per page',
              example: 10,
            },
            total: {
              type: 'integer',
              description: 'Total number of items',
              example: 100,
            },
            pages: {
              type: 'integer',
              description: 'Total number of pages',
              example: 10,
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
        RegisterRequest: {
          type: 'object',
          required: ['email', 'name', 'password'],
          properties: {
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
            password: {
              type: 'string',
              format: 'password',
              description: 'User password (min 8 characters)',
              example: 'Password123!',
            },
            role: {
              type: 'string',
              enum: ['USER', 'ADMIN'],
              description: 'User role (optional, defaults to USER)',
              example: 'USER',
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
        ProductRequest: {
          type: 'object',
          required: ['name', 'price', 'category'],
          properties: {
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
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Health check status',
              example: true,
            },
            message: {
              type: 'string',
              description: 'Health check message',
              example: 'Server is running',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Health check timestamp',
            },
            environment: {
              type: 'string',
              description: 'Server environment',
              example: 'production',
            },
            database: {
              type: 'object',
              description: 'Database health status',
            },
            cache: {
              type: 'object',
              description: 'Cache health status',
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
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/middleware/*.js',
  ],
};

const specs = swaggerJsdoc(options);

const swaggerUiOptions = {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .scheme-container { margin: 20px 0 }
    .swagger-ui .opblock.opblock-post { border-color: #49cc90; }
    .swagger-ui .opblock.opblock-get { border-color: #61affe; }
    .swagger-ui .opblock.opblock-put { border-color: #fca130; }
    .swagger-ui .opblock.opblock-delete { border-color: #f93e3e; }
  `,
  customSiteTitle: 'Interview Backend API Documentation',
};

module.exports = {
  specs,
  swaggerUi,
  swaggerUiOptions,
};
