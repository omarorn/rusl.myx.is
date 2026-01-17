#!/bin/bash
# TrashPi Setup Script
# Run on Raspberry Pi OS (Bookworm)

set -e

echo "=== TrashPi Setup ==="

# Update system
echo "Updating system..."
sudo apt update && sudo apt upgrade -y

# Install dependencies
echo "Installing dependencies..."
sudo apt install -y \
    python3-pip \
    python3-venv \
    python3-pygame \
    python3-picamera2 \
    python3-numpy \
    python3-pil \
    espeak \
    libespeak1

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv ~/trashpi/venv
source ~/trashpi/venv/bin/activate

# Install Python packages
echo "Installing Python packages..."
pip install --upgrade pip
pip install -r ~/trashpi/requirements.txt

# Download TFLite model
echo "Downloading TFLite model..."
mkdir -p ~/trashpi/models
# Note: Replace with actual model URL
# wget -O ~/trashpi/models/trashnet.tflite "https://example.com/trashnet.tflite"

# Enable camera
echo "Enabling camera..."
sudo raspi-config nonint do_camera 0

# Enable SPI for LEDs
echo "Enabling SPI..."
sudo raspi-config nonint do_spi 0

# Create systemd service
echo "Creating systemd service..."
sudo tee /etc/systemd/system/trashpi.service > /dev/null <<EOF
[Unit]
Description=TrashPi Waste Classification
After=network.target

[Service]
ExecStart=/home/pi/trashpi/venv/bin/python /home/pi/trashpi/main.py
WorkingDirectory=/home/pi/trashpi
User=pi
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Enable service
sudo systemctl daemon-reload
sudo systemctl enable trashpi.service

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Download TFLite model to ~/trashpi/models/trashnet.tflite"
echo "2. Reboot: sudo reboot"
echo "3. Check status: sudo systemctl status trashpi"
echo ""
