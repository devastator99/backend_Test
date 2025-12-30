const NodeCache = require('node-cache');
const logger = require('./logger');

class CacheService {
  constructor(options = {}) {
    this.cache = new NodeCache({
      stdTTL: options.ttl || 300, // 5 minutes default
      checkperiod: options.checkPeriod || 60, // 1 minute
      useClones: false,
      deleteOnExpire: true,
      enableLegacyCallbacks: false,
      maxKeys: options.maxKeys || 1000,
    });

    this.cache.on('set', (key, value) => {
      logger.debug('Cache Set', { key, ttl: this.cache.getTtl(key) });
    });

    this.cache.on('del', (key, value) => {
      logger.debug('Cache Delete', { key });
    });

    this.cache.on('expired', (key, value) => {
      logger.debug('Cache Expired', { key });
    });
  }

  async get(key) {
    try {
      const value = this.cache.get(key);
      if (value !== undefined) {
        logger.debug('Cache Hit', { key });
        return value;
      }
      logger.debug('Cache Miss', { key });
      return null;
    } catch (error) {
      logger.error('Cache Get Error', { key, error: error.message });
      return null;
    }
  }

  async set(key, value, ttl) {
    try {
      const success = this.cache.set(key, value, ttl);
      if (success) {
        logger.debug('Cache Set Success', { key, ttl });
      } else {
        logger.warn('Cache Set Failed', { key });
      }
      return success;
    } catch (error) {
      logger.error('Cache Set Error', { key, error: error.message });
      return false;
    }
  }

  async del(key) {
    try {
      const deleted = this.cache.del(key);
      logger.debug('Cache Delete', { key, deleted });
      return deleted > 0;
    } catch (error) {
      logger.error('Cache Delete Error', { key, error: error.message });
      return false;
    }
  }

  async flush() {
    try {
      const flushed = this.cache.flushAll();
      logger.info('Cache Flushed', { keys: flushed });
      return flushed;
    } catch (error) {
      logger.error('Cache Flush Error', { error: error.message });
      return false;
    }
  }

  async mget(keys) {
    try {
      const values = this.cache.mget(keys);
      logger.debug('Cache MGet', { keys, found: Object.keys(values).length });
      return values;
    } catch (error) {
      logger.error('Cache MGet Error', { keys, error: error.message });
      return {};
    }
  }

  async mset(keyValuePairs, ttl) {
    try {
      const success = this.cache.mset(keyValuePairs);
      if (success) {
        logger.debug('Cache MSet Success', { keys: Object.keys(keyValuePairs), ttl });
      } else {
        logger.warn('Cache MSet Failed', { keys: Object.keys(keyValuePairs) });
      }
      return success;
    } catch (error) {
      logger.error('Cache MSet Error', { keys: Object.keys(keyValuePairs), error: error.message });
      return false;
    }
  }

  getStats() {
    return this.cache.getStats();
  }

  getKeys() {
    return this.cache.keys();
  }

  has(key) {
    return this.cache.has(key);
  }

  getTtl(key) {
    return this.cache.getTtl(key);
  }

  async getOrSet(key, fetchFunction, ttl) {
    try {
      let value = await this.get(key);
      
      if (value === null) {
        value = await fetchFunction();
        if (value !== null && value !== undefined) {
          await this.set(key, value, ttl);
        }
      }
      
      return value;
    } catch (error) {
      logger.error('Cache GetOrSet Error', { key, error: error.message });
      throw error;
    }
  }

  invalidatePattern(pattern) {
    try {
      const keys = this.cache.keys();
      const regex = new RegExp(pattern);
      const matchingKeys = keys.filter(key => regex.test(key));
      const deleted = this.cache.del(matchingKeys);
      
      logger.info('Cache Pattern Invalidation', { pattern, keys: matchingKeys, deleted });
      return deleted;
    } catch (error) {
      logger.error('Cache Pattern Invalidation Error', { pattern, error: error.message });
      return 0;
    }
  }
}

const cacheService = new CacheService({
  ttl: 300, // 5 minutes
  maxKeys: 1000,
});

const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}:${JSON.stringify(req.query)}`;
    
    try {
      const cachedResponse = await cacheService.get(key);
      
      if (cachedResponse) {
        logger.debug('Cache Middleware Hit', { key, url: req.originalUrl });
        return res.json(cachedResponse);
      }

      const originalJson = res.json;
      res.json = function(data) {
        cacheService.set(key, data, ttl);
        logger.debug('Cache Middleware Set', { key, url: req.originalUrl });
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache Middleware Error', { key, error: error.message });
      next();
    }
  };
};

const invalidateCache = (pattern) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      cacheService.invalidatePattern(pattern);
      logger.debug('Cache Invalidation', { pattern });
      return originalJson.call(this, data);
    };

    next();
  };
};

module.exports = {
  CacheService,
  cacheService,
  cacheMiddleware,
  invalidateCache,
};
