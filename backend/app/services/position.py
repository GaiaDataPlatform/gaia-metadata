import httpx
from typing import Optional, Tuple
from ..config import settings

async def get_live_position() -> Tuple[Optional[float], Optional[float]]:
    """Fetch current lat/lon from gaia-acquisition REST API.
    Endpoint format: /api/v1/live/{measurement}/{source}/{sentence}/{field}
    """
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(
                f"{settings.gaia_acquisition_url}/api/v1/live/navigation/Seapath/GPGGA"
            )
            if resp.status_code == 200:
                data = resp.json()
                fields = data.get("fields", {})
                lat = fields.get("lat", {}).get("value")
                lon = fields.get("lon", {}).get("value")
                if lat is not None and lon is not None:
                    return float(lat), float(lon)
    except Exception as e:
        print(f"[position] Could not fetch live position: {e}")
    return None, None
