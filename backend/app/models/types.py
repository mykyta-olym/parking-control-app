# app/models/types.py
from enum import Enum

class ZoneType(str, Enum):
    street = "street"
    garage = "garage"
    lot    = "lot"
    private= "private"

class SpotType(str, Enum):
    regular = "regular"
    ev      = "ev"
    ztp     = "ztp"
    reserved= "reserved"

class District(str, Enum):
    zapad = "ZAPAD"
    sever = "SEVER"
    stare_mesto = "STARE MESTO"
    juh = "JUH"

class DeviceKind(str, Enum):
    camera  = "camera"
    loop    = "loop"
    gateway = "gateway"

class DeviceStatus(str, Enum):
    online  = "online"
    offline = "offline"
    error   = "error"

class SpotStatus(str, Enum):
    free     = "free"
    occupied = "occupied"
    unknown  = "unknown"
    blocked  = "blocked"
    error    = "error"
