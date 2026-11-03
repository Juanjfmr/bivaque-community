#!/usr/bin/env python3
"""Import geocoding suggestions for manual review only; NEVER approve coordinates."""
import argparse
import csv
import json
from collections import Counter
from pathlib import Path
from audit_sites import normalize, read_csv, write_csv

INPUT_FIELDS={'site_id','latitude','longitude','provider','source_url','country','state','city','precision'}
OUTPUT_FIELDS=['site_id','latitude','longitude','provider','source_url','precision','status','reasons']

def validate(row, candidates):
    reasons=[]
    sid=row['site_id'].strip()
    matching=candidates.get(sid)
    if matching is None: reasons.append('SITE_NOT_IN_READY_QUEUE')
    try:
        lat=float(row['latitude']);lon=float(row['longitude'])
        if not (-34.5<=lat<=5.7 and -75<=lon<=-28): reasons.append('OUTSIDE_BRAZIL_ENVELOPE')
    except (ValueError,TypeError): reasons.append('INVALID_COORDINATES')
    if row['country'].strip().upper() not in ('BR','BRA','BRAZIL','BRASIL'): reasons.append('COUNTRY_MISMATCH')
    if not row['source_url'].startswith('https://'): reasons.append('SOURCE_URL_REQUIRED')
    if not row['provider'].strip(): reasons.append('PROVIDER_REQUIRED')
    if row['precision'].strip().lower() not in ('building','entrance','gate','address','street'):
        reasons.append('INSUFFICIENT_PRECISION')
    if matching is not None:
        if normalize(row['city'])!=normalize(matching['city']) or row['state'].upper()!=matching['state'].upper():
            reasons.append('CITY_STATE_MISMATCH')
    return {'site_id':sid,'latitude':row['latitude'],'longitude':row['longitude'],
            'provider':row['provider'],'source_url':row['source_url'],'precision':row['precision'],
            'status':'REJECTED' if reasons else 'SUGGESTED_REQUIRES_MANUAL_PUBLIC_ENTRANCE_CHECK',
            'reasons':';'.join(reasons)}

def run(geocodes_path,ready_queue_path,out_path):
    ready=read_csv(ready_queue_path,{'site_id','city','state','address_quality'})
    candidates={r['site_id']:r for r in ready if r['address_quality']=='READY_FOR_EXTERNAL_GEOCODING'}
    geocodes=read_csv(geocodes_path,INPUT_FIELDS)
    result=[validate(r,candidates) for r in geocodes]
    out_path.parent.mkdir(parents=True,exist_ok=True)
    write_csv(out_path,OUTPUT_FIELDS,result)
    return dict(Counter(r['status'] for r in result))

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--geocodes',type=Path,required=True)
    p.add_argument('--queue',type=Path,required=True)
    p.add_argument('--out',type=Path,required=True)
    a=p.parse_args()
    print(json.dumps(run(a.geocodes,a.queue,a.out),indent=2))
