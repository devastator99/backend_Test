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
mkdir -p monitoring/grafana/datasources

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

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'node-app'
    static_configs:
      - targets: ['app1:3000', 'app2:3000', 'app3:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'postgres'
    static_configs:
      - targets: ['db:5432']
EOF

# Create Grafana datasource configuration
echo "📈 Creating Grafana datasource..."
cat > monitoring/grafana/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
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
    echo "  ./load-balancer-setup.sh start-scaled       # Start with scaled instances"
    echo "  ./load-balancer-setup.sh status             # Show service status"
    echo "  ./load-balancer-setup.sh logs               # Show service logs"
    echo "  ./load-balancer-setup.sh stop               # Stop production services"
    echo "  ./load-balancer-setup.sh stop-dev           # Stop development services"
    echo "  ./load-balancer-setup.sh stop-scaled        # Stop scaled services"
    echo "  ./load-balancer-setup.sh restart            # Restart production services"
    echo "  ./load-balancer-setup.sh clean              # Clean up all resources"
    echo ""
    echo "🌐 Access points:"
    echo "  Main API:        http://localhost"
    echo "  Health Check:    http://localhost/health"
    echo "  API Docs:        http://localhost/api"
    echo "  Prometheus:      http://localhost:9090 (production only)"
    echo "  Grafana:         http://localhost:3001 (production only)"
    echo ""
    echo "📊 Monitoring:"
    echo "  - Prometheus metrics at :9090 (production only)"
    echo "  - Grafana dashboards at :3001 (production only)"
    echo "  - Nginx logs in ./logs/nginx/"
    echo ""
    echo "🔧 Load Balancing Features:"
    echo "  - Round-robin load balancing"
    echo "  - Health checks with failover"
    echo "  - Rate limiting per endpoint"
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
        docker-compose -f docker-compose.scale.yml down -v
        docker system prune -f
        ;;
    *)
        echo "Usage: $0 {setup|start-dev|start|start-scaled|status|logs|stop|stop-dev|stop-scaled|restart|clean}"
        exit 1
        ;;
esac
