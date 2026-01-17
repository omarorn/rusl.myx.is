#!/usr/bin/env python3
"""
TrashPi - Íslenskur ruslaflokkari með gervigreind
Standalone box með camera, LEDs og hátalara

Hardware:
- Raspberry Pi 4/5
- Pi Camera Module 3
- 4x LED strips (WS2812B) - einn fyrir hverja tunnu
- PIR motion sensor (HC-SR501)
- 3W speaker + PAM8403 amp

Flæði:
1. PIR skynjir hreyfingu
2. Camera tekur mynd
3. TFLite módel flokkar (local)
4. Ef óvíst → cloud fallback (Gemini)
5. LED kveikir á réttri tunnu
6. Speaker segir nafn á tunnu
"""

import os
import time
import json
import requests
import numpy as np
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Config
API_URL = os.getenv('API_URL', 'https://trash.myx.is/api')
DEVICE_ID = os.getenv('DEVICE_ID', 'trashpi-001')
SVEITARFELAG = os.getenv('SVEITARFELAG', 'reykjavik')
CONFIDENCE_THRESHOLD = float(os.getenv('CONFIDENCE_THRESHOLD', '0.8'))
DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'

# GPIO pins
PIR_PIN = 4
LED_PINS = {
    'paper': 17,    # Blátt
    'plastic': 27,  # Grænt
    'food': 22,     # Brúnt
    'mixed': 23,    # Hvítt
}

# Íslensk nöfn á tunnum
BIN_NAMES_IS = {
    'paper': 'Pappír og pappi',
    'plastic': 'Plastumbúðir',
    'food': 'Matarleifar',
    'mixed': 'Blandaður úrgangur',
}

# TrashNet flokkar → Ísland
TRASHNET_TO_BIN = {
    'cardboard': 'paper',
    'glass': 'mixed',
    'metal': 'plastic',
    'paper': 'paper',
    'plastic': 'plastic',
    'trash': 'mixed',
}


# Iceland-specific overrides (critical!)
ICELAND_OVERRIDES = {
    '3d_print': 'mixed',
    '3d': 'mixed',
    'pla': 'mixed',
    'abs': 'mixed',
    'bioplastic': 'mixed',
    'foam': 'mixed',
    'styrofoam': 'mixed',
}


class TrashPi:
    def __init__(self):
        self.model = None
        self.camera = None
        self.pir = None
        self.leds = {}
        self.tts = None
        
    def setup(self):
        """Initialize hardware and model"""
        print("🗑️ TrashPi starting...")
        
        # TFLite model
        self._setup_model()
        
        # Camera
        self._setup_camera()
        
        # GPIO (LEDs + PIR)
        self._setup_gpio()
        
        # Text-to-speech
        self._setup_tts()
        
        print("✅ TrashPi ready!")

    
    def _setup_model(self):
        """Load TFLite model"""
        try:
            import tflite_runtime.interpreter as tflite
            model_path = Path(__file__).parent / 'models' / 'trashnet.tflite'
            
            if not model_path.exists():
                print("⚠️ Model not found, downloading...")
                self._download_model(model_path)
            
            self.model = tflite.Interpreter(model_path=str(model_path))
            self.model.allocate_tensors()
            self.input_details = self.model.get_input_details()
            self.output_details = self.model.get_output_details()
            print(f"✅ Model loaded: {model_path.name}")
        except Exception as e:
            print(f"❌ Model error: {e}")
            self.model = None
    
    def _setup_camera(self):
        """Initialize Pi Camera"""
        try:
            from picamera2 import Picamera2
            self.camera = Picamera2()
            config = self.camera.create_still_configuration(
                main={"size": (640, 480)},
                buffer_count=2
            )
            self.camera.configure(config)
            self.camera.start()
            print("✅ Camera ready")
        except Exception as e:
            print(f"❌ Camera error: {e}")
            self.camera = None

    
    def _setup_gpio(self):
        """Initialize GPIO for LEDs and PIR"""
        try:
            from gpiozero import MotionSensor, LED
            
            self.pir = MotionSensor(PIR_PIN)
            self.leds = {name: LED(pin) for name, pin in LED_PINS.items()}
            print("✅ GPIO ready")
        except Exception as e:
            print(f"❌ GPIO error: {e}")
    
    def _setup_tts(self):
        """Initialize text-to-speech"""
        try:
            import pyttsx3
            self.tts = pyttsx3.init()
            self.tts.setProperty('rate', 150)
            # Try to set Icelandic voice if available
            voices = self.tts.getProperty('voices')
            for voice in voices:
                if 'is' in voice.id.lower() or 'ice' in voice.id.lower():
                    self.tts.setProperty('voice', voice.id)
                    break
            print("✅ TTS ready")
        except Exception as e:
            print(f"❌ TTS error: {e}")
            self.tts = None
    
    def _download_model(self, path: Path):
        """Download TFLite model from HuggingFace"""
        path.parent.mkdir(parents=True, exist_ok=True)
        url = "https://huggingface.co/ahmzakif/TrashNet-Classification/resolve/main/model.tflite"
        response = requests.get(url)
        path.write_bytes(response.content)

    
    def capture_image(self) -> np.ndarray:
        """Capture image from camera"""
        if self.camera:
            return self.camera.capture_array()
        return None
    
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for TFLite model (224x224)"""
        from PIL import Image
        
        img = Image.fromarray(image)
        img = img.resize((224, 224))
        img_array = np.array(img, dtype=np.float32)
        img_array = img_array / 255.0  # Normalize
        img_array = np.expand_dims(img_array, axis=0)
        return img_array
    
    def classify_local(self, image: np.ndarray) -> tuple[str, float]:
        """Classify using local TFLite model"""
        if not self.model:
            return None, 0.0
        
        processed = self.preprocess_image(image)
        self.model.set_tensor(self.input_details[0]['index'], processed)
        self.model.invoke()
        
        output = self.model.get_tensor(self.output_details[0]['index'])
        class_idx = int(np.argmax(output[0]))
        confidence = float(output[0][class_idx])
        
        classes = ['cardboard', 'glass', 'metal', 'paper', 'plastic', 'trash']
        return classes[class_idx], confidence

    
    def classify_cloud(self, image: np.ndarray) -> dict:
        """Fallback to cloud API for edge cases"""
        import base64
        from PIL import Image
        from io import BytesIO
        
        # Convert to base64
        img = Image.fromarray(image)
        buffer = BytesIO()
        img.save(buffer, format='JPEG', quality=85)
        b64 = base64.b64encode(buffer.getvalue()).decode()
        
        try:
            response = requests.post(
                f"{API_URL}/classify",
                json={
                    'image': b64,
                    'device_id': DEVICE_ID,
                    'device_type': 'trashpi',
                    'sveitarfelag': SVEITARFELAG,
                },
                timeout=10
            )
            return response.json()
        except Exception as e:
            print(f"❌ Cloud error: {e}")
            return None
    
    def light_bin(self, bin_name: str):
        """Light up the correct bin LED"""
        # Turn off all LEDs
        for led in self.leds.values():
            led.off()
        
        # Light correct one
        if bin_name in self.leds:
            self.leds[bin_name].on()
            if DEBUG:
                print(f"💡 LED: {bin_name}")

    
    def speak(self, bin_name: str):
        """Announce the bin name in Icelandic"""
        if self.tts:
            text = BIN_NAMES_IS.get(bin_name, bin_name)
            self.tts.say(text)
            self.tts.runAndWait()
    
    def classify(self, image: np.ndarray) -> dict:
        """Main classification logic with fallback"""
        # Try local first
        item, confidence = self.classify_local(image)
        
        if DEBUG:
            print(f"🔍 Local: {item} ({confidence:.1%})")
        
        # Map to Iceland bin
        bin_name = TRASHNET_TO_BIN.get(item, 'mixed')
        
        # Check Iceland overrides
        item_lower = (item or '').lower()
        for keyword, override_bin in ICELAND_OVERRIDES.items():
            if keyword in item_lower:
                bin_name = override_bin
                break
        
        # Fallback to cloud if low confidence
        if confidence < CONFIDENCE_THRESHOLD:
            print(f"☁️ Low confidence ({confidence:.1%}), trying cloud...")
            cloud_result = self.classify_cloud(image)
            if cloud_result and 'bin' in cloud_result:
                return cloud_result
        
        return {
            'item': item,
            'bin': bin_name,
            'bin_name_is': BIN_NAMES_IS.get(bin_name, 'Blandaður úrgangur'),
            'confidence': confidence,
            'model_used': 'trashnet-local',
        }

    
    def run(self):
        """Main loop - wait for motion, classify, output"""
        print(f"\n🗑️ TrashPi running ({SVEITARFELAG})")
        print("👋 Haltu hlut fyrir framan myndavélina...")
        
        while True:
            try:
                # Wait for motion
                if self.pir:
                    self.pir.wait_for_motion()
                else:
                    input("Press Enter to capture...")
                
                print("\n📸 Hreyfing skynjuð!")
                
                # Capture
                image = self.capture_image()
                if image is None:
                    print("❌ Gat ekki tekið mynd")
                    continue
                
                # Classify
                result = self.classify(image)
                
                # Output
                bin_name = result.get('bin', 'mixed')
                bin_is = result.get('bin_name_is', 'Blandaður úrgangur')
                conf = result.get('confidence', 0)
                
                print(f"✅ {result.get('item', '?')} → {bin_is} ({conf:.0%})")
                
                self.light_bin(bin_name)
                self.speak(bin_name)
                
                # Debounce
                time.sleep(3)
                
                # Turn off LED after 5 seconds
                time.sleep(5)
                for led in self.leds.values():
                    led.off()
                    
            except KeyboardInterrupt:
                print("\n👋 Bless!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")
                time.sleep(1)


if __name__ == '__main__':
    pi = TrashPi()
    pi.setup()
    pi.run()
