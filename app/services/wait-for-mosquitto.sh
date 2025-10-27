#!/bin/bash
# Đợi đến khi port 1883 mở rồi mới chạy collector
until nc -z localhost 1883; do
  echo "⏳ Waiting for Mosquitto to be ready..."
  sleep 2
done
echo "✅ Mosquitto ready, starting MQTT service..."
exec python3 /home/pi/Desktop/ws/RaspberryPi4B-Server/app/services/mqtt_service.py
#!/bin/bash
# Đợi đến khi port 1883 mở rồi mới chạy collector
until nc -z localhost 1883; do
  echo "⏳ Waiting for Mosquitto to be ready..."
  sleep 2
done
echo "✅ Mosquitto ready, starting MQTT service..."
exec python3 /home/pi/Desktop/ws/RaspberryPi4B-Server/app/services/mqtt_service.py
