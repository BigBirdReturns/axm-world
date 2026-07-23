from pathlib import Path
import base64, json, zlib

PAYLOAD = 'eNrsnE1v4zqyr7+Kobd6ZWfP4iRO3CAJO0mP7Xa7G49oFCW2PHVJlkRKIwT573fISi9tSaKIgpoXAzNfVFn13/PwrYdKTpVSV7L9dP/75+/+5x//t7+9//nHf/3Lb3/9l3/81x//9L/++q8v/+Vv//AnP/zlP/3u13/7j//6v/7lb3/6r1/9x7/+7Z/++k//+K9/++cf/vov//a3//b3//e7//mXv/3T//rv//kP//1P//Hf//Qf/vbXf/zbf//3f/7rf/3H//6v//Qf//Of/9t//p//9/f//d/+/fd/++9/+2//5e//8V//+d//5x//+7/88f/8f/79t/93v/9v//X//evv3/7H//rP/73/+E+//e3f/vaf/vkP//bP//pf/9O//Mc//8ff/ud//f//+L/86d/8x7/+4w//+N/++u/++7/8c7/9d//2v/7rf//3f/3P/8u//9N//evv/9f//j//Xf/8L/88f/8ef/79t/93v/9v//X/9evv39/f/9v//T//z3/77//4P//rf/vY//zH/9a9/+bf/9A//9s//+l//05/85z//xz//x9/+53/973/67//yh3/zd//2v/7rf//3f/3P/8u//9N//evv/9f/7/7+H/7+/v39/X/7v//v/3//7w==...TRUNCATED...'
root = Path(__file__).resolve().parents[1]
data = json.loads(zlib.decompress(base64.b64decode(PAYLOAD)))
for relative, encoded in data["files"].items():
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(base64.b64decode(encoded))
for relative in data["delete"]:
    path = root / relative
    if path.exists():
        path.unlink()
print(f"Applied {len(data['files'])} Gate 4 files.")
