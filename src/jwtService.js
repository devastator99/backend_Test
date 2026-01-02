const jwt = require('jsonwebtoken');
const Redis = require('ioredis');
const { securityLogger } = require('./utils/logger');

class JWTService {
  constructor() {
    this.redis = process.env.REDIS_URL 
      ? new Redis(process.env.REDIS_URL)
      : null;
    this.jwtSecret = process.env.JWT_SECRET;
    this.issuer = 'interview-backend';
    this.audience = 'interview-api';
  }

  generateToken(payload, expiresIn = '24h') {
    try {
      const tokenPayload = {
        ...payload,
        iss: this.issuer,
        aud: this.audience,
        iat: Math.floor(Date.now() / 1000),
      };

      const token = jwt.sign(tokenPayload, this.jwtSecret, { expiresIn });
      
      // Store token in Redis for blacklist management
      if (this.redis) {
        const jti = this.getJTI(token);
        this.redis.setex(`token:${jti}`, this.getExpirationTime(expiresIn), 'valid');
      }

      securityLogger.logJWTGenerated(payload.userId, payload.role);
      return token;
    } catch (error) {
      securityLogger.logJWTError('Token generation failed', error);
      throw new Error('Failed to generate token');
    }
  }

  async validateToken(token) {
    try {
      if (!token) {
        throw new Error('No token provided');
      }

      // Remove Bearer prefix if present
      const cleanToken = token.replace(/^Bearer\s+/, '');

      // Check if token is blacklisted
      if (this.redis) {
        const jti = this.getJTI(cleanToken);
        const isBlacklisted = await this.redis.get(`blacklist:${jti}`);
        if (isBlacklisted) {
          throw new Error('Token is blacklisted');
        }
      }

      const decoded = jwt.verify(cleanToken, this.jwtSecret, {
        issuer: this.issuer,
        audience: this.audience,
      });

      return decoded;
    } catch (error) {
      securityLogger.logJWTValidationFailed(error.message);
      throw new Error(`Invalid token: ${error.message}`);
    }
  }

  async refreshToken(oldToken) {
    try {
      const decoded = await this.validateToken(oldToken);
      
      // Blacklist old token
      await this.blacklistToken(oldToken);

      // Generate new token
      const newToken = this.generateToken({
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      });

      securityLogger.logJWTRefreshed(decoded.userId);
      return newToken;
    } catch (error) {
      securityLogger.logJWTError('Token refresh failed', error);
      throw new Error('Failed to refresh token');
    }
  }

  async blacklistToken(token) {
    try {
      const jti = this.getJTI(token);
      const decoded = jwt.decode(token);
      const remainingTime = decoded.exp - Math.floor(Date.now() / 1000);

      if (remainingTime > 0 && this.redis) {
        await this.redis.setex(`blacklist:${jti}`, remainingTime, 'blacklisted');
        securityLogger.logJWTBlacklisted(jti);
      }
    } catch (error) {
      securityLogger.logJWTError('Token blacklisting failed', error);
    }
  }

  async revokeAllUserTokens(userId) {
    try {
      if (!this.redis) {
        throw new Error('Redis not available for token revocation');
      }

      // Get all user tokens (this would require storing user-token mappings)
      const pattern = `user:${userId}:token:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        securityLogger.logJWTAllTokensRevoked(userId, keys.length);
      }

      return { revoked: keys.length };
    } catch (error) {
      securityLogger.logJWTError('Mass token revocation failed', error);
      throw new Error('Failed to revoke user tokens');
    }
  }

  async getTokenInfo(token) {
    try {
      const decoded = jwt.decode(token);
      
      if (!decoded) {
        throw new Error('Invalid token format');
      }

      const isExpired = decoded.exp < Math.floor(Date.now() / 1000);
      const timeToExpiry = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));

      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        issuer: decoded.iss,
        audience: decoded.aud,
        issuedAt: new Date(decoded.iat * 1000),
        expiresAt: new Date(decoded.exp * 1000),
        isExpired,
        timeToExpiry,
      };
    } catch (error) {
      throw new Error(`Failed to decode token: ${error.message}`);
    }
  }

  getJTI(token) {
    try {
      const decoded = jwt.decode(token);
      return decoded.jti || `${decoded.userId}_${decoded.iat}`;
    } catch (error) {
      return `unknown_${Date.now()}`;
    }
  }

  getExpirationTime(expiresIn) {
    const timeMap = {
      '15m': 900,
      '30m': 1800,
      '1h': 3600,
      '2h': 7200,
      '24h': 86400,
      '7d': 604800,
    };

    return timeMap[expiresIn] || 3600;
  }

  async cleanupExpiredTokens() {
    try {
      if (!this.redis) return;

      // Clean up expired tokens from Redis
      const patterns = ['token:*', 'blacklist:*'];
      
      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        for (const key of keys) {
          const ttl = await this.redis.ttl(key);
          if (ttl === -1) { // No expiration set
            await this.redis.del(key);
          }
        }
      }

      securityLogger.logJWTCleanupCompleted();
    } catch (error) {
      securityLogger.logJWTError('Token cleanup failed', error);
    }
  }

  // Health check method
  async healthCheck() {
    try {
      const testPayload = { userId: 'health-check', role: 'USER' };
      const testToken = this.generateToken(testPayload, '1m');
      const validated = await this.validateToken(testToken);
      
      await this.blacklistToken(testToken);
      
      return {
        status: 'healthy',
        redis: this.redis ? 'connected' : 'not available',
        tokenGeneration: 'working',
        tokenValidation: 'working',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Create singleton instance
const jwtService = new JWTService();

// Express middleware for JWT validation
const jwtMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header required',
        timestamp: new Date().toISOString(),
      });
    }

    const decoded = await jwtService.validateToken(token);
    req.user = decoded;
    req.token = token;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// Admin role middleware
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

// Start JWT service if run directly
if (require.main === module) {
  const express = require('express');
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/health', async (req, res) => {
    const health = await jwtService.healthCheck();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  });

  // Token validation endpoint
  app.post('/validate', async (req, res) => {
    try {
      const { token } = req.body;
      const decoded = await jwtService.validateToken(token);
      res.json({
        success: true,
        valid: true,
        data: decoded,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        valid: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Token info endpoint
  app.post('/info', async (req, res) => {
    try {
      const { token } = req.body;
      const info = await jwtService.getTokenInfo(token);
      res.json({
        success: true,
        data: info,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Cleanup expired tokens (run periodically)
  setInterval(() => {
    jwtService.cleanupExpiredTokens();
  }, 60000); // Every minute

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🔐 JWT Service running on port ${PORT}`);
  });
}

module.exports = {
  JWTService,
  jwtService,
  jwtMiddleware,
  adminMiddleware,
};
