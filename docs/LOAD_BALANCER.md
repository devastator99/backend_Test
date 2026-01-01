# Load Balancer Configuration

This document explains the load balancer setup for the interview backend system.

## 🏗️ Architecture Overview

The load balancer configuration provides a **production-ready, scalable architecture** with:

- **Nginx** as reverse proxy and load balancer
- **Multiple app instances** for horizontal scaling
- **Redis** for shared session storage and caching
- **PostgreSQL** as the primary database
- **Monitoring** with Prometheus and Grafana

## 📁 Configuration Files

### Core Files
- `nginx.conf` - Nginx load balancer configuration
- `docker-compose.lb.yml` - 3-instance load balancer setup
- `docker-compose.scale.yml` - Scalable app instances setup
- `load-balancer-setup.sh` - Automated setup script

### Monitoring Files
- `monitoring/prometheus.yml` - Prometheus configuration
- `monitoring/grafana/datasources/prometheus.yml` - Grafana datasource

## 🚀 Quick Start

### 1. Setup Environment
```bash
# Run the setup script
./load-balancer-setup.sh setup

# Or manually create directories
mkdir -p logs/nginx ssl monitoring/grafana/{dashboards,datasources}
```

### 2. Start Load Balancer

#### Option A: Fixed 3 Instances
```bash
./load-balancer-setup.sh start
# or
docker-compose -f docker-compose.lb.yml up -d
```

#### Option B: Scaled Instances
```bash
./load-balancer-setup.sh start-scaled
# or
docker-compose -f docker-compose.scale.yml up -d
```

### 3. Verify Setup
```bash
# Check service status
./load-balancer-setup.sh status

# View logs
./load-balancer-setup.sh logs

# Test load balancer
curl http://localhost/health
curl http://localhost/api
```

## 🌐 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Main API** | http://localhost | Load balanced API endpoints |
| **Health Check** | http://localhost/health | Service health status |
| **API Documentation** | http://localhost/api | API endpoints documentation |
| **Prometheus** | http://localhost:9090 | Metrics monitoring |
| **Grafana** | http://localhost:3001 | Visualization dashboards |
| **Static Files** | http://localhost/uploads/ | User avatars and uploads |

## ⚖️ Load Balancing Features

### Nginx Configuration

#### Upstream Servers
```nginx
upstream backend {
    least_conn;
    server app1:3000 max_fails=3 fail_timeout=30s;
    server app2:3000 max_fails=3 fail_timeout=30s;
    server app3:3000 max_fails=3 fail_timeout=30s;
}
```

#### Load Balancing Methods
- **Least Connections**: Routes to server with fewest active connections
- **Health Checks**: Automatic failover for unhealthy servers
- **Retry Logic**: Retries failed requests on other servers

#### Rate Limiting
```nginx
# Different limits for different endpoints
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/m;
```

### Security Features

#### Rate Limiting by Endpoint
- **General API**: 10 requests/second
- **Authentication**: 5 requests/minute
- **Upload**: 2 requests/minute

#### Connection Limiting
- **Per IP**: 20 concurrent connections
- **Global**: Configurable connection limits

#### Security Headers
```nginx
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
```

#### File Upload Security
- **Size limits**: 5MB max for uploads
- **Type restrictions**: Only images allowed
- **Static file serving**: Secure file access

## 📊 Monitoring

### Prometheus Metrics
- **Request latency**: Response times per endpoint
- **Request rate**: Requests per second
- **Error rate**: HTTP error percentages
- **Connection metrics**: Active connections

### Grafana Dashboards
- **System Overview**: CPU, memory, network usage
- **API Performance**: Response times and error rates
- **Load Balancer Stats**: Request distribution
- **Database Metrics**: Query performance

### Log Aggregation
```bash
# Nginx logs
tail -f logs/nginx/access.log
tail -f logs/nginx/error.log

# Application logs
docker-compose logs -f app1
docker-compose logs -f nginx
```

## 🔧 Configuration Options

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://postgres:password@db:5432/interview_db

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Node.js
NODE_ENV=production
PORT=3000
```

### Scaling Options

#### Horizontal Scaling
```yaml
# docker-compose.scale.yml
app:
  deploy:
    replicas: 3  # Adjust based on load
```

#### Resource Limits
```yaml
deploy:
  resources:
    limits:
      memory: 512M
    reservations:
      memory: 256M
```

## 🛠️ Management Commands

### Service Management
```bash
# Start services
docker-compose -f docker-compose.lb.yml up -d

# Stop services
docker-compose -f docker-compose.lb.yml down

# Restart services
docker-compose -f docker-compose.lb.yml restart

# Scale services
docker-compose -f docker-compose.scale.yml up -d --scale app=5
```

### Monitoring Commands
```bash
# View logs
docker-compose logs -f nginx
docker-compose logs -f app1

# Check health
curl http://localhost/health

# Monitor metrics
curl http://localhost:9090/targets
```

### Maintenance Commands
```bash
# Clean up
./load-balancer-setup.sh clean

# Update configuration
docker-compose -f docker-compose.lb.yml up -d --force-recreate

# Backup data
docker exec db pg_dump interview_db > backup.sql
```

## 🔒 Security Considerations

### Production Setup
1. **SSL/TLS**: Configure HTTPS with valid certificates
2. **Firewall**: Restrict access to monitoring endpoints
3. **Authentication**: Add authentication to Grafana
4. **Network**: Use private networks for internal communication

### SSL Configuration
Uncomment and configure HTTPS in `nginx.conf`:
```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... other SSL config
}
```

## 📈 Performance Optimization

### Nginx Tuning
```nginx
# Worker connections
worker_connections 1024;

# Gzip compression
gzip on;
gzip_comp_level 6;

# Keep-alive
keepalive_timeout 65;
```

### Application Optimization
- **Connection pooling**: Database connection reuse
- **Caching**: Redis for frequently accessed data
- **Compression**: Gzip for API responses
- **Static assets**: Efficient file serving

## 🚨 Troubleshooting

### Common Issues

#### Health Check Failures
```bash
# Check individual app health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health

# Check nginx configuration
docker exec nginx nginx -t
```

#### Load Balancer Not Working
```bash
# Check nginx logs
docker-compose logs nginx

# Test upstream servers
docker-compose exec app1 curl localhost:3000/health
```

#### High Memory Usage
```bash
# Monitor resource usage
docker stats

# Adjust resource limits
# Edit docker-compose files and restart
```

### Debug Commands
```bash
# Full system status
./load-balancer-setup.sh status

# Real-time logs
./load-balancer-setup.sh logs

# Network connectivity
docker network ls
docker network inspect backend_app-network
```

## 🔄 High Availability

### Failover Configuration
- **Health checks**: Automatic server health monitoring
- **Graceful degradation**: Continue serving with reduced capacity
- **Circuit breaker**: Stop sending traffic to failed servers

### Backup Strategies
- **Database backups**: Regular PostgreSQL dumps
- **Configuration backups**: Version control all config files
- **Monitoring data**: Export Grafana dashboards

## 📚 Additional Resources

- [Nginx Load Balancing Guide](https://nginx.org/en/docs/http/load_balancing.html)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Prometheus Monitoring](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/docs/)

This load balancer setup provides a **scalable, production-ready foundation** for the interview backend system.
