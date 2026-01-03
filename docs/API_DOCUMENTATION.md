# API Documentation Guide

This document explains the Swagger/OpenAPI documentation implementation for the interview backend system.

## 📚 Overview

The API documentation system provides **comprehensive, interactive documentation** with:

- **Swagger UI**: Interactive API exploration
- **OpenAPI 3.0**: Standardized API specification
- **Auto-generation**: Documentation from code annotations
- **Testing Interface**: Built-in API testing
- **Schema Validation**: Request/response examples

## 🚀 Quick Start

### Access Documentation
```bash
# Start the server
npm run dev

# Open documentation in browser
open http://localhost:3000/api-docs
```

### Documentation Endpoints
| Endpoint | Description |
|---------|-------------|
| `/api-docs` | Interactive Swagger UI |
| `/api-docs.json` | Raw OpenAPI JSON specification |
| `/api` | API overview and endpoints |
| `/api/swagger-info` | Documentation information |

## 📁 Documentation Components

### Core Files
- `src/config/swagger.js` - Swagger configuration and schemas
- `src/middleware/swagger.js` - Documentation middleware
- `src/routes/userRoutes.js` - User API documentation
- `src/routes/productRoutes.js` - Product API documentation

### Features
- **Interactive Testing**: Try API endpoints directly
- **Authentication Support**: JWT token testing
- **Schema Examples**: Request/response examples
- **Error Documentation**: Complete error responses
- **Parameter Validation**: Input validation examples

## 🔧 Configuration

### Swagger Configuration
```javascript
// src/config/swagger.js
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Interview Backend API',
      version: '1.0.0',
      description: 'Comprehensive Node.js backend system...',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
      { url: 'https://api.interview-backend.com', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};
```

### Schema Definitions
```javascript
// User schema example
User: {
  type: 'object',
  required: ['email', 'name'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string' },
    role: { type: 'string', enum: ['USER', 'ADMIN'] },
    createdAt: { type: 'string', format: 'date-time' },
  },
}
```

## 📝 Annotation Examples

### Route Documentation
```javascript
/**
 * @swagger
 * /api/users/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login user
 *     description: Authenticate user and return JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', authRateLimitMiddleware, loginUser);
```

### Parameter Documentation
```javascript
/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 */
```

### Response Documentation
```javascript
/**
 * @swagger
 * responses:
 *   UnauthorizedError:
 *     description: Authentication failed
 *     content:
 *       application/json:
 *         schema:
 *           $ref: '#/components/schemas/Error'
 *         example:
 *           success: false
 *           message: 'Unauthorized - Valid JWT token required'
 */
```

## 🔐 Authentication in Documentation

### JWT Authentication
```javascript
/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
```

### Testing with JWT
1. **Login First**: Get JWT token from `/api/users/login`
2. **Authorize**: Click "Authorize" button in Swagger UI
3. **Enter Token**: Paste `Bearer YOUR_JWT_TOKEN`
4. **Test**: Use authenticated endpoints

## 📊 Schema Documentation

### User Schemas
- **User**: Complete user object
- **Profile**: User profile information
- **LoginRequest**: Login request payload
- **LoginResponse**: Login response with token
- **RegisterRequest**: Registration request payload

### Product Schemas
- **Product**: Product object with all fields
- **ProductRequest**: Product creation/update payload
- **PaginatedResponse**: Paginated response wrapper

### Common Schemas
- **ApiResponse**: Standard API response
- **Error**: Error response object
- **Pagination**: Pagination metadata
- **HealthCheck**: Health check response

## 🚨 Error Documentation

### Standard Error Responses
```javascript
/**
 * @swagger
 * components:
 *   responses:
 *     ValidationError:
 *       description: Validation failed
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *           example:
 *             success: false
 *             message: 'Validation failed'
 *             errors:
 *               - field: 'email'
 *                 message: 'Email is required'
 */
```

### Error Types
- **400**: Validation Error
- **401**: Unauthorized Error
- **403**: Forbidden Error
- **404**: Not Found Error
- **429**: Rate Limit Error
- **500**: Server Error

## 🧪 Testing with Swagger UI

### Interactive Testing
1. **Open Documentation**: Navigate to `/api-docs`
2. **Select Endpoint**: Choose an API endpoint
3. **Try It Out**: Click "Try it out" button
4. **Fill Parameters**: Enter required parameters
5. **Execute**: Click "Execute" to test
6. **View Response**: See response and status code

### Authentication Testing
```bash
# 1. Get JWT token
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'

# 2. Use token in Swagger UI
# Copy token and add "Bearer " prefix
# Click "Authorize" button
# Enter: Bearer YOUR_JWT_TOKEN
```

### File Upload Testing
```javascript
/**
 * @swagger
 * /api/users/avatar:
 *   post:
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [avatar]
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG, WebP, max 5MB)
 */
```

## 📈 Documentation Features

### Auto-Generation
- **Route Scanning**: Automatically scans route files
- **Schema Inference**: Generates schemas from annotations
- **Parameter Detection**: Identifies route parameters
- **Response Mapping**: Maps response schemas

### Interactive Features
- **Live Testing**: Test endpoints directly
- **Parameter Validation**: Validates input parameters
- **Response Formatting**: Formats response examples
- **Authentication Testing**: Test authenticated endpoints

### Customization
- **Branding**: Custom CSS and styling
- **Server Configuration**: Multiple server environments
- **Security Schemes**: JWT authentication support
- **Tag Organization**: Grouped by functionality

## 🔧 Advanced Features

### Custom Middleware
```javascript
// src/middleware/swagger.js
const setupSwagger = (app) => {
  // Documentation endpoints
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, options));
  app.get('/api-docs.json', (req, res) => res.send(specs));
  
  // API information endpoint
  app.get('/api', (req, res) => {
    res.json({
      documentation: {
        swagger: `${req.protocol}://${req.get('host')}/api-docs`,
        json: `${req.protocol}://${req.get('host')}/api-docs.json`,
      },
    });
  });
};
```

### Schema Reusability
```javascript
// Reusable response schemas
components:
  responses:
    SuccessResponse:
      description: Operation successful
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ApiResponse'
    
    ErrorResponse:
      description: Operation failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
```

### Parameter Groups
```javascript
// Common parameters
components:
  parameters:
    PageParam:
      in: query
      name: page
      schema:
        type: integer
        default: 1
      description: Page number
    
    LimitParam:
      in: query
      name: limit
      schema:
        type: integer
        default: 10
      description: Items per page
```

## 📚 API Documentation Structure

### Endpoint Organization
```
/api-docs
├── Authentication
│   ├── POST /api/users/register
│   └── POST /api/users/login
├── Users
│   ├── GET /api/users/profile
│   ├── POST /api/users/avatar
│   ├── DELETE /api/users/avatar
│   ├── GET /api/users
│   ├── GET /api/users/:id
│   ├── PUT /api/users/:id
│   └── DELETE /api/users/:id
├── Products
│   ├── GET /api/products
│   ├── GET /api/products/:id
│   ├── GET /api/products/category/:category
│   ├── GET /api/products/search
│   ├── POST /api/products
│   ├── PUT /api/products/:id
│   └── DELETE /api/products/:id
└── Health
    ├── GET /health
    └── GET /api/health
```

### Schema Organization
```
Schemas
├── User Management
│   ├── User
│   ├── Profile
│   ├── LoginRequest
│   ├── LoginResponse
│   └── RegisterRequest
├── Product Management
│   ├── Product
│   └── ProductRequest
├── Common
│   ├── ApiResponse
│   ├── PaginatedResponse
│   ├── Pagination
│   ├── Error
│   └── HealthCheck
└── Authentication
    └── JWT Token
```

## 🎯 Best Practices

### Documentation Guidelines
1. **Complete Descriptions**: Clear, concise descriptions
2. **Example Values**: Provide realistic examples
3. **Error Handling**: Document all possible errors
4. **Authentication**: Document auth requirements
5. **Validation**: Document input validation rules

### Schema Design
1. **Consistent Naming**: Use consistent field names
2. **Type Safety**: Use proper data types
3. **Required Fields**: Mark required fields clearly
4. **Format Specifications**: Use format constraints
5. **Examples**: Provide meaningful examples

### Route Documentation
1. **Summary**: Brief, clear summary
2. **Description**: Detailed description
3. **Parameters**: Document all parameters
4. **Responses**: Document all response codes
5. **Security**: Specify authentication requirements

## 🔍 Documentation Validation

### Schema Validation
```bash
# Validate OpenAPI specification
npx @apidevtools/swagger-parser validate ./api-docs.json

# Check for common issues
npx swagger-jsdoc -d swaggerDef.js -o api-docs.json
```

### Testing Documentation
```bash
# Test all documented endpoints
npm run test:api-docs

# Validate examples
npm run validate:examples
```

## 🚀 Production Considerations

### Documentation Security
- **Environment Filtering**: Hide sensitive endpoints
- **Authentication**: Protect documentation in production
- **Rate Limiting**: Apply rate limiting to docs
- **CORS**: Configure CORS for documentation

### Performance
- **Caching**: Cache documentation responses
- **Compression**: Compress documentation assets
- **CDN**: Serve documentation via CDN
- **Lazy Loading**: Load large schemas on demand

This comprehensive API documentation system provides **professional-grade documentation** with **interactive testing**, **complete schema coverage**, and **authentication support** for the interview backend system.
