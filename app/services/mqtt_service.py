import os
import json
import time
from datetime import datetime
import paho.mqtt.client as mqtt
from .db import PostgresDB
import dotenv
dotenv.load_dotenv()

class MqttService:
    """MQTT collector: đọc dữ liệu từ topic vbox/summary và ghi vào PostgreSQL."""

    def __init__(self, broker="", port=1883, username="", password="", client_id="", topic=""):
        # --- MQTT configuration ---
        if not broker and not username and not password and not client_id and not topic:
            broker = os.getenv('MQTT_BROKER')
            port = int(os.getenv('MQTT_PORT', 1883))
            username = os.getenv('MQTT_USERNAME')
            password = os.getenv('MQTT_PASSWORD')
            client_id = os.getenv('MQTT_CLIENT_ID')
            topic = os.getenv('MQTT_TOPIC')

        self.broker = broker
        self.port = port
        self.username = username
        self.password = password
        self.client_id = client_id
        self.topic = topic

        # --- DB service ---
        self.db = PostgresDB()

        # --- MQTT client setup ---
        self.client = mqtt.Client(self.client_id)
        if self.username and self.password:
            self.client.username_pw_set(self.username, self.password)
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message

    # ------------------------------------------------------------------
    # MQTT EVENTS
    # ------------------------------------------------------------------
    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            # print(f"✅ Connected to MQTT broker at {self.broker}:{self.port}")
            self.client.subscribe(self.topic)
            # print(f"📡 Subscribed to topic: {self.topic}")
        else:
            print(f"❌ MQTT connection failed (rc={rc})")

    def on_message(self, client, userdata, msg):
        """Handle incoming MQTT messages."""
        try:
            payload = json.loads(msg.payload.decode())
            print(f"[MQTT] {msg.topic}: {payload}")

            device_id = int(payload.get("device", 0))
            timestamp = payload.get("timestamp") or datetime.now().isoformat()

            # Mở kết nối DB (với retry)
            if not self.connect_db_with_retry():
                print("❌ Database not ready, skipping this message.")
                return

            for key, value in payload.items():
                if key in ["device", "area_id", "machine", "timestamp"]:
                    continue
                if not isinstance(value, (int, float)):
                    continue

                # Tìm channel_id (sử dụng channel_name để khớp schema thật)
                rows = self.db.execute_query(
                    "SELECT channel_id FROM channel WHERE device_id = %s AND channel_name = %s",
                    (device_id, key)
                )

                if not rows:
                    print(f"⚠️ Channel not found for device={device_id}, channel_name={key}")
                    continue

                channel_id = rows[0]["channel_id"]

                # Ghi vào measurement
                quality = 'Good' if value > 0 else 'Uncertain'
                self.db.execute_non_query(
                    """
                    INSERT INTO measurement (channel_id, value, quality, ts)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (channel_id, float(value), quality, timestamp)
                )


                # print(f"💾 Inserted {key}={value} → channel_id={channel_id}")

        except Exception as e:
            print(f"❌ Error processing MQTT message: {e}")

    # ------------------------------------------------------------------
    # DATABASE MANAGEMENT
    # ------------------------------------------------------------------
    def connect_db_with_retry(self, retries=5, delay=2):
        """Try reconnecting to DB a few times if it's not ready."""
        for attempt in range(retries):
            try:
                self.db.connect()
                return True
            except Exception as e:
                print(f"[DB Retry] Attempt {attempt+1}/{retries} failed: {e}")
                time.sleep(delay)
        return False

    # ------------------------------------------------------------------
    # MAIN LOOP
    # ------------------------------------------------------------------
    def run(self):
        """Connect and listen forever."""
        while True:
            try:
                self.client.connect(self.broker, self.port, 60)
                self.client.loop_forever()
            except Exception as e:
                print(f"❌ MQTT connection error: {e}")
                time.sleep(5)  # Wait before reconnecting


# Allow standalone run for debug
if __name__ == "__main__":
    mqtt_service = MqttService(broker='', port=1883, username='', password='', client_id='', topic='')
    mqtt_service.run()