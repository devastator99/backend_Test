# Backend System Architecture Overview

This is a **fully structured Node.js backend system** built with **Express.js** and **Prisma ORM**, designed for interview purposes. The system follows **MVC (Model-View-Controller)** architecture with additional service and middleware layers.

##

# Backend System Architecture Overview

This is a **fully structured Node.js backend system** built with **Express.js** and **Prisma ORM**, designed for interview purposes. The system follows **MVC (Model-View-Controller)** architecture with additional service and middleware layers.

## Project Structure

```
backend_Test/

# Backend System Architecture Overview

This is a **fully structured Node.js backend system** built with **Express.js** and **Prisma ORM**, designed for interview purposes. The system follows **MVC (Model-View-Controller)** architecture with additional service and middleware layers.

## Core Components

### 1. **Database Layer** (`prisma/schema.prisma`)
- **Models**: User, Profile, Post, Product
- **Database**: SQLite for development, easily switchable to PostgreSQL
- **ORM**: Prisma for type-safe database operations

### 2. **Middleware Layer** (`src/middleware/`)
- **auth.js**: JWT authentication & role-based access control
- **errorHandler.js**: Centralized error handling
- **requestLogger.js**: Morgan-based request logging
- **rateLimiter.js**: API rate limiting protection

### 3. **Service Layer** (`src/services/`)
- **userService.js**: User CRUD operations, authentication
- **productService.js**: Product management with search/filter

### 4. **Controller Layer** (`src/controllers/`)
- **userController.js**: HTTP request handlers for users
- **productController.js**: HTTP request handlers for products

### 5. **Routes Layer** (`src/routes/`)
- **userRoutes.js**: User endpoint definitions
- **productRoutes.js**: Product endpoint definitions

### 6. **Configuration** (`src/config/`)
- **database.js**: Prisma client initialization

## Key Features

### Authentication System
- JWT-based authentication
- Role-based access control (USER/ADMIN)
- Secure password hashing with bcryptjs

### API Endpoints
- **Auth**: `/api/users/register`, `/api/users/login`
- **Users**: CRUD operations with admin restrictions
- **Products**: Full CRUD with search and category filtering

### Security Features
- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Input validation with express-validator
- Error handling for database constraints

### Development Features
- Structured logging
- Environment-based configuration
- Graceful shutdown handling
- Health check endpoint

## Architecture Benefits

1. **Separation of Concerns**: Each layer has specific responsibilities
2. **Scalability**: Easy to add new features/models
3. **Maintainability**: Clear structure and modular design
4. **Security**: Multiple layers of security protection
5. **Type Safety**: Prisma provides type-safe database operations

This system demonstrates **enterprise-level backend architecture** suitable for production applications and showcases understanding of **modern Node.js development practices**.