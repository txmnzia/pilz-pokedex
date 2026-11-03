# Model prep for the photo identifier (run once when updating the model; needs: pip install tflite flatbuffers).
# LiteRT.js 2.6 rejects a dynamic batch dim, so every tensor shape_signature batch -1 is set to 1 (shape is already 1).
# Source model: github.com/mlgraham/species-classifiers models/students/fungi/fungi_int8.tflite (Apache-2.0)
#   in sha256 273797691fabff2d1d7707fade66cc6d785541f9cb09060d3c6d6fe5bd42a47f -> out 9ce7af6858485ee1f17b1d12b47d9ee61125e9697d4b19973cded1b8282acccf
# Usage: python3 -I scripts/fix-model-batch.py in.tflite data/models/species-classifiers/fungi_int8.tflite
import sys, struct, hashlib, tflite
src, dst = sys.argv[1], sys.argv[2]
buf = bytearray(open(src, "rb").read())
g = tflite.Model.GetRootAsModel(bytes(buf), 0).Subgraphs(0)
n = 0
for i in range(g.TensorsLength()):
    t = g.Tensors(i)
    if not t.ShapeSignatureLength() or t.ShapeSignature(0) != -1: continue
    assert t.Shape(0) == 1, (i, t.Name())
    o = t._tab.Offset(18)                       # vtable slot of shape_signature in schema.fbs Tensor
    pos = t._tab.Vector(o)                      # absolute offset of element 0
    assert struct.unpack_from("<i", buf, pos)[0] == -1
    struct.pack_into("<i", buf, pos, 1); n += 1
open(dst, "wb").write(buf)
h = lambda b: hashlib.sha256(b).hexdigest()
print(f"patched {n} tensors\nin  {h(open(src,'rb').read())}\nout {h(bytes(buf))}")
