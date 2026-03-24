#!/bin/bash
set -e
echo "Building frontend..."
cd ~/dilab-monitor/frontend && npm run build

echo "Deploying to web root..."
sudo cp -r dist/. /var/www/dilab-monitor/
sudo chown -R www-data:www-data /var/www/dilab-monitor

echo "Restarting backend..."
sudo systemctl restart dilab-monitor

echo "Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "Done! https://dilab2.ssu.ac.kr"
