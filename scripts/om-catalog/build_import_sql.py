#!/usr/bin/env python3
"""Create a reviewable SQL seed. Never executes SQL or approves catalog entries."""
import argparse
import json
from pathlib import Path

def sql_string(value):
    if value is None or value == '': return 'NULL'
    return "'" + str(value).replace("'","''") + "'"

def generate(organizations):
    if not organizations or not all(x['catalog_status']=='unverified' and x['site_id'] is None and x['ibge_code'] is None for x in organizations):
        raise ValueError('Only unverified, unlinked catalog entries may be imported')
    values=[]
    for x in organizations:
        row=[x.get(k) for k in ('id','source_key','force','acronym','name','unit_type','city_raw','state_raw','country_classification','source_url','observed_on')]
        values.append('  (' + ', '.join(sql_string(v) for v in row) + ", 'unverified')")
    return ("-- R3 DRAFT. Run in staging after approved ADR and tests, never automatically.\n"
       "begin;\ninsert into public.military_organizations "
       "(id,source_key,force,acronym,official_name,unit_kind,city_raw,state_raw,country_classification,source_url,source_observed_at,status) values\n"
       + ',\n'.join(values)
       + "\non conflict(force,source_key) do update set "
       "official_name=excluded.official_name,acronym=excluded.acronym, "
       "city_raw=excluded.city_raw,state_raw=excluded.state_raw, "
       "source_url=excluded.source_url,source_observed_at=excluded.source_observed_at "
       "where public.military_organizations.status='unverified';\ncommit;\n")

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--organizations',required=True,type=Path)
    p.add_argument('--out',required=True,type=Path)
    a=p.parse_args()
    data=json.loads(a.organizations.read_text(encoding='utf-8'))
    a.out.write_text(generate(data),encoding='utf-8')
    print(f'Unverified seed: {len(data)} rows -> {a.out}')
