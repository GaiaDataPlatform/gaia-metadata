import socket
import logging
from datetime import datetime
from ..config import settings

logger = logging.getLogger("gaia.nmea")

def _checksum(sentence: str) -> str:
    content = sentence.lstrip("$").split("*")[0]
    cs = 0
    for c in content:
        cs ^= ord(c)
    return f"{cs:02X}"

def build_pgbev(cruise: str, type_: str, task: str, event: str, operator: str,
                timestamp: datetime = None) -> str:
    ts = (timestamp or datetime.utcnow()).strftime("%Y-%m-%d %H:%M:%S")
    body = f"$PGBEV,{ts},{cruise},{type_},{task},{event},{operator}"
    cs = _checksum(body)
    return f"{body}*{cs}"

def build_pgban(level: str, description: str, operator: str,
                timestamp: datetime = None) -> str:
    ts = (timestamp or datetime.utcnow()).strftime("%Y-%m-%d %H:%M:%S")
    body = f"$PGBAN,{ts},{level},{description},{operator}"
    cs = _checksum(body)
    return f"{body}*{cs}"

def send_nmea(sentence: str) -> bool:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(1.0)
        sock.sendto(sentence.encode(), (settings.nmea_host, settings.nmea_port))
        sock.close()
        logger.info(f"NMEA sent to {settings.nmea_host}:{settings.nmea_port} → {sentence}")
        return True
    except Exception as e:
        logger.warning(f"NMEA send FAILED to {settings.nmea_host}:{settings.nmea_port} → {e} | sentence: {sentence}")
        return False
