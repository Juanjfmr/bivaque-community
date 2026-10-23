#!/usr/bin/env python3
"""Prepare Geoapify official batch geocoding requests; network is opt-in.
Never treats a provider match as a verified public military entrance.
Ref: https://apidocs.geoapify.com/docs/geocoding/batch/
"""
import argparse,csv,json,os,sys,urllib.parse,urllib.request
from pathlib import Path

API='https://api.geoapify.com/v1/batch/geocode/search'

def build(queue):
    with queue.open(encoding='utf-8',newline='') as f:
        data=list(csv.DictReader(f))
    items=[]
    for row in data:
        if row.get('address_quality')!='READY_FOR_EXTERNAL_GEOCODING':continue
        if not row.get('site_id') or not row.get('address') or not row.get('city') or not row.get('state'):continue
        items.append({'site_id':row['site_id'],
                      'address':f"{row['address']}, {row['city']}, {row['state']}, Brasil"})
    if len({v['site_id'] for v in items})!=len(items):raise ValueError('Duplicate site IDs in geocode queue')
    if len(items)>1000:raise ValueError('Geoapify batch limit exceeded')
    return items

def request_json(method,url,payload=None):
    body=json.dumps(payload,ensure_ascii=False).encode('utf-8') if payload is not None else None
    req=urllib.request.Request(url,data=body,method=method,headers={'Content-Type':'application/json','Accept':'application/json'})
    with urllib.request.urlopen(req,timeout=45) as response:
        status=response.status
        result=json.loads(response.read().decode('utf-8'))
    return status,result

def run(queue,out,operation='prepare',max_addresses=1000,job_id=''):
    items=build(queue)
    if len(items)>max_addresses:raise ValueError(f'{len(items)} addresses exceeds explicit cap ({max_addresses})')
    out.mkdir(parents=True,exist_ok=True)
    (out/'geocoding_manifest.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    payload=[x['address'] for x in items]
    (out/'geoapify_batch_request.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if operation=='prepare':return {'addresses':len(items),'submitted':False}
    api_key=os.environ.get('GEOAPIFY_API_KEY','')
    if not api_key:raise ValueError('GEOAPIFY_API_KEY is required (not committed to the repository)')
    url=API+'?'+urllib.parse.urlencode({'apiKey':api_key,'filter':'countrycode:br','lang':'pt'})
    if operation=='submit':
        status,response=request_json('POST',url,payload)
        if status not in (200,201,202) or not response.get('id'):raise ValueError('Provider did not return a batch job ID')
        (out/'batch_job.json').write_text(json.dumps({'id':response['id'],'inputs':len(items)},indent=2)+'\n',encoding='utf-8')
        return {'addresses':len(items),'submitted':True,'job_id':response['id']}
    if operation=='collect':
        if not job_id or not all(c in '0123456789abcdef' for c in job_id.lower()) or len(job_id)!=32:
            raise ValueError('Expected 32-character provider batch job ID')
        status,response=request_json('GET',url+'&'+urllib.parse.urlencode({'id':job_id}))
        # Geoapify returns pending as HTTP 200 with JSON {"status":"pending"}.
        if status==202 or (isinstance(response,dict) and response.get('status') in ('pending','processing')):
            return {'job_id':job_id,'status':'PENDING'}
        if status!=200 or not isinstance(response,list):
            raise ValueError('Batch has not returned an ordered JSON array')
        if len(response)!=len(items):
            raise ValueError('Batch size does not match the input; refuse untraceable coordinates')
        (out/'provider_results_unverified.json').write_text(json.dumps(response,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        return {'job_id':job_id,'status':'RECEIVED_UNVERIFIED','manual_review_required':True}
    raise ValueError('Invalid operation')

if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--queue',type=Path,required=True)
    ap.add_argument('--out',type=Path,required=True)
    ap.add_argument('--operation',choices=('prepare','submit','collect'),default='prepare')
    ap.add_argument('--max-addresses',type=int,default=1000)
    ap.add_argument('--job-id',default='')
    args=ap.parse_args()
    try:print(json.dumps(run(args.queue,args.out,args.operation,args.max_addresses,args.job_id),ensure_ascii=False))
    except Exception as e:
        # Never log URLs that can contain API keys.
        print('Geoapify batch operation failed; check the queue, credentials and provider response.',file=sys.stderr)
        raise SystemExit(1) from e
