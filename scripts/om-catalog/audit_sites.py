#!/usr/bin/env python3
"""Audita endereços públicos de OMs. NÃO geocodifica nem homologa locais."""
import argparse
import csv
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

UF = set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split())
STREET = re.compile(r'^(?:av\.?|avenida|r\.?|rua|rodovia|br[- ]|estrada|travessa|tv\.?|pra[cç]a|alameda|rod\.?|quadra|qd\.?|largo|via|vila|acesso)', re.I)
NUMBER = re.compile(r',\s*(?:n[º°.]?\s*)?\d{1,6}\b|\b(?:numero|n[º°.]?)\s*\d{1,6}\b|\b\d{1,6}\s*$', re.I)
S_N = re.compile(r'\bs\s*/\s*n(?:r|o|º|°)?\b', re.I)
CORRUPT = re.compile(r'\.\.\.|<[^>]+>|\ufffd|\x00')

def read_csv(path, required):
    with open(path, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        if not required.issubset(set(reader.fieldnames or [])):
            raise ValueError(f'Campos obrigatórios ausentes em {path}: {sorted(required-set(reader.fieldnames or []))}')
        return list(reader)

def normalize(value):
    value = unicodedata.normalize('NFKD', (value or '').casefold())
    value = ''.join(c for c in value if not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', value).strip()

def assess(site, organizations, localities=None):
    reasons = []
    address = (site.get('public_address') or '').strip()
    city = (site.get('city') or '').strip()
    state = (site.get('state') or '').strip().upper()
    zip_code = re.sub(r'\D', '', (site.get('zip_code') or ''))
    if not address: reasons.append('MISSING_ADDRESS')
    if CORRUPT.search(address) or CORRUPT.search(city): reasons.append('CORRUPT_TEXT')
    if not city or state not in UF: reasons.append('BAD_CITY_OR_UF')
    if zip_code and len(zip_code) != 8: reasons.append('BAD_CEP')
    if not STREET.search(normalize(address)): reasons.append('ADDRESS_NOT_STREET_LIKE')
    if not (NUMBER.search(address) or S_N.search(address)): reasons.append('NO_HOUSE_NUMBER')
    city_match = ''
    if localities is not None:
        city_match = 'MATCH' if (normalize(city), state) in localities else 'UNMATCHED'
        if city_match == 'UNMATCHED': reasons.append('IBGE_CITY_NOT_MATCHED')
    if not organizations: reasons.append('ORPHAN_SITE')
    if len(organizations) > 1: reasons.append('POSSIBLE_SHARED_SITE')
    blockers = {'MISSING_ADDRESS', 'CORRUPT_TEXT', 'BAD_CITY_OR_UF', 'BAD_CEP', 'IBGE_CITY_NOT_MATCHED', 'ORPHAN_SITE'}
    quality = ('BLOCKED' if blockers.intersection(reasons) else
               'REVIEW_ADDRESS' if {'ADDRESS_NOT_STREET_LIKE','NO_HOUSE_NUMBER'}.intersection(reasons)
               else 'READY_FOR_EXTERNAL_GEOCODING')
    return {'site_id': site['id'], 'address': address, 'city': city, 'state': state,
            'zip_code': zip_code, 'source_url': site.get('source_url',''),
            'organization_count': str(len(organizations)),
            'organizations': ' | '.join(o['name'] for o in organizations),
            'ibge_city_match': city_match, 'address_quality': quality,
            'issues': ';'.join(reasons), 'geolocation_status': 'UNVERIFIED_TEXT'}

def audit(orgs, sites, localities=None):
    bysite = defaultdict(list)
    for o in orgs:
        if o.get('site_id'): bysite[o['site_id']].append(o)
    assessed = [assess(s, bysite.get(s['id'], []), localities) for s in sites]
    flags = [{'site_id':s['site_id'],'reason':reason,'address':s['address'],'city':s['city'],'state':s['state']}
             for s in assessed for reason in filter(None,s['issues'].split(';'))]
    queue = [s for s in assessed if s['address_quality'] == 'READY_FOR_EXTERNAL_GEOCODING']
    summary = {'organizations':len(orgs),'sites_textual':len(sites),
               'sites_by_quality':dict(sorted(Counter(x['address_quality'] for x in assessed).items())),
               'review_flags':len(flags),
               'flag_categories':dict(sorted(Counter(x['reason'] for x in flags).items())),
               'geocoded':0,'verified_public_access':0,'auto_published':0}
    return assessed, flags, queue, summary

def write_csv(path, columns, items):
    with open(path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=columns, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(items)

def run(orgs_path, sites_path, out_dir, localities_path=None):
    orgs = read_csv(orgs_path, {'id','name','site_id'})
    sites = read_csv(sites_path, {'id','public_address','city','state','zip_code','source_url'})
    locs = None
    if localities_path:
        rows = read_csv(localities_path, {'city_name','state_code'})
        locs = {(normalize(x['city_name']),x['state_code'].upper()) for x in rows}
    assessed, flags, queue, summary = audit(orgs, sites, locs)
    out_dir.mkdir(parents=True, exist_ok=True)
    cols = list(assessed[0]) if assessed else ['site_id']
    write_csv(out_dir/'site_candidates_audited.csv', cols, assessed)
    write_csv(out_dir/'site_review.csv', ['site_id','reason','address','city','state'], flags)
    write_csv(out_dir/'geocoding_queue.csv', cols, queue)
    (out_dir/'site_audit.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True)+'\n', encoding='utf-8')
    return summary

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--organizations',type=Path,required=True)
    p.add_argument('--sites',type=Path,required=True)
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--localities',type=Path,help='CSV oficial de municípios com city_name,state_code')
    a = p.parse_args()
    print(json.dumps(run(a.organizations,a.sites,a.out,a.localities), ensure_ascii=False, indent=2))
