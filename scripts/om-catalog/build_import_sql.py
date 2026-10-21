#!/usr/bin/env python3
"""Create a reviewable staging seed. No SQL execution and no publication."""
import argparse
import json
from pathlib import Path

def sql_string(value):
    if value is None or value=='': return 'NULL'
    return "'" + str(value).replace("'","''") + "'"

def generate(organizations):
    if not organizations or not all(x['catalog_status']=='unverified' and x['site_id'] is None for x in organizations):
        raise ValueError('Only unverified, unlinked entries may be imported')
    columns=('id','source_key','force','acronym','name','unit_type','city_raw','state_raw','country_classification','source_url','observed_on','ibge_code')
    values=[]
    for org in organizations:
        values.append('  (' + ', '.join(sql_string(org.get(k)) for k in columns) + ')')
    return ("-- R3 DRAFT. Apply only in reviewed staging after governance approvals.\n"
      "begin;\nwith source_rows (id,source_key,force,acronym,official_name,unit_kind,city_raw,state_raw,country_classification,source_url,source_observed_at,ibge_code) as (values\n"
      + ',\n'.join(values) + ")\n"
      "insert into public.military_organizations "
      "(id,source_key,force,acronym,official_name,unit_kind,city_raw,state_raw,country_classification,source_url,source_observed_at,locality_id,status)\n"
      "select s.id::uuid,s.source_key,s.force,s.acronym,s.official_name,s.unit_kind,s.city_raw,s.state_raw,s.country_classification,s.source_url,s.source_observed_at::date,l.id,'unverified'\n"
      "from source_rows s left join public.localities l on l.ibge_code=s.ibge_code\n"
      "on conflict(force,source_key) do update set\n"
      " official_name=excluded.official_name, acronym=excluded.acronym,city_raw=excluded.city_raw,\n"
      " state_raw=excluded.state_raw,locality_id=excluded.locality_id,source_url=excluded.source_url,\n"
      " source_observed_at=excluded.source_observed_at\n"
      "where public.military_organizations.status='unverified';\ncommit;\n")

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--organizations',required=True,type=Path)
    p.add_argument('--out',required=True,type=Path)
    a=p.parse_args()
    data=json.loads(a.organizations.read_text(encoding='utf-8'))
    a.out.write_text(generate(data),encoding='utf-8')
    print(f'Unverified seed: {len(data)} rows -> {a.out}')
