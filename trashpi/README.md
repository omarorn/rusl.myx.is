# 🏠 TrashPi — Wall-mounted Waste Classification Display

IoT tæki sem greinir rusl með myndavél og sýnir rétta tunnu á skjá + LEDs.

## Hardware

### Grunnútgáfa (~$100)

| Hluti | Verð | Link |
|-------|------|------|
| Raspberry Pi 4 (2GB) | $45 | [RPi](https://www.raspberrypi.com/products/raspberry-pi-4-model-b/) |
| Pi Camera Module 3 | $25 | [Camera](https://www.raspberrypi.com/products/camera-module-3/) |
| 7" Touch Display | $50 | [Display](https://www.raspberrypi.com/products/raspberry-pi-touch-display/) |
| WS2812B LED Strip (1m) | $10 | 60 LEDs/m, klippt í 4 hluta |
| PIR Motion Sensor | $3 | HC-SR501 |
| Power Supply 5V 4A | $10 | USB-C |
| **Samtals** | **~$143** | |

### Premium útgáfa (~$200)

Bæta við:
- Coral USB Accelerator ($60) — 10x hraðari inference
- Raspberry Pi 5 (4GB) ($60) — Meiri afköst

## Tengingar

```
Pi GPIO:
├── GPIO 18 (PWM) ─────► WS2812B Data
├── GPIO 4 ────────────► PIR Motion Sensor
├── GPIO 17 ───────────► Button (optional)
└── CSI ───────────────► Camera Module

LED Strip (16 LEDs):
├── LEDs 0-3: 🔵 Pappír
├── LEDs 4-7: 🟢 Plast
├── LEDs 8-11: 🟤 Matarleifar
└── LEDs 12-15: ⬜ Blandað
```

## Uppsetning

```bash
# 1. Clone repo
git clone https://github.com/2076ehf/rusl.myx.is.git
cd rusl.myx.is/trashpi

# 2. Run setup
chmod +x setup.sh
./setup.sh

# 3. Download model
mkdir -p ~/trashpi/models
# Sækja TrashNet TFLite model...

# 4. Reboot
sudo reboot
```

## Notkun

```bash
# Manual start
cd ~/trashpi
source venv/bin/activate
python main.py

# Service status
sudo systemctl status trashpi

# Logs
journalctl -u trashpi -f
```

## Stillingar

Breyta `CONFIG` í `main.py`:

```python
CONFIG = {
    'API_URL': 'https://trash.myx.is/api',
    'CONFIDENCE_THRESHOLD': 0.80,  # Hvenær nota cloud
    'LED_PIN': board.D18,
    'NUM_LEDS': 16,
    ...
}
```

## Flæði

```
Hreyfing greind (PIR)
        │
        ▼
   Taka mynd
        │
        ▼
┌───────────────────┐
│ Local TFLite      │
│ (TrashNet 3.4M)   │
└─────────┬─────────┘
          │
    confidence > 80%?
          │
    ┌─YES─┴──NO──┐
    │            │
    ▼            ▼
 Local       Cloud API
 result      (Gemini)
    │            │
    └─────┬──────┘
          │
          ▼
  Apply Iceland rules
  (3D print → mixed)
          │
          ▼
   ┌──────────────┐
   │ Output:      │
   │ • LED strip  │
   │ • Display    │
   │ • Speaker    │
   └──────────────┘
```

## 3D Print Enclosure

STL files fyrir 3D prentað hús:
- `enclosure/front.stl` — Framhlið með glugga
- `enclosure/back.stl` — Bakhlið með Pi mount
- `enclosure/led_mount.stl` — LED diffuser

Print settings:
- PLA eða PETG
- 0.2mm layer height
- 20% infill
- No supports needed

## Troubleshooting

| Villa | Lausn |
|-------|-------|
| Camera not found | `sudo raspi-config` → Interface → Camera |
| LEDs don't work | Check GPIO 18 connection, run as sudo |
| Display black | Check ribbon cable, enable display in config |
| TTS no sound | `sudo apt install espeak` |
| Model error | Download correct TFLite model |

## API

TrashPi notar sama API og PWA:

```bash
POST https://trash.myx.is/api/classify
{
  "image": "base64...",
  "device_id": "pi_abc123",
  "source": "pi"
}
```

## Leyfi

MIT © 2076 ehf
