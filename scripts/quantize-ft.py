"""v0.15.1 (Sam: 46 MB too heavy): int8 copy of the FungiTastic model for the app.
Source: mushroom_model_dynamic.tflite (float32, 91 MB) from huggingface.co/paulbauriegel/fungitastic-dinov3-vits16-384.
Recipe: ai-edge-quantizer dynamic_wi8_afp32 (int8 weights per channel, float activations) -> 24 MB.
Measured on the golden set (3511 photos): top-1 61.0% -> 60.7%, top-3 73.5% -> 73.3%; in Chromium (1078 photos)
59.5% -> 59.2%, 1.2 s -> 0.6 s per photo. Int4 (wi4b32 14.5 MB, wi4c 12.6 MB) does not run: XNNPACK refuses INT4 tensors.
Usage: python3 scripts/quantize-ft.py path/to/mushroom_model_dynamic.tflite public/models/fungitastic_int8.tflite
"""
import sys
from ai_edge_quantizer import quantizer, recipe
q = quantizer.Quantizer(sys.argv[1]); q.load_quantization_recipe(recipe.dynamic_wi8_afp32())
q.quantize().export_model(sys.argv[2], overwrite=True)
