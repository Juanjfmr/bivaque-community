#!/usr/bin/env python3
"""Read-only review of existing Geoapify responses, never military site approval."""
import argparse,csv,json,collections,unicodedata,re
from pathlib import Path
def readcsv(path):
    with open(path,encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def num(v):
    s=''.join(c for c in unicodedata.normalize('NFKD',str(v or '').lower()) if not unicodedata.combining(c)).strip()
    s=re.sub(r'^(?:nr\.?|n[º°.]?|numero)\s*','',s).strip()
    return s.lstrip('0') or ('0' if s else '')
def save(path,fields,items):
    with open(path,'w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(items)
def main(a):
    manifest=json.loads(a.manifest.read_text(encoding='utf-8'))
    provider=json.loads(a.provider.read_text(encoding='utf-8'))
    suggestions=readcsv(a.suggestions);queue=readcsv(a.queue);orgs=readcsv(a.organizations)
    assert len(manifest)==len(provider)==len(suggestions)==537
    assert len(set(x['site_id'] for x in manifest))==537
    assert [x['site_id'] for x in manifest]==[x['site_id'] for x in suggestions]
    qmap={x['site_id']:x for x in queue}
    omap=collections.defaultdict(list)
    for o in orgs:
        if o.get('site_id'):omap[o['site_id']].append(o)
    coordcount=collections.Counter((x['latitude'],x['longitude']) for x in suggestions if x.get('latitude') and x.get('longitude'))
    allrows=[]
    for n,(manifest_row,raw,sug) in enumerate(zip(manifest,provider,suggestions),1):
        raw=raw if isinstance(raw,dict) else {}
        site=qmap[manifest_row['site_id']];linked=omap[manifest_row['site_id']]
        parsed=num((raw.get('query') or {}).get('parsed',{}).get('housenumber'))
        returned=num(raw.get('housenumber'))
        building=raw.get('result_type')=='building'
        matches=bool(building and parsed and returned and parsed==returned)
        category=raw.get('category') or ''
        if category not in ('','building'):risk,priority='CONFLICT_NON_MILITARY_POI','P0'
        elif building and not matches:risk,priority='BUILDING_NUMBER_CONFLICT','P0'
        elif not building:risk,priority='STREET_ONLY_OR_OTHER','P1'
        else:risk,priority='BUILDING_NUMBER_MATCH_NOT_MILITARY_IDENTITY','P2'
        confidence=(raw.get('rank') or {}).get('confidence')
        flags=[]
        if confidence is None or float(confidence)<0.5:flags.append('LOW_CONFIDENCE')
        if sug.get('latitude') and coordcount[(sug['latitude'],sug['longitude'])]>1:flags.append('SHARED_COORDINATES')
        allrows.append({
            'site_id':manifest_row['site_id'],'manifest_order':n,
            'forces':' | '.join(sorted(set(o['force'] for o in linked))),
            'organizations':' | '.join(o['name'] for o in linked),
            'institutional_source_status':' | '.join(sorted(set(o.get('status','') for o in linked))),
            'public_address':site['address'],'city':site['city'],'state':site['state'],
            'military_directory_source_url':site.get('source_url',''),
            'provider_formatted_address':raw.get('formatted',''),
            'provider_result_type':raw.get('result_type',''),
            'provider_place_name':raw.get('name',''),
            'provider_category':category,
            'provider_confidence':confidence if confidence is not None else '',
            'provider_match_type':(raw.get('rank') or {}).get('match_type',''),
            'expected_house_number':parsed,'provider_house_number':returned,
            'house_number_matches':'YES' if matches else 'NO',
            'latitude_UNVERIFIED':sug.get('latitude',''),
            'longitude_UNVERIFIED':sug.get('longitude',''),
            'map_preview_NOT_evidence':sug.get('source_url',''),
            'previous_validator_status':sug['status'],
            'previous_validator_reasons':sug['reasons'],
            'triage_risk':risk,'review_priority':priority,'other_flags':';'.join(flags),
            'independent_official_OM_address_source':'',
            'independent_evidence_checked_date':'',
            'manual_review_notes':'','review_state':'NOT_REVIEWED',
            'military_location_homologated':'NO','publish_to_Bivaque':'NO'})
    accepted=[x for x in allrows if x['previous_validator_status'].startswith('SUGGESTED')]
    rejected=[x for x in allrows if x['previous_validator_status']=='REJECTED']
    assert len(accepted)==267 and len(rejected)==270
    a.out.mkdir(parents=True,exist_ok=True);fields=list(allrows[0])
    save(a.out/'267_review_queue.csv',fields,accepted)
    save(a.out/'270_rejected_audit.csv',fields,rejected)
    summary={'batch_id':'4253ec562d7c4d5896a3907de3ed30fa',
        'addresses':537,'candidates_for_review':267,'prior_rejected':270,
        'by_force':dict(collections.Counter(x['forces'] for x in accepted)),
        'precision':dict(collections.Counter(x['provider_result_type'] for x in accepted)),
        'risk_classes':dict(collections.Counter(x['triage_risk'] for x in accepted)),
        'priorities':dict(collections.Counter(x['review_priority'] for x in accepted)),
        'flags':dict(collections.Counter(f for x in accepted for f in x['other_flags'].split(';') if f)),
        'human_reviewed':0,'homologated':0,'published':0,'new_provider_submissions':0}
    (a.out/'triage_summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (a.out/'README.md').write_text('# Geoapify: revisão de 267 locais do Bivaque\n\n'
        'O endereço do diretório militar é somente referência textual publicada. '
        'A localização Geoapify NÃO verifica identidade da organização ou portões. '
        'Um número de imóvel coincidente NÃO é homologação. '
        'Pontos em ruas são aproximações, não sedes. '
        'Registre evidência atual e independente em cada linha e mantenha publicação bloqueada até revisão.\n'
        'Recuperação offline do lote existente; zero novas submissões à Geoapify.\n',
        encoding='utf-8')
    print(json.dumps(summary,ensure_ascii=False))
if __name__=='__main__':
    parser=argparse.ArgumentParser()
    for field in ('manifest','provider','suggestions','queue','organizations','out'):
        parser.add_argument('--'+field,type=Path,required=True)
    main(parser.parse_args())
