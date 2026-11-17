# Kupp.no – Norway's best discounts

A deals website showing only the big discounts from Norwegian online shops during Black Week 2026.

- 186 deals from Komplett, Greencom, Kitchn, Scandinavian Photo, Telenor and Tek.no's tested picks
- Category → subcategory filters (e.g. Computers & Gaming → CPUs, Monitors, SSDs)
- Filters for shop, brand, price range, minimum discount, official before-price, record-low price
- Store product photos (loaded from each shop's website), with an icon fallback
- Every deal links to its price history on Prisjakt and to the shop's product page

**Snapshot from 17 November 2026.** Prices change fast during Black Week; always check the price history before buying.

Live site: https://mustac.github.io/kupp-no/

## How the data works

- `data/curated.json` – hand-checked deals (Tek.no picks, Kitchn, Scandinavian Photo, Komplett, Greencom, Telenor)
- `data/raw/<shop>.json` – deals read from each shop's own Black Week pages
- `tools/build.py` – merges everything, keeps deals ≥30% off, sorts each product into a category (`tools/classify.py`) and writes `data/deals.json`
- `index.html` loads `data/deals.json`
