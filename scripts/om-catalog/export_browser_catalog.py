#!/usr/bin/env python3
"""Generate a searchable, non-sensitive public OM directory for authenticated UI.
The dataset contains ONLY organizational names and municipalities, NEVER personnel,
addresses, or military site coordinates. Sources remain in raw_oms_1416.csv.
"""
import argparse
import csv
import json
import re
import unicodedata
from pathlib import Path

FOREIGN_CITIES={'cidade do mexico','maputo','paramaribo - suriname','roma','teera','washington, dc'}
def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFKD',s.casefold()) if not unicodedata.combining(c)).strip()

def render(raw_path:Path, ibge_path:Path)->str:
    with ibge_path.open(encoding='utf-8',newline='') as f:
        cities={(norm(r['city_name']),r['state_code']) for r in csv.DictReader(f)}
    with raw_path.open(encoding='utf-8',newline='') as f:
        records=list(csv.DictReader(f,delimiter=';'))
    output=[];seen=set()
    for r in records:
        name=r['nome_publicado'].strip()
        uf=r['uf'].strip().upper()
        city=r['municipio'].strip()
        force=r['forca'].strip()
        country=r['pais_classificacao'].strip()
        if not (name and force in ('FAB','MB','EB') and uf and city and country=='BR'):continue
        if force=='EB' and norm(city) in FOREIGN_CITIES:continue
        if (norm(city),uf) not in cities:continue
        key=(force,norm(name),norm(city),uf)
        if key in seen:continue
        seen.add(key)
        output.append({'id':r['id'],'force':force,'name':name,'acronym':r['sigla'].strip(),
                      'city':city,'uf':uf})
    output.sort(key=lambda v:(v['uf'],norm(v['city']),v['force'],norm(v['name'])))
    return json.dumps(output,ensure_ascii=False,indent=2)+'\n'

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--raw',type=Path,default=Path('data/om/raw_oms_1416.csv'))
    p.add_argument('--ibge',type=Path,default=Path('data/om/ibge_localities.csv'))
    p.add_argument('--out',type=Path,default=Path('apps/web/lib/om/catalog.json'))
    p.add_argument('--check',action='store_true')
    a=p.parse_args()
    data=render(a.raw,a.ibge)
    if a.check:
        if not a.out.is_file() or a.out.read_text(encoding='utf-8')!=data:
            raise SystemExit('Catalog UI snapshot desatualizado: regenere com export_browser_catalog.py')
        print(f'Catalog verified: {len(json.loads(data))} valid municipal entries')
    else:
        a.out.parent.mkdir(parents=True,exist_ok=True)
        a.out.write_text(data,encoding='utf-8')
        print(f'Catalog regenerated: {len(json.loads(data))} entries')
