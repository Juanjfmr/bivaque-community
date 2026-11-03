#!/usr/bin/env python3
"""Convert Geoapify ordered batch results into review-only coordinate suggestions.
Strictly no automatic verification, even on a geocoder's full_match.
"""
import argparse,csv,json
from pathlib import Path
from audit_sites import write_csv
from validate_geocodes import OUTPUT_FIELDS,validate

def convert(manifest,results,queue):
    if not isinstance(results,list) or len(results)!=len(manifest):
        raise ValueError('Provider output length/order cannot be reconciled safely')
    by_id={r['site_id']:r for r in queue}
    out=[]
    for original,hit in zip(manifest,results):
        if not isinstance(hit,dict):hit={}
        lat=hit.get('lat','')
        lon=hit.get('lon','')
        link=('https://www.openstreetmap.org/?mlat='+str(lat)+'&mlon='+str(lon)
              if lat!='' and lon!='' else '')
        candidate={
            'site_id':original['site_id'],'latitude':str(lat),'longitude':str(lon),
            'country':str(hit.get('country_code','')).upper(),
            'state':str(hit.get('state_code','')).upper(),
            'city':str(hit.get('city','')),
            'provider':'Geoapify','source_url':link,
            'precision':str(hit.get('result_type','')),
        }
        record=validate(candidate,by_id)
        # This is a map preview link only, not independent proof of a gate/entrance.
        record['reasons']=(record['reasons']+';' if record['reasons'] else '')+'MAP_LINK_IS_NOT_ACCESS_EVIDENCE'
        out.append(record)
    return out

def run(manifest_path,results_path,queue_path,out_path):
    manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    results=json.loads(results_path.read_text(encoding='utf-8'))
    with queue_path.open(encoding='utf-8',newline='') as f:queue=list(csv.DictReader(f))
    rows=convert(manifest,results,queue)
    out_path.parent.mkdir(parents=True,exist_ok=True)
    write_csv(out_path,OUTPUT_FIELDS,rows)
    return {'candidates':len(rows),'auto_verified':0,'manual_review_required':len(rows)}

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--manifest',type=Path,required=True)
    p.add_argument('--results',type=Path,required=True)
    p.add_argument('--queue',type=Path,required=True)
    p.add_argument('--out',type=Path,required=True)
    a=p.parse_args()
    print(json.dumps(run(a.manifest,a.results,a.queue,a.out),ensure_ascii=False))
