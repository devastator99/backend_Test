# Interview Backend System

A **production-ready Node.js backend system** built with **Express.js**, **Prisma ORM**, and modern development practices. This system demonstrates enterprise-level architecture suitable for technical interviews and real-world applications.

## 🚀 Features

### Core Architecture
- **MVC Pattern** with Service and Utility layers
- **Type-safe** database operations with Prisma
- **JWT Authentication** with role-based access control
- **Comprehensive Error Handling** with custom error classes
- **Advanced Logging** with Winston
- **In-memory Caching** with NodeCache
- **Input Validation & Sanitization**
- **Rate Limiting** and security middleware

## ⚡ Quick Setup

```bash
# Clone and setup in one command
git clone <repo-url> backend_Test && cd backend_Test && \
npm install && \
cp .env.example .env && \
npm run prisma:generate && \
npm run prisma:migrate && \
npm run dev
```

**That's it!** Your server is now running on http://localhost:3000

- 📚 API Documentation: http://localhost:3000/api-docs
- 💚 Health Check: http://localhost:3000/health

### Security Features
- **Helmet.js** for security headers
- **CORS** configuration
- **Password hashing** with bcryptjs
- **SQL Injection prevention** with mongo-sanitize
- **Request sanitization** and validation

### Development Features
- **Structured logging** with multiple levels
- **Health check endpoint** with system metrics
- **Graceful shutdown** handling
- **Database connection management**
- **Performance monitoring**
- **Comprehensive error tracking**

## 📁 Project Structure

```
backend_Test/
├── src/
│   ├── config/
│   │   └── database.js          # Database connection management
│   ├── controllers/
│   │   ├── userController.js    # User HTTP handlers
│   │   └── productController.js # Product HTTP handlers
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   ├── errorHandler.js      # Global error handling
│   │   ├── rateLimiter.js       # Rate limiting
│   │   ├── requestLogger.js     # Request logging
│   │   └── validation.js        # Input validation
│   ├── routes/
│   │   ├── userRoutes.js        # User endpoints
│   │   └── productRoutes.js     # Product endpoints
│   ├── services/
│   │   ├── userService.js       # User business logic
│   │   └── productService.js    # Product business logic
│   ├── utils/
│   │   ├── cache.js             # Caching utilities
│   │   ├── errors.js            # Custom error classes
│   │   ├── logger.js            # Logging configuration
│   │   └── response.js          # Response utilities
│   └── index.js                 # Server entry point
├── prisma/
│   └── schema.prisma            # Database schema
├── logs/                         # Log files directory
├── .env                         # Environment variables
├── package.json                 # Dependencies and scripts
└── README.md                    # This file
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js >= 16.0.0
- npm or yarn

### Quick Start

1. **Clone and install dependencies**
```bash
cd backend_Test
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Database Setup**
```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) View database in Prisma Studio
npm run prisma:studio
```

4. **Start Development Server**
```bash
npm run dev
```

5. **Start Production Server**
```bash
npm start
```

## 📡 API Endpoints

### Authentication
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/profile` - Get current user profile (auth required)

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID (auth required)
- `PUT /api/users/:id` - Update user (auth required)
- `DELETE /api/users/:id` - Delete user (admin only)

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/category/:category` - Get products by category
- `GET /api/products/search?q=query` - Search products
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)

### System
- `GET /health` - Health check with system metrics
- `GET /api` - API documentation and endpoints

## 🔧 Configuration

### Environment Variables
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key"
PORT=3000
NODE_ENV="development"
```

### Database Models
- **User**: Authentication and user management
- **Profile**: User profile information
- **Post**: User posts/content
- **Product**: Product catalog with categories

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage
npm run test:coverage
```

## 📝 Logging

The system uses Winston for comprehensive logging:

- **Development**: Console output with colors
- **Production**: File-based logging with rotation
- **Log Levels**: error, warn, info, http, debug
- **Log Files**: `logs/error.log`, `logs/combined.log`, `logs/http.log`

## 🚀 Performance Features

### Caching
- **In-memory caching** with TTL support
- **Cache middleware** for GET endpoints
- **Pattern-based cache invalidation**
- **Cache statistics and monitoring**

### Database Optimization
- **Connection pooling** and management
- **Health checks** and monitoring
- **Transaction support**
- **Query optimization**

### Security
- **Rate limiting** per IP
- **Input sanitization** against XSS
- **SQL injection prevention**
- **CORS and security headers**

## 🔄 Development Scripts

```bash
# Development
npm run dev              # Start with nodemon
npm run start            # Start production server

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
npm run seed             # Seed database

# Testing
npm test                 # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

## 🏗️ Architecture Highlights

### Error Handling
- **Custom error classes** for different error types
- **Global error handler** with consistent responses
- **Development vs production** error formatting
- **Error logging** with context

### Validation
- **Express-validator** for input validation
- **Sanitization** against XSS and injection attacks
- **Custom validation rules** and error messages
- **Validation middleware** integration

### Authentication
- **JWT tokens** with expiration
- **Role-based access control** (USER/ADMIN)
- **Password strength requirements**
- **Secure token generation**

## 📊 Monitoring & Health

The `/health` endpoint provides:
- **Database connection status**
- **Cache statistics** (hits, misses, hit rate)
- **Server information** and environment
- **Timestamp** and uptime

## 🤝 Contributing

This project follows best practices for:
- **Code organization** and structure
- **Error handling** and logging
- **Security** and validation
- **Performance** optimization
- **Testing** and documentation

## 📜 License

MIT License - feel free to use this for learning and interviews.

---

This backend system demonstrates **production-ready architecture** and **modern development practices** suitable for technical interviews and real-world applications.