#!/usr/bin/env python3
"""OM catalogue: official-source snapshots + conservative seed reconciliation.

No institutional activity or geographic coordinates are verified by this tool.
Default mode is offline; --online attempts one request per official source.
"""
from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
import hashlib
from html import unescape
import json
from pathlib import Path
import re
import time
import unicodedata
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

SOURCES = {
    "MARINHA": "https://www.marinha.mil.br/organizacoes-militares",
    "FAB": "https://www.fab.mil.br/organizacoes",
    "EXÉRCITO": "https://www.eb.mil.br/quarteis-por-estado",
}
COLUMNS = [
    "candidate_id", "force", "acronym", "name", "city", "uf",
    "address_published", "neighborhood_published", "postal_code_published",
    "source_url", "source_date", "institutional_status",
    "geo_status", "source_kind",
]
UA = "BivaqueOMCatalog/0.1 (periodic public directory review; no personal data)"


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^A-Z0-9]+", " ", s.upper()).strip()


def ident(force: str, acronym: str, name: str, city: str, uf: str) -> str:
    key = "|".join(map(norm, [force, acronym or name, city, uf]))
    return hashlib.sha256(key.encode()).hexdigest()[:20]


def read_seed(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        original = list(csv.DictReader(f, delimiter=";"))
    out = []
    for r in original:
        force = (r.get("Força") or "").strip().upper()
        acronym = (r.get("Sigla / identificação") or "").strip()
        name = (r.get("Nome oficial publicado") or "").strip()
        city = (r.get("Município") or "").strip()
        uf = (r.get("UF") or "").strip().upper()
        address = (r.get("Endereço publicado") or "").strip()
        out.append({
            "candidate_id": ident(force, acronym, name, city, uf),
            "force": force, "acronym": acronym, "name": name, "city": city,
            "uf": uf, "address_published": address,
            "neighborhood_published": "", "postal_code_published": (r.get("CEP") or "").strip(),
            "source_url": (r.get("URL da fonte") or "").strip(),
            "source_date": (r.get("Data consulta") or "").strip(),
            "institutional_status": "PENDING", "geo_status": "NOT_VERIFIED",
            "source_kind": "LEGACY_UNVERIFIED",
        })
    return out


def write_csv(path: Path, data: list[dict], columns: list[str] = COLUMNS) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=columns, delimiter=";", extrasaction="ignore")
        w.writeheader()
        w.writerows(data)


def fetch_snapshot(force: str, dest: Path, timeout: int = 20) -> dict:
    url = SOURCES[force]
    dest.mkdir(parents=True, exist_ok=True)
    result = {
        "force": force, "url": url, "collected_at": datetime.now(timezone.utc).isoformat(),
        "http_status": None, "sha256": None, "bytes": 0, "error": None,
        "source_exhausted": False, "parsed_records": 0,
    }
    try:
        req = Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
        with urlopen(req, timeout=timeout) as resp:
            result["http_status"] = resp.status
            content_type = resp.headers.get("Content-Type", "")
            if "text/html" not in content_type:
                raise ValueError("Unexpected Content-Type: " + content_type)
            raw = resp.read(4_000_001)
            if len(raw) > 4_000_000:
                raise ValueError("Source document exceeds 4 MB limit")
        result["sha256"] = hashlib.sha256(raw).hexdigest()
        result["bytes"] = len(raw)
        (dest / (norm(force).lower() + ".html")).write_bytes(raw)
    except HTTPError as exc:
        result["http_status"] = exc.code
        result["error"] = "HTTP " + str(exc.code)
    except (URLError, OSError, ValueError) as exc:
        result["error"] = type(exc).__name__ + ": " + str(exc)[:180]
    return result


def parse_marinha(html: str) -> list[dict]:
    """Candidate extraction only. Reject entries with incomplete name/city.

    Compatible with published h3 sigla + linked title + city layout; parser
    changes must be reviewed against fresh raw HTML before trusting new items.
    """
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "html.parser")
    records = []
    for h in soup.find_all("h3"):
        acronym = h.get_text(" ", strip=True)
        if not acronym or len(acronym) > 70:
            continue
        # Find title link before the next heading.
        tag = h.find_next("a")
        next_h = h.find_next("h3")
        if tag is None or (next_h is not None and tag.sourceline and next_h.sourceline
                           and tag.sourceline >= next_h.sourceline):
            continue
        name = tag.get_text(" ", strip=True)
        if len(name) < 9 or name.lower() in ("telefones", "mapa do site"):
            continue
        # Prefer city text following the title link within its result block.
        wrapper = h.find_parent(class_=re.compile("views-row|resultado|organization|organizacao", re.I))
        if wrapper is None:
            wrapper = h.parent.parent if h.parent and h.parent.parent else h.parent
        text = wrapper.get_text("\n", strip=True) if wrapper else ""
        lines = [unescape(line.strip()) for line in text.splitlines() if line.strip()]
        city_candidates = [v for v in lines if v not in (acronym, name) and
                           len(v) <= 85 and not v.lower().startswith(("telefone", "email", "http"))]
        city = city_candidates[-1] if city_candidates else ""
        if not city:
            continue
        records.append({"force": "MARINHA", "acronym": acronym, "name": name,
                        "city": city, "uf": "", "address_published": "",
                        "source_url": SOURCES["MARINHA"]})
    # An acronym can occur in multiple cities; no merge by acronym alone.
    return list({(norm(r["acronym"]), norm(r["name"]), norm(r["city"])): r
                 for r in records}.values())


def parse_exercito(html: str) -> list[dict]:
    """Extract public name, address and municipality from EB's state cards.

    Based on an actual 2026-10-20 HTTP 200 snapshot: each div.card has
    h5.card-header and labeled Endereço/Bairro/Cidade - UF/CEP fields.
    Existence in a directory does NOT establish active institutional status.
    """
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "html.parser")
    result = []
    seen = set()
    for card in soup.select("div.card"):
        heading = card.select_one("h5.card-header")
        if heading is None:
            continue
        name = heading.get_text(" ", strip=True)
        body = card.select_one("div.card-body") or card
        fields = {}
        for tag in body.select("span.card-title"):
            label = tag.get_text(" ", strip=True).rstrip(":")
            parent_text = tag.parent.get_text(" ", strip=True)
            value = parent_text[len(tag.get_text(" ", strip=True)):].strip()
            fields[label] = value
        locality = fields.get("Cidade - UF", "")
        match = re.fullmatch(r"(.*?)\s+-\s+([A-Za-z]{2})", locality)
        if not match or not name or not fields.get("Endereço"):
            continue
        city, uf = match.group(1).strip(), match.group(2).upper()
        key = (norm(name), norm(city), uf)
        if key in seen:
            continue
        seen.add(key)
        result.append({
            "force": "EXÉRCITO", "acronym": "", "name": name,
            "city": city, "uf": uf,
            "address_published": fields.get("Endereço", ""),
            "neighborhood_published": fields.get("Bairro", ""),
            "postal_code_published": fields.get("CEP", ""),
            "source_url": SOURCES["EXÉRCITO"],
        })
    return result


def reconcile(seed: list[dict], discovered: list[dict]) -> tuple[list[dict], list[dict]]:
    """Never silently overwrite old data or infer status from a match."""
    index: dict[tuple, list[dict]] = {}
    for row in seed:
        key = (row["force"], norm(row["name"]), norm(row["city"]))
        index.setdefault(key, []).append(row)
    new_candidates, review = [], []
    for r in discovered:
        key = (r["force"], norm(r["name"]), norm(r["city"]))
        matches = [m for m in index.get(key, []) if not r.get("uf") or m.get("uf") == r.get("uf")]
        if len(matches) == 1:
            review.append({"kind": "CONFIRMED_TEXT_MATCH", "candidate_id": matches[0]["candidate_id"],
                           "force": r["force"], "name": r["name"], "city": r["city"],
                           "action": "review_source_freshness_not_status"})
        elif len(matches) > 1:
            review.append({"kind": "AMBIGUOUS_SEED_MATCH", "candidate_id": "",
                           "force": r["force"], "name": r["name"], "city": r["city"],
                           "action": "manual_review"})
        else:
            r.update({"candidate_id": ident(r["force"], r["acronym"], r["name"], r["city"], ""),
                      "source_date": datetime.now(timezone.utc).date().isoformat(),
                      "institutional_status": "PENDING", "geo_status": "NOT_VERIFIED",
                      "source_kind": "OFFICIAL_WEB_CANDIDATE"})
            new_candidates.append(r)
            review.append({"kind": "NEW_CANDIDATE", "candidate_id": r["candidate_id"],
                           "force": r["force"], "name": r["name"], "city": r["city"],
                           "action": "confirm_uf_and_status_before_publish"})
    return new_candidates, review


def run(args: argparse.Namespace) -> dict:
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    seed = read_seed(Path(args.input))
    write_csv(out / "legacy_candidates.csv", seed)
    report = {"generated_at": datetime.now(timezone.utc).isoformat(),
              "legacy_rows": len(seed), "verified_coordinates": 0,
              "seed_status": "UNVERIFIED",
              "source_checks": [], "new_candidates": 0, "manual_review_rows": 0}
    discovered = []
    for force in SOURCES:
        if args.online and (args.source == "all" or args.source == force.lower()):
            meta = fetch_snapshot(force, out / "snapshots")
            if meta["http_status"] == 200 and force == "MARINHA":
                content = (out / "snapshots" / "marinha.html").read_text(encoding="utf-8", errors="replace")
                found = parse_marinha(content)
                meta["parsed_records"] = len(found)
                discovered.extend(found)
            elif meta["http_status"] == 200 and force == "EXÉRCITO":
                content = (out / "snapshots" / "exercito.html").read_text(encoding="utf-8", errors="replace")
                found = parse_exercito(content)
                meta["parsed_records"] = len(found)
                discovered.extend(found)
            elif meta["http_status"] == 200:
                meta["error"] = "Parser not verified for this source; snapshot saved for review"
            report["source_checks"].append(meta)
            time.sleep(1)
        else:
            report["source_checks"].append({"force": force, "url": SOURCES[force],
                                            "status": "NOT_FETCHED", "source_exhausted": False})
    fresh, review = reconcile(seed, discovered)
    write_csv(out / "new_candidates.csv", fresh)
    write_csv(out / "review.csv", review,
              ["kind", "candidate_id", "force", "name", "city", "action"])
    report["new_candidates"] = len(fresh)
    report["manual_review_rows"] = len(review)
    report["coverage_complete"] = False
    report["warning"] = ("No listing, institutional status, site address or point is approved "
                         "automatically. Blocked sites are reported; prior records are retained.")
    (out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n",
                                     encoding="utf-8")
    return report


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--input", default="data/oms/oms_raw_2026-10-20.csv")
    p.add_argument("--out", default="out/om-catalog")
    p.add_argument("--online", action="store_true", help="Attempt official website reads")
    p.add_argument("--source", choices=["all", "marinha", "fab", "exército"], default="all")
    args = p.parse_args()
    print(json.dumps(run(args), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
