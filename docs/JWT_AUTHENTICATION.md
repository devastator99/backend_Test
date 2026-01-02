# JWT Authentication with Load Balancer

This document explains the JWT authentication implementation integrated with the load balancer system.

## 🔐 Architecture Overview

The JWT authentication system provides **enterprise-grade security** with:

- **Nginx-level JWT validation** for performance
- **Centralized JWT service** for token management
- **Redis-based token blacklisting** for security
- **Role-based access control** (RBAC)
- **Enhanced security logging** and monitoring

## 📁 JWT Components

### Core Files
- `nginx.jwt.conf` - Nginx configuration with JWT validation
- `nginx/jwt.js` - JavaScript JWT validation functions
- `docker-compose.jwt.yml` - JWT-enabled load balancer setup
- `src/jwtService.js` - Centralized JWT service

### Features
- **Token validation at edge** (Nginx level)
- **Token blacklisting** with Redis
- **Token refresh** mechanism
- **Role-based permissions**
- **Security monitoring**

## 🚀 Quick Start

### 1. Start JWT-Enabled Load Balancer
```bash
# Initial setup
./load-balancer-setup.sh setup

# Start with JWT authentication
./load-balancer-setup.sh start-jwt
```

### 2. Test Authentication
```bash
# Register a user
curl -X POST http://localhost/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","password":"Password123!"}'

# Login to get token
curl -X POST http://localhost/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'

# Use token for protected requests
curl -X GET http://localhost/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔐 JWT Implementation Details

### Nginx-Level Validation

#### JWT Extraction
```nginx
# Extract JWT from Authorization header
map $http_authorization $jwt_payload {
    default "";
    "~Bearer (.+)" $1;
}
```

#### Token Validation
```nginx
# JavaScript validation functions
js_include /etc/nginx/jwt.js;
js_set $jwt_user_id jwtUserId;
```

#### Protected Endpoints
```nginx
location ~ ^/api/users/profile$ {
    # JWT validation
    if ($http_authorization = "") {
        return 401;
    }
    
    if ($jwt_user_id = "") {
        return 401;
    }
    
    proxy_pass http://backend;
    proxy_set_header X-User-ID $jwt_user_id;
}
```

### JWT Service Features

#### Token Generation
```javascript
const token = jwtService.generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
}, '24h');
```

#### Token Validation
```javascript
const decoded = await jwtService.validateToken(token);
// Returns: { userId, email, role, iat, exp, iss, aud }
```

#### Token Blacklisting
```javascript
await jwtService.blacklistToken(token);
// Token added to Redis blacklist
```

#### Token Refresh
```javascript
const newToken = await jwtService.refreshToken(oldToken);
// Old token blacklisted, new token issued
```

## 🛡️ Security Features

### Multi-Layer Authentication

#### 1. Nginx Level (Edge Security)
- **Header validation**: Authorization header required
- **Token format validation**: Bearer token format
- **Basic JWT validation**: Signature and expiration
- **Rate limiting**: Per-endpoint rate limits

#### 2. Application Level (Business Logic)
- **User validation**: User exists and active
- **Role validation**: RBAC permissions
- **Session validation**: Token not blacklisted
- **Request context**: User attached to request

#### 3. Service Level (Token Management)
- **Centralized validation**: Single source of truth
- **Token blacklisting**: Immediate revocation
- **Token refresh**: Seamless token renewal
- **Audit logging**: Security event tracking

### Rate Limiting with JWT

#### User-Based Rate Limiting
```nginx
# Different limits for authenticated vs anonymous users
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $jwt_payload zone=user_api:10m rate=20r/s;
```

#### Endpoint-Specific Limits
- **Authentication**: 5 requests/minute (strict)
- **Upload**: 2 requests/minute (very strict)
- **General API**: 20 requests/second (authenticated)
- **Admin endpoints**: 15 requests/second (admin users)

### Security Headers
```nginx
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
```

## 📊 JWT Service API

### Health Check
```bash
curl http://localhost:3001/health
```

### Token Validation
```bash
curl -X POST http://localhost:3001/validate \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_JWT_TOKEN"}'
```

### Token Information
```bash
curl -X POST http://localhost:3001/info \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_JWT_TOKEN"}'
```

## 🔧 Configuration

### Environment Variables
```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=production

# Redis for Token Management
REDIS_URL=redis://redis:6379

# Service Configuration
PORT=3001
```

### JWT Token Structure
```json
{
  "userId": "user_id_here",
  "email": "user@example.com",
  "role": "USER|ADMIN",
  "iat": 1640995200,
  "exp": 1641081600,
  "iss": "interview-backend",
  "aud": "interview-api"
}
```

## 🚨 Security Monitoring

### JWT Security Logging
```javascript
// Token generation
securityLogger.logJWTGenerated(userId, role);

// Validation failures
securityLogger.logJWTValidationFailed(error.message);

// Token blacklisting
securityLogger.logJWTBlacklisted(jti);

// Suspicious activity
securityLogger.logSuspiciousActivity('JWT abuse detected', {
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  endpoint: req.originalUrl,
});
```

### Monitoring Metrics
- **Token generation rate**: New tokens issued per minute
- **Validation failures**: Invalid token attempts
- **Blacklist operations**: Tokens revoked
- **Role-based access**: Permission checks
- **Geographic anomalies**: Unusual access patterns

## 🔄 Token Lifecycle

### 1. Token Generation
```
User Login → Validate Credentials → Generate JWT → Return Token
```

### 2. Token Usage
```
Request with JWT → Nginx Validation → App Validation → Process Request
```

### 3. Token Refresh
```
Old Token → Validate → Blacklist Old → Generate New → Return New Token
```

### 4. Token Revocation
```
Logout/Admin Action → Blacklist Token → Immediate Invalidation
```

## 🛠️ Integration Examples

### Express Middleware
```javascript
const { jwtMiddleware, adminMiddleware } = require('./jwtService');

// Protected route
app.get('/api/users/profile', jwtMiddleware, (req, res) => {
    // req.user contains decoded JWT payload
    res.json({ user: req.user });
});

// Admin-only route
app.post('/api/admin/users', jwtMiddleware, adminMiddleware, (req, res) => {
    // Admin-only logic
    res.json({ message: 'Admin access granted' });
});
```

### Client-Side Usage
```javascript
// Login
const loginResponse = await fetch('/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
});

const { token } = await loginResponse.json();
localStorage.setItem('jwtToken', token);

// API calls with JWT
const profileResponse = await fetch('/api/users/profile', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`,
    },
});
```

## 🔒 Best Practices

### Token Security
- **Short expiration**: 24 hours default
- **Secure storage**: HttpOnly cookies or secure storage
- **HTTPS only**: Never transmit over HTTP
- **Rotation**: Regular secret key rotation

### Rate Limiting
- **User-based limits**: Higher limits for authenticated users
- **Endpoint-specific**: Stricter limits for sensitive operations
- **Progressive penalties**: Increasing restrictions for abuse

### Monitoring
- **Security events**: Log all JWT-related security events
- **Performance metrics**: Monitor validation performance
- **Anomaly detection**: Flag unusual token usage patterns

## 🚀 Advanced Features

### Token Blacklisting
- **Immediate revocation**: Tokens invalidated instantly
- **Redis-based**: Fast lookup and management
- **Automatic cleanup**: Expired tokens removed automatically

### Role-Based Access Control
```javascript
// Role-based middleware
const roleMiddleware = (allowedRoles) => (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
};
```

### Multi-Tenant Support
```javascript
// Tenant-specific tokens
const token = jwtService.generateToken({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
});
```

## 📈 Performance Optimization

### Nginx Caching
- **JWT validation cache**: Cache validation results
- **Rate limiting memory**: In-memory rate limiting
- **Static file caching**: Optimize static assets

### Redis Optimization
- **Connection pooling**: Reuse Redis connections
- **Pipeline operations**: Batch Redis operations
- **Memory management**: Optimize Redis memory usage

## 🔧 Troubleshooting

### Common Issues

#### JWT Validation Fails
```bash
# Check JWT service health
curl http://localhost:3001/health

# Validate token manually
curl -X POST http://localhost:3001/validate \
  -d '{"token":"YOUR_TOKEN"}'
```

#### Rate Limiting Issues
```bash
# Check Nginx logs
docker-compose logs nginx

# Monitor Redis rate limit keys
docker exec redis redis-cli keys "*limit*"
```

#### Token Blacklisting
```bash
# Check blacklist
docker exec redis redis-cli keys "blacklist:*"

# Clear blacklist (emergency)
docker exec redis redis-cli flushdb
```

### Debug Commands
```bash
# JWT service logs
docker-compose logs jwt-service

# Nginx configuration test
docker exec nginx nginx -t

# Redis connection test
docker exec redis redis-cli ping
```

This JWT authentication system provides **enterprise-grade security** with **edge-level validation**, **centralized management**, and **comprehensive monitoring** for the load-balanced backend system.
