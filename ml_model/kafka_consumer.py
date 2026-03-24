"""
Apache Kafka Consumer for Real-Time Network Traffic Ingestion
Consumes messages from the 'network-traffic' topic and feeds them
to the IDS prediction pipeline.
"""

import json
import time
import threading
import logging
from typing import Callable

logger = logging.getLogger(__name__)

KAFKA_TOPIC = "network-traffic"
KAFKA_GROUP_ID = "ids-consumer-group"

# ---------------------------------------------------------------------------
# Real Kafka consumer (requires kafka-python and a running broker)
# ---------------------------------------------------------------------------

def _try_import_kafka():
    try:
        from kafka import KafkaConsumer
        return KafkaConsumer
    except ImportError:
        return None


class NetworkTrafficKafkaConsumer:
    """
    Wraps a Kafka consumer that reads network traffic events and invokes
    a callback for each message.

    Falls back to a simulated producer when Kafka is unavailable.
    """

    def __init__(self, bootstrap_servers: str = "localhost:9092",
                 topic: str = KAFKA_TOPIC,
                 on_message: Callable[[dict], None] = None):
        self.bootstrap_servers = bootstrap_servers
        self.topic = topic
        self.on_message = on_message or (lambda msg: logger.info("Received: %s", msg))
        self._running = False
        self._thread: threading.Thread | None = None
        self._consumer = None

        KafkaConsumer = _try_import_kafka()
        if KafkaConsumer:
            try:
                self._consumer = KafkaConsumer(
                    self.topic,
                    bootstrap_servers=self.bootstrap_servers,
                    group_id=KAFKA_GROUP_ID,
                    value_deserializer=lambda v: json.loads(v.decode("utf-8")),
                    auto_offset_reset="latest",
                    enable_auto_commit=True,
                    consumer_timeout_ms=1000,
                )
                logger.info("Kafka consumer connected to %s", bootstrap_servers)
            except Exception as exc:
                logger.warning("Kafka unavailable (%s). Using simulated mode.", exc)
                self._consumer = None
        else:
            logger.warning("kafka-python not installed. Using simulated mode.")

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start(self):
        """Start consuming in a background thread."""
        self._running = True
        target = self._consume_kafka if self._consumer else self._simulate
        self._thread = threading.Thread(target=target, daemon=True)
        self._thread.start()
        logger.info("Kafka consumer thread started (mode=%s).",
                    "kafka" if self._consumer else "simulated")

    def stop(self):
        self._running = False
        if self._consumer:
            self._consumer.close()
        if self._thread:
            self._thread.join(timeout=5)
        logger.info("Kafka consumer stopped.")

    # ------------------------------------------------------------------
    # Internal loops
    # ------------------------------------------------------------------

    def _consume_kafka(self):
        while self._running:
            try:
                for msg in self._consumer:
                    if not self._running:
                        break
                    self.on_message(msg.value)
            except Exception as exc:
                logger.error("Kafka consumer error: %s", exc)
                time.sleep(2)

    def _simulate(self):
        """Emit synthetic traffic events when Kafka is not available."""
        import random
        import numpy as np

        attack_types = ["BENIGN", "DDoS", "SQL_Injection", "PortScan", "BruteForce", "Zero_Day"]
        weights = [0.60, 0.15, 0.10, 0.07, 0.05, 0.03]

        while self._running:
            event = {
                "timestamp": time.time(),
                "src_ip": f"192.168.{random.randint(1,254)}.{random.randint(1,254)}",
                "dst_ip": f"10.0.{random.randint(0,255)}.{random.randint(1,254)}",
                "src_port": random.randint(1024, 65535),
                "dst_port": random.choice([80, 443, 22, 3306, 8080]),
                "protocol": random.choice(["TCP", "UDP", "ICMP"]),
                "duration": round(random.uniform(0, 100), 4),
                "src_bytes": random.randint(0, 100000),
                "dst_bytes": random.randint(0, 50000),
                "count": random.randint(1, 512),
                "srv_count": random.randint(1, 256),
                "serror_rate": round(random.uniform(0, 1), 4),
                "rerror_rate": round(random.uniform(0, 1), 4),
                "same_srv_rate": round(random.uniform(0, 1), 4),
                "diff_srv_rate": round(random.uniform(0, 1), 4),
                # Remaining features filled with random noise
                **{
                    f"feature_{i}": round(random.gauss(50, 10), 4)
                    for i in range(25)
                },
                "_simulated": True,
            }
            self.on_message(event)
            time.sleep(random.uniform(0.05, 0.3))  # ~3–20 events/sec


# ---------------------------------------------------------------------------
# Kafka Producer helper (for the backend to push ingested events)
# ---------------------------------------------------------------------------

class NetworkTrafficKafkaProducer:
    """Produces network traffic events to Kafka (or logs them in simulated mode)."""

    def __init__(self, bootstrap_servers: str = "localhost:9092",
                 topic: str = KAFKA_TOPIC):
        self.topic = topic
        self._producer = None

        try:
            from kafka import KafkaProducer
            self._producer = KafkaProducer(
                bootstrap_servers=bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            )
            logger.info("Kafka producer connected.")
        except Exception as exc:
            logger.warning("Kafka producer unavailable (%s). Using simulated mode.", exc)

    def send(self, event: dict):
        if self._producer:
            self._producer.send(self.topic, event)
        else:
            logger.debug("[Simulated Kafka] Produced event: %s", event.get("src_ip"))
