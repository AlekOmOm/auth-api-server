# Data-Server Socket.IO Integration Guide

This document summarizes how the Streamlit candle dashboard communicates with the external **Data-Server** for historical and real-time candle data. It distills the authoritative specs in `PRD/data-server_context/*` and serves as a quick reference for developers.

on url: https://candle-data.devalek.dev/

---
## 1. Connection Details

| Parameter | Value | Notes |
|-----------|-------|-------|
| URL | `wss://candle-data.devalek.dev` | Configurable via env var `DATA_SERVER_URL` |
| Namespace | `/` (default) | No custom namespace used |
| Transport | `"websocket"` | Disable long-polling for performance |
| Reconnect | Exponential back-off | Implemented by default in `python-socketio` |

```python
sio.connect(
    os.getenv("DATA_SERVER_URL", "wss://candle-data.devalek.dev"),
    transports=["websocket"],
)
```

---
## 2. Socket.IO Events

### Server → Client

| Event | Payload | Purpose |
|-------|---------|---------|
| `time_range_info` | `{ start: int\|null, end: int\|null }` | Earliest & latest candle timestamps in DB |
| `historical_data_response` | `{ data: [<Candle>, ...] }` | Bulk candles in response to a request |
| `candle_update` | `<Candle>` | Single closed candle pushed in real time |
| `error_response` | `{ message: str, details?: str }` | Custom application errors |
| `error` | _varies_ | Standard Socket.IO errors |


### Client → Server

| Event | Payload | Purpose |
|-------|---------|---------|
| `request_historical_data` | `{ start_ms, end_ms, symbol?, interval?, limit? }` | Fetch candle batch |

---
## 3. Candle Payload Shape
```json
{
  "timestamp": 1672515780000,
  "symbol": "BTCUSDT",
  "interval": "1m",
  "open": 21000.0,
  "high": 21060.0,
  "low": 20990.0,
  "close": 21050.0,
  "volume": 67.89,
  "is_closed": true
}
```
The Python representation lives in `src/models.Candle` (see Domain Models component).

---
## 4. Recommended Client Workflow

1. **Connect** to the server.
2. On `connect`, compute a suitable time window (e.g., last 100 candles) and emit `request_historical_data`.
3. **Handle** `historical_data` by enqueuing each candle.
4. **Listen** for continuous `candle_update` events and enqueue them.
5. A dequeue loop on the Streamlit main thread appends candles to `st.session_state.candles` (max 100) and triggers `st.rerun()`.

```python
from datetime import datetime, timedelta
import socketio, queue, time
from src.models import Candle

QUEUE_IN = queue.Queue(maxsize=1000)
INTERVAL_MS = 60_000  # 1-minute klines

sio = socketio.Client(transports=["websocket"], reconnection=True)

# wait for connection before emitting, this modification is needed in the below
@sio.event
def connect():
    end = int(time.time() * 1000)
    start = end - 100 * INTERVAL_MS
    sio.emit(
        "request_historical_data",
        {"start_time_ms": start, "end_time_ms": end, "symbol": "BTCUSDT", "interval": "1m", "limit": 100},
    )

@sio.on("historical_data")
def _historical(payload):
    for c in payload.get("data", []):
        QUEUE_IN.put(Candle(**c))

@sio.on("candle_update")
def _update(candle):
    QUEUE_IN.put(Candle(**candle))
```

---
## 5. Error Handling Guidelines
* Treat `error_response` as non-fatal; log and surface to the UI where appropriate.
* Retry `request_historical_data` with narrower time windows if the server responds with a range error.

---
