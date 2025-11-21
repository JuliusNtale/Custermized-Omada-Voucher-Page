#!/bin/bash

# Quick Test Script for Omada WhatsApp Integration
# Run this after setup to verify everything is working

echo "🧪 Testing Omada WhatsApp Integration..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test functions
test_service() {
    local service_name=$1
    local url=$2
    local expected=$3
    
    echo -n "Testing $service_name... "
    
    if curl -s --connect-timeout 5 "$url" | grep -q "$expected"; then
        echo -e "${GREEN}✅ PASS${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        return 1
    fi
}

# Test Docker services
echo "📦 Checking Docker services..."
docker-compose ps

echo ""
echo "🌐 Testing service endpoints..."

# Test WhatsApp backend
test_service "WhatsApp Backend Health" "http://localhost:8080/health" "healthy"

# Test Nginx proxy
test_service "Nginx Proxy" "http://localhost/health" "healthy"

# Test Omada Controller (may take time to start)
echo -n "Testing Omada Controller... "
if curl -s -k --connect-timeout 10 "https://localhost:8043" | grep -q "Omada\|TP-Link\|controller"; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${YELLOW}⚠️  STARTING (Controller may still be starting up)${NC}"
fi

echo ""
echo "📱 Testing WhatsApp functionality..."

# Test WhatsApp API
echo -n "Testing WhatsApp API... "
response=$(curl -s -w "%{http_code}" http://localhost:8080/test)
http_code=$(echo "$response" | tail -c 4)

if [[ "$http_code" == "200" ]]; then
    echo -e "${GREEN}✅ PASS - Check your WhatsApp for test message${NC}"
else
    echo -e "${RED}❌ FAIL - HTTP $http_code${NC}"
fi

echo ""
echo "🔍 Service Status Summary:"
echo "=========================="

# Docker container status
echo "Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(omada|whatsapp|nginx)"

echo ""
echo "Port Usage:"
netstat -tlnp 2>/dev/null | grep -E ":(80|443|8043|8080|8088)" | head -10

echo ""
echo "📋 Service URLs:"
echo "==============="
IP=$(hostname -I | awk '{print $1}')
echo "🌐 Omada Controller:  https://$IP:8043"
echo "📱 Portal HTTP:       http://$IP/portal/"
echo "🔧 WhatsApp Backend:  http://$IP:8080"
echo "❤️  Health Check:      http://$IP/health"

echo ""
echo "🚀 Quick Actions:"
echo "================"
echo "View logs:     docker-compose logs -f [service_name]"
echo "Restart all:   docker-compose restart"
echo "Stop all:      docker-compose down"
echo "Update:        docker-compose pull && docker-compose up -d"

echo ""
echo "🔧 Manual Tests:"
echo "==============="
echo "1. Browser test:   Open http://$IP/portal/captive-portal-test.html"
echo "2. API test:       curl http://$IP:8080/test"
echo "3. Portal test:    Connect device to guest network"

echo ""
if docker ps | grep -q omada && docker ps | grep -q whatsapp && docker ps | grep -q nginx; then
    echo -e "${GREEN}🎉 All services are running! Setup appears successful.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Configure Omada Controller portal settings"
    echo "2. Set portal URL to: http://$IP/portal/index.html"
    echo "3. Test with a guest device"
else
    echo -e "${RED}⚠️  Some services are not running. Check logs with: docker-compose logs${NC}"
fi
