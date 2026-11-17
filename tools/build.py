"""Build data/deals.json for Kupp.no from the curated list and the raw shop files.

Usage:  python3 tools/build.py
Inputs: data/curated.json        hand-checked deals (Tek.no, Kitchn, Scandinavian Photo, ...)
        data/raw/<shop>.json     deals read from each shop's Black Week pages
Output: data/deals.json          what the website loads
"""
import json, glob, os, re, sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(__file__))
from classify import classify

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIN_DISCOUNT = 0.30          # only keep deals at least this much off
MAX_DISCOUNT = 0.90          # anything above this is almost always a misread price

# Shops read directly from their own sale pages
SHOPS = {
    "elkjop":   {"name": "Elkjøp",   "label": "Elkjøp",   "via": "elkjop.no Black Week",   "url": "https://www.elkjop.no/kampanje/black-friday"},
    "power":    {"name": "Power",    "label": "Power",    "via": "power.no Black Weeks",    "url": "https://www.power.no/kampanje/blackfriday/"},
    "komplettbw": {"name": "Komplett", "label": "Komplett", "via": "komplett.no Black Week", "url": "https://www.komplett.no/kampanje/black-friday"},
    "netonnet": {"name": "NetOnNet", "label": "NetOnNet", "via": "netonnet.no Black Week",  "url": "https://www.netonnet.no/art/kampanj/black-week"},
    "proshop":  {"name": "Proshop",  "label": "Proshop",  "via": "proshop.no Black Week",   "url": "https://www.proshop.no/Black-Friday"},
    "xxl":      {"name": "XXL",      "label": "XXL",      "via": "xxl.no Black Week",       "url": "https://www.xxl.no/black-week"},
    "clasohlson": {"name": "Clas Ohlson", "label": "Clas Ohlson", "via": "clasohlson.com Black Friday", "url": "https://www.clasohlson.com/no/Black-Friday"},
    "jula":     {"name": "Jula",     "label": "Jula",     "via": "jula.no Black Week",      "url": "https://www.jula.no/"},
    "kjell":    {"name": "Kjell & Company", "label": "Kjell & Company", "via": "kjell.com Black Week", "url": "https://www.kjell.com/no/"},
    "coolshop": {"name": "Coolshop", "label": "Coolshop", "via": "coolshop.no Black Friday", "url": "https://www.coolshop.no/"},
    "lekia":    {"name": "Lekia",    "label": "Lekia",    "via": "lekia.no Black Week",     "url": "https://www.lekia.no/"},
    "jysk":     {"name": "JYSK",     "label": "JYSK",     "via": "jysk.no Black Week",      "url": "https://jysk.no/black-friday"},
}

MULTI_BRANDS = ["Bang & Olufsen", "Cooler Master", "Fractal Design", "Modern House", "Royal Copenhagen",
                "OBH Nordica", "Joseph Joseph", "Eva Solo", "Eva Trio", "Anders Petter", "Wik & Walsøe",
                "Jamie Oliver", "Western Digital", "Be Quiet", "Mission SG", "Chef Matteo", "Andersson",
                "Sage Appliances", "Kjell & Company", "Clas Ohlson", "Hama", "Philips Hue", "Google Pixel",
                "Apple", "Samsung", "Sony", "LG", "TCL", "Hisense", "Xiaomi"]
SKIP_FIRST = {"brukt", "demo", "outlet", "ny", "nye", "pakke", "black", "week", "tilbud"}


def guess_brand(name):
    n = name.strip()
    for b in MULTI_BRANDS:
        if n.lower().startswith(b.lower() + " ") or n.lower() == b.lower():
            return b
    words = re.findall(r"[A-Za-zÆØÅæøåÄÖÜäöüé0-9&+\-\.]+", n)
    for w in words[:3]:
        if w.lower() not in SKIP_FIRST and not re.fullmatch(r"\d+.*", w):
            return w.strip("-.") if not w.isupper() or len(w) <= 6 else w.title()
    return words[0] if words else ""


def main():
    now_iso = datetime.now(timezone.utc).isoformat(timespec="seconds")
    cur = json.load(open(os.path.join(ROOT, "data", "curated.json")))
    sources = {}
    for k, v in cur["sources"].items():
        sources[k] = dict(v, count=0)
    deals, seen = [], set()

    def add(name, brand, src, now, was, sub, ref, flag, img, url):
        if not name or not now or not was or now >= was:
            return
        pct = 1 - now / was
        if pct < MIN_DISCOUNT and src not in cur["sources"]:
            return
        if pct > MAX_DISCOUNT:
            return
        key = (url or (src + name)).split("?")[0].rstrip("/").lower()
        if key in seen:
            return
        seen.add(key)
        deals.append([name, brand, src, int(now), int(was), sub, ref, flag, img, url])
        sources[src]["count"] = sources[src].get("count", 0) + 1

    for d in cur["deals"]:
        sub = d["sub"]
        if sub == "tablets" and classify(d["name"]) == "watches":
            sub = "watches"   # watches had their own subcategory added later
        add(d["name"], d["brand"], d["src"], d["now"], d["was"], sub, d["ref"], d["flag"], d["img"], d["url"])

    for path in sorted(glob.glob(os.path.join(ROOT, "data", "raw", "*.json"))):
        raw = json.load(open(path))
        sid = raw["src"]
        meta = SHOPS.get(sid, {"name": raw.get("shop", sid), "label": raw.get("shop", sid), "via": "", "url": ""})
        sources[sid] = dict(meta, updated=raw["read"][:10], count=0)
        ib, ub, iq = raw.get("imgBase", ""), raw.get("urlBase", ""), raw.get("imgSuffix", "")
        for row in raw["d"]:
            name, now, was, img, url = row[:5]
            img = (ib + img + iq) if img and not img.startswith("http") else img
            url = (ub + url) if url and not url.startswith("http") else url
            add(name, guess_brand(name), sid, now, was, classify(name, url), "f", "", img, url)

    deals.sort(key=lambda r: -(1 - r[3] / r[4]))
    out = {"generated": now_iso, "sources": sources, "deals": deals}
    dst = os.path.join(ROOT, "data", "deals.json")
    with open(dst, "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    by_sub = {}
    for r in deals:
        by_sub[r[5]] = by_sub.get(r[5], 0) + 1
    print(f"{len(deals)} deals from {len(sources)} sources -> {dst} ({os.path.getsize(dst)//1024} KB)")
    print("per source:", {k: v["count"] for k, v in sources.items()})
    print("other:", by_sub.get("other", 0), "| top subs:", sorted(by_sub.items(), key=lambda x: -x[1])[:12])


if __name__ == "__main__":
    main()
