#!/bin/bash

# Load Balancer Setup Script
# This script sets up a complete load-balanced environment

set -e

echo "🚀 Setting up load balancer environment..."

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs/nginx
mkdir -p ssl
mkdir -p monitoring/grafana/dashboards
mkdir -p monitoring/grafana/provisioning/dashboards
mkdir -p monitoring/grafana/provisioning/datasources

# Generate self-signed SSL certificate for HTTPS (development only)
echo "🔐 Generating SSL certificate..."
if [ ! -f ssl/cert.pem ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/key.pem \
        -out ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    echo "✅ SSL certificate generated"
else
    echo "ℹ️  SSL certificate already exists"
fi

# Create Prometheus configuration
echo "📊 Creating Prometheus configuration..."
cat > monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'interview-backend'
    metrics_path: '/metrics'
    scrape_interval: 10s
    static_configs:
      - targets: ['app1:3000', 'app2:3000', 'app3:3000']
  - job_name: 'interview-backend-single'
    metrics_path: '/metrics'
    scrape_interval: 10s
    static_configs:
      - targets: ['app:3000']
EOF

# Create Grafana datasource configuration
echo "📈 Creating Grafana datasource..."
cat > monitoring/grafana/provisioning/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    uid: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

# Create Grafana dashboard provisioning
echo "📈 Creating Grafana dashboard provisioning..."
cat > monitoring/grafana/provisioning/dashboards/dashboard.yml << EOF
apiVersion: 1

providers:
  - name: interview-backend
    orgId: 1
    folder: Interview Backend
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

# Create starter Grafana dashboard
echo "📊 Creating Grafana dashboard..."
cat > monitoring/grafana/dashboards/interview-backend-overview.json << EOF
{
  "uid": "interview-backend-overview",
  "title": "Interview Backend Overview",
  "tags": ["backend", "prometheus", "nodejs"],
  "timezone": "browser",
  "schemaVersion": 39,
  "version": 1,
  "refresh": "10s",
  "time": {
    "from": "now-1h",
    "to": "now"
  },
  "templating": {
    "list": []
  },
  "panels": [
    {
      "type": "timeseries",
      "title": "HTTP Requests / sec",
      "gridPos": { "x": 0, "y": 0, "w": 12, "h": 8 },
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "targets": [
        {
          "expr": "sum(rate(app_http_requests_total[5m]))",
          "refId": "A"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "unit": "ops/s"
        },
        "overrides": []
      }
    },
    {
      "type": "timeseries",
      "title": "HTTP p95 Latency",
      "gridPos": { "x": 12, "y": 0, "w": 12, "h": 8 },
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(app_http_request_duration_seconds_bucket[5m])) by (le))",
          "refId": "A"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "unit": "s"
        },
        "overrides": []
      }
    },
    {
      "type": "timeseries",
      "title": "In-Flight Requests",
      "gridPos": { "x": 0, "y": 8, "w": 12, "h": 8 },
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "targets": [
        {
          "expr": "app_http_in_flight_requests",
          "refId": "A"
        }
      ]
    },
    {
      "type": "timeseries",
      "title": "Resident Memory",
      "gridPos": { "x": 12, "y": 8, "w": 12, "h": 8 },
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "targets": [
        {
          "expr": "app_process_resident_memory_bytes",
          "refId": "A"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "unit": "bytes"
        },
        "overrides": []
      }
    },
    {
      "type": "timeseries",
      "title": "Cache Hits",
      "gridPos": { "x": 0, "y": 16, "w": 12, "h": 8 },
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "targets": [
        {
          "expr": "app_cache_hits_total",
          "refId": "A"
        }
      ]
    },
    {
      "type": "timeseries",
      "title": "Job Queue Running",
      "gridPos": { "x": 12, "y": 16, "w": 12, "h": 8 },
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "targets": [
        {
          "expr": "app_job_queue_running",
          "refId": "A"
        }
      ]
    }
  ]
}
EOF

# Create environment file
echo "⚙️  Creating environment configuration..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Environment file created from .env.example"
    echo "🔧 Please update .env with your configuration"
else
    echo "ℹ️  Environment file already exists"
fi

# Function to display usage
show_usage() {
    echo ""
    echo "🎯 Load Balancer Setup Complete!"
    echo ""
    echo "📋 Available commands:"
    echo "  ./load-balancer-setup.sh setup              # Initial setup"
    echo "  ./load-balancer-setup.sh start-dev          # Start development (2 instances)"
    echo "  ./load-balancer-setup.sh start              # Start production (3 instances)"
    echo "  ./load-balancer-setup.sh start-jwt          # Start with JWT authentication"
    echo "  ./load-balancer-setup.sh start-scaled       # Start with scaled instances"
    echo "  ./load-balancer-setup.sh status             # Show service status"
    echo "  ./load-balancer-setup.sh logs               # Show service logs"
    echo "  ./load-balancer-setup.sh stop               # Stop production services"
    echo "  ./load-balancer-setup.sh stop-dev           # Stop development services"
    echo "  ./load-balancer-setup.sh stop-jwt           # Stop JWT services"
    echo "  ./load-balancer-setup.sh stop-scaled        # Stop scaled services"
    echo "  ./load-balancer-setup.sh restart            # Restart production services"
    echo "  ./load-balancer-setup.sh clean              # Clean up all resources"
    echo ""
    echo "🌐 Access points:"
    echo "  Main API:        http://localhost"
    echo "  Health Check:    http://localhost/health"
    echo "  API Docs:        http://localhost/api"
    echo "  JWT Service:     http://localhost:3001/health (JWT only)"
    echo "  Prometheus:      http://localhost:9090 (production/JWT only)"
    echo "  Grafana:         http://localhost:3001 (production/JWT only)"
    echo ""
    echo "🔐 JWT Features:"
    echo "  - Token validation at Nginx level"
    echo "  - Role-based access control"
    echo "  - Token blacklisting and refresh"
    echo "  - Centralized JWT service"
    echo "  - Enhanced security logging"
    echo ""
    echo "📊 Monitoring:"
    echo "  - Prometheus metrics at :9090"
    echo "  - Grafana dashboards at :3001"
    echo "  - Nginx logs in ./logs/nginx/"
    echo "  - JWT service logs"
    echo ""
    echo "🔧 Load Balancing Features:"
    echo "  - Round-robin load balancing"
    echo "  - Health checks with failover"
    echo "  - Rate limiting per endpoint"
    echo "  - JWT-based authentication"
    echo "  - Gzip compression"
    echo "  - Security headers"
    echo "  - Static file serving"
    echo ""
}

# Check if Docker and Docker Compose are installed
check_dependencies() {
    echo "🔍 Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo "❌ Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    echo "✅ Dependencies check passed"
}

# Function to start JWT-enabled load balancer
start_jwt() {
    echo "🔐 Starting JWT-enabled load balancer..."
    docker-compose -f docker-compose.jwt.yml up -d
    echo "⏳ Waiting for services to start..."
    sleep 15
    show_usage
}

# Function to start development load balancer
start_dev() {
    echo "🚀 Starting development load balancer..."
    docker-compose -f docker-compose.dev.lb.yml up -d
    echo "⏳ Waiting for services to start..."
    sleep 10
    show_usage
}

# Function to start the load balancer
start_lb() {
    echo "🚀 Starting load balancer with 3 app instances..."
    docker-compose -f docker-compose.lb.yml up -d
    echo "⏳ Waiting for services to start..."
    sleep 10
    show_usage
}

# Function to start scaled environment
start_scaled() {
    echo "🚀 Starting scaled environment..."
    docker-compose -f docker-compose.scale.yml up -d
    echo "⏳ Waiting for services to start..."
    sleep 10
    show_usage
}

# Function to show status
show_status() {
    echo "📊 Service Status:"
    docker-compose -f docker-compose.lb.yml ps
}

# Function to show logs
show_logs() {
    echo "📋 Service Logs:"
    docker-compose -f docker-compose.lb.yml logs -f --tail=50
}

# Main execution
case "${1:-setup}" in
    "setup")
        check_dependencies
        show_usage
        ;;
    "start-dev")
        start_dev
        ;;
    "start")
        start_lb
        ;;
    "start-jwt")
        start_jwt
        ;;
    "start-scaled")
        start_scaled
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "stop")
        echo "🛑 Stopping production services..."
        docker-compose -f docker-compose.lb.yml down
        ;;
    "stop-dev")
        echo "🛑 Stopping development services..."
        docker-compose -f docker-compose.dev.lb.yml down
        ;;
    "stop-jwt")
        echo "🛑 Stopping JWT services..."
        docker-compose -f docker-compose.jwt.yml down
        ;;
    "stop-scaled")
        echo "🛑 Stopping scaled services..."
        docker-compose -f docker-compose.scale.yml down
        ;;
    "restart")
        echo "🔄 Restarting production services..."
        docker-compose -f docker-compose.lb.yml restart
        ;;
    "clean")
        echo "🧹 Cleaning up..."
        docker-compose -f docker-compose.lb.yml down -v
        docker-compose -f docker-compose.dev.lb.yml down -v
        docker-compose -f docker-compose.jwt.yml down -v
        docker-compose -f docker-compose.scale.yml down -v
        docker system prune -f
        ;;
    *)
        echo "Usage: $0 {setup|start-dev|start|start-jwt|start-scaled|status|logs|stop|stop-dev|stop-jwt|stop-scaled|restart|clean}"
        exit 1
        ;;
esac
