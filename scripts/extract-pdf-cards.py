"""Extract card images from a tarot PDF as base64 JSON lines."""
import fitz, json, base64, sys

pdf_path = sys.argv[1]
doc = fitz.open(pdf_path)
cards = []
for i in range(len(doc)):
    page = doc[i]
    for j, img in enumerate(page.get_images()):
        xref = img[0]
        base = doc.extract_image(xref)
        w, h = base['width'], base['height']
        ratio = w / h
        if 0.55 < ratio < 0.75 and h > 500:
            b64 = base64.b64encode(base['image']).decode('ascii')
            cards.append({'w': w, 'h': h, 'b64': b64})

print(len(cards))
for c in cards:
    print(json.dumps({'w': c['w'], 'h': c['h'], 'b64': c['b64']}))
