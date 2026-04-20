let client;
let metricsEnabled = false;

try {
  client = require('prom-client');
  metricsEnabled = true;
} catch (error) {
  client = null;
}

const metricsProviders = {
  getCacheStats: null,
  getJobStats: null,
};

function normalizeRoute(req) {
  const routePath = req.route?.path;

  if (routePath) {
    const baseUrl = req.baseUrl || '';
    return `${baseUrl}${routePath}` || routePath;
  }

  const rawPath = (req.originalUrl || req.path || '/').split('?')[0];
  return rawPath
    .replace(/\/[0-9a-fA-F-]{8,}(?=\/|$)/g, '/:id')
    .replace(/\/\d+(?=\/|$)/g, '/:id');
}

if (!metricsEnabled) {
  function metricsMiddleware(req, res, next) {
    next();
  }

  async function metricsHandler(req, res) {
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.end('# Prometheus metrics are disabled because prom-client is not installed\n');
  }

  function setMetricsProviders(providers = {}) {
    metricsProviders.getCacheStats = providers.getCacheStats || null;
    metricsProviders.getJobStats = providers.getJobStats || null;
  }

  module.exports = {
    register: null,
    metricsMiddleware,
    metricsHandler,
    setMetricsProviders,
    normalizeRoute,
    metricsEnabled: false,
  };
  return;
}

const appName = process.env.npm_package_name || 'interview-backend';
const appEnvironment = process.env.NODE_ENV || 'development';

const register = new client.Registry();
register.setDefaultLabels({
  app: appName,
  environment: appEnvironment,
});

client.collectDefaultMetrics({
  register,
  prefix: 'app_',
});

const httpRequestsTotal = new client.Counter({
  name: 'app_http_requests_total',
  help: 'Total number of HTTP requests received',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'app_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

const httpInFlightRequests = new client.Gauge({
  name: 'app_http_in_flight_requests',
  help: 'Number of HTTP requests currently in progress',
  registers: [register],
});

const httpRequestSizeBytes = new client.Histogram({
  name: 'app_http_request_size_bytes',
  help: 'HTTP request body size in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
  registers: [register],
});

const cacheHitsGauge = new client.Gauge({
  name: 'app_cache_hits_total',
  help: 'Total cache hits observed by the application',
  registers: [register],
  collect() {
    try {
      if (typeof metricsProviders.getCacheStats !== 'function') {
        this.set(0);
        return;
      }

      const stats = metricsProviders.getCacheStats();
      this.set(Number(stats?.hits || 0));
    } catch (error) {
      this.set(0);
    }
  },
});

const cacheMissesGauge = new client.Gauge({
  name: 'app_cache_misses_total',
  help: 'Total cache misses observed by the application',
  registers: [register],
  collect() {
    try {
      if (typeof metricsProviders.getCacheStats !== 'function') {
        this.set(0);
        return;
      }

      const stats = metricsProviders.getCacheStats();
      this.set(Number(stats?.misses || 0));
    } catch (error) {
      this.set(0);
    }
  },
});

const jobQueueSizeGauge = new client.Gauge({
  name: 'app_job_queue_total',
  help: 'Total number of jobs currently known to the queue',
  registers: [register],
  collect() {
    try {
      if (typeof metricsProviders.getJobStats !== 'function') {
        this.set(0);
        return;
      }

      const stats = metricsProviders.getJobStats();
      this.set(Number(stats?.total || 0));
    } catch (error) {
      this.set(0);
    }
  },
});

const jobQueuePendingGauge = new client.Gauge({
  name: 'app_job_queue_pending',
  help: 'Number of jobs waiting to be processed',
  registers: [register],
  collect() {
    try {
      if (typeof metricsProviders.getJobStats !== 'function') {
        this.set(0);
        return;
      }

      const stats = metricsProviders.getJobStats();
      this.set(Number(stats?.pending || 0));
    } catch (error) {
      this.set(0);
    }
  },
});

const jobQueueRunningGauge = new client.Gauge({
  name: 'app_job_queue_running',
  help: 'Number of jobs currently being processed',
  registers: [register],
  collect() {
    try {
      if (typeof metricsProviders.getJobStats !== 'function') {
        this.set(0);
        return;
      }

      const stats = metricsProviders.getJobStats();
      this.set(Number(stats?.running || 0));
    } catch (error) {
      this.set(0);
    }
  },
});

function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  const routeLabel = () => normalizeRoute(req);
  let recorded = false;

  httpInFlightRequests.inc();

  const recordMetrics = () => {
    if (recorded) {
      return;
    }

    recorded = true;
    httpInFlightRequests.dec();

    const elapsedSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const statusCode = String(res.statusCode || 0);
    const method = req.method || 'UNKNOWN';
    const route = routeLabel();

    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    httpRequestDurationSeconds.observe(
      { method, route, status_code: statusCode },
      elapsedSeconds
    );

    const contentLength = Number(req.headers['content-length'] || 0);
    if (contentLength > 0) {
      httpRequestSizeBytes.observe({ method, route }, contentLength);
    }
  };

  res.on('finish', recordMetrics);
  res.on('close', recordMetrics);

  next();
}

async function metricsHandler(req, res) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

function setMetricsProviders(providers = {}) {
  metricsProviders.getCacheStats = providers.getCacheStats || null;
  metricsProviders.getJobStats = providers.getJobStats || null;
}

module.exports = {
  register,
  metricsMiddleware,
  metricsHandler,
  setMetricsProviders,
  normalizeRoute,
  metricsEnabled,
};
