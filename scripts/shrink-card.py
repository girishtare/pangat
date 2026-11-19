import os
import sys
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, NameObject

# Shrink a print-ready card for phones: drop the embedded print colour profile
# (ICC, ~1.3 MB) in favour of plain device colours, keep only what the pages use,
# and compress. The artwork, text and fonts are untouched.

DEVICE = {1: "/DeviceGray", 3: "/DeviceRGB", 4: "/DeviceCMYK"}


def plain(cs):
    """[/ICCBased <profile>] -> /DeviceCMYK (or RGB/Gray by its channel count)."""
    obj = cs.get_object() if hasattr(cs, "get_object") else cs
    if isinstance(obj, ArrayObject) and len(obj) == 2 and obj[0] == "/ICCBased":
        n = int(obj[1].get_object().get("/N", 4))
        return NameObject(DEVICE.get(n, "/DeviceCMYK"))
    return None


def fix_resources(res, seen, depth=0):
    if res is None or depth > 8:
        return 0
    res = res.get_object()
    changed = 0
    cs = res.get("/ColorSpace")
    if cs is not None:
        cs = cs.get_object()
        for k in list(cs.keys()):
            p = plain(cs[k])
            if p is not None:
                cs[NameObject(k)] = p
                changed += 1
    for key in ("/XObject", "/Pattern"):
        d = res.get(key)
        if d is None:
            continue
        for k, ref in d.get_object().items():
            if id(ref.get_object()) in seen:
                continue
            seen.add(id(ref.get_object()))
            o = ref.get_object()
            if o.get("/ColorSpace") is not None:
                p = plain(o["/ColorSpace"])
                if p is not None:
                    o[NameObject("/ColorSpace")] = p
                    changed += 1
            changed += fix_resources(o.get("/Resources"), seen, depth + 1)
    gs = res.get("/ExtGState")
    if gs is not None:
        for k, g in gs.get_object().items():
            g = g.get_object()
            sm = g.get("/SMask")
            if sm is not None and hasattr(sm.get_object(), "get") and sm.get_object().get("/G") is not None:
                changed += fix_resources(sm.get_object()["/G"].get_object().get("/Resources"), seen, depth + 1)
    return changed


for src in sys.argv[1:]:
    out = src.replace(".pdf", "-small.pdf")
    r = PdfReader(src)
    w = PdfWriter()
    for p in r.pages:
        w.add_page(p)
    seen = set()
    changed = 0
    for p in w.pages:
        changed += fix_resources(p.get("/Resources"), seen)
        for k in ("/Thumb", "/PieceInfo"):
            if k in p:
                del p[k]
        p.compress_content_streams()
    if "/OutputIntents" in w._root_object:
        del w._root_object["/OutputIntents"]
    w.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
    with open(out, "wb") as f:
        w.write(f)
    print(f"{src}: {os.path.getsize(src)/1024:.0f} KB -> {os.path.getsize(out)/1024:.0f} KB, pages {len(PdfReader(out).pages)}, colour spaces changed {changed}")

# Second pass: a fresh file with only what the pages now reference (the profile is left behind).
for src in sys.argv[1:]:
    mid = src.replace(".pdf", "-small.pdf")
    r2 = PdfReader(mid)
    w2 = PdfWriter()
    for p in r2.pages:
        w2.add_page(p)
    w2.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
    with open(mid, "wb") as f:
        w2.write(f)
    print(f"{src}: second pass -> {os.path.getsize(mid)/1024:.0f} KB")
