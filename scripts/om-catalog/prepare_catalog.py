#!/usr/bin/env python3
"""Offline, deterministic audit of the official-source OM catalog. No live writes."""
import argparse
import csv
import hashlib
import json
import re
import unicodedata
import uuid
from collections import Counter
from pathlib import Path

FIELDS = ['id','forca','sigla','nome_publicado','municipio','uf','categoria','localidade_original','pais_classificacao','endereco_publicado','bairro_publicado','cep','latitude','longitude','fonte_url','fonte_arquivo','data_coleta','origem','situacao_institucional','precisao_localizacao','revisao','observacoes']
UF = set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split())
NAMESPACE = uuid.UUID('5b9beaa1-886e-4e87-879e-cd31da64f9af')

def clean(value):
    return re.sub(r'\s+', ' ', (value or '').strip())

def key(value):
    text = unicodedata.normalize('NFKD', clean(value).casefold())
    return ''.join(x for x in text if not unicodedata.combining(x))

def classify(row):
    if row['forca'] == 'EB' and 'tiro de guerra' in key(row['nome_publicado']):
        return 'tiro_de_guerra'
    if row['forca'] == 'MB' and (key(row['nome_publicado']).startswith('navio ') or key(row['nome_publicado']).startswith('submarino ')):
        return 'meio_naval'
    return 'organizacao_ou_unidade'

def prepare(rows, ibge_lookup=None):
    ibge_lookup=ibge_lookup or {}
    organizations, reviews, sites = [], [], {}
    siglas = Counter((r.get('forca'), key(r.get('sigla'))) for r in rows if clean(r.get('sigla')))
    identities = Counter((r.get('forca'),key(r.get('nome_publicado')),key(r.get('municipio')),r.get('uf')) for r in rows)
    for number, raw in enumerate(rows, 1):
        row = {field: clean(raw.get(field)) for field in FIELDS}
        if row['forca'] not in {'FAB','EB','MB'} or not row['nome_publicado'] or not row['fonte_url']:
            raise ValueError(f'Entry {number}: force, name or source missing')
        if row['latitude'] or row['longitude']:
            raise ValueError(f'Entry {number}: unverified source coordinates must not be imported')
        source_key = row['id'] or hashlib.sha256((row['forca']+'|'+row['nome_publicado']).encode()).hexdigest()[:24]
        uid = str(uuid.uuid5(NAMESPACE,row['forca']+'|'+source_key))
        unit_type = classify(row)
        issues = []
        if row['pais_classificacao'] != 'BR': issues.append('not_br_geosearch')
        if not row['municipio'] or row['uf'] not in UF: issues.append('missing_city_or_uf')
        issues.append({'FAB':'fab_current_status_unverified','EB':'eb_current_status_unverified','MB':'navy_source_not_reconfirmed'}[row['forca']])
        if unit_type != 'organizacao_ou_unidade': issues.append('unit_type_review')
        if row['sigla'] and siglas[row['forca'],key(row['sigla'])]>1: issues.append('duplicate_acronym')
        if identities[row['forca'],key(row['nome_publicado']),key(row['municipio']),row['uf']]>1: issues.append('duplicate_identity')
        ibge_code=ibge_lookup.get((row['municipio'],row['uf']))
        if row['municipio'] and row['uf'] in UF and not ibge_code: issues.append('ibge_code_not_checked')
        issues.append('address_not_geocoded' if row['endereco_publicado'] else 'address_missing')
        organizations.append({
            'id':uid,'source_key':source_key,'force':row['forca'],'acronym':row['sigla'],
            'name':row['nome_publicado'],'city_raw':row['municipio'],'state_raw':row['uf'],
            'country_classification':row['pais_classificacao'],'unit_type':unit_type,
            'address_raw':row['endereco_publicado'],'postal_code_raw':row['cep'],
            'source_url':row['fonte_url'],'observed_on':row['data_coleta'],
            'source_origin':row['origem'],'catalog_status':'unverified',
            'ibge_code':ibge_code,'site_id':None,'issues':issues
        })
        reviews.extend({'id':uid,'reason':reason,'name':row['nome_publicado']} for reason in issues)
        if row['endereco_publicado'] and row['pais_classificacao']=='BR' and row['uf'] in UF and row['municipio']:
            address_key = '|'.join([row['uf'],key(row['municipio']),key(row['endereco_publicado']),key(row['cep'])])
            if address_key not in sites:
                sites[address_key] = {
                    'candidate_id':str(uuid.uuid5(NAMESPACE,'site|'+address_key)),
                    'city_raw':row['municipio'],'uf':row['uf'],
                    'address_raw':row['endereco_publicado'],'cep_raw':row['cep'],
                    'site_status':'unverified_candidate','latitude':None,'longitude':None,
                    'organization_ids':[],'source_urls':[]
                }
            sites[address_key]['organization_ids'].append(uid)
            if row['fonte_url'] not in sites[address_key]['source_urls']:
                sites[address_key]['source_urls'].append(row['fonte_url'])
    return organizations, reviews, sorted(sites.values(),key=lambda x:(x['uf'],key(x['city_raw']),key(x['address_raw'])))

def execute(input_file, output_dir, crosswalk=None):
    ibge_lookup={}
    if crosswalk:
        with open(crosswalk,encoding='utf-8-sig',newline='') as fh:
            for record in csv.DictReader(fh,delimiter=';'):
                if record['status']=='match_exato_case_insensitive' and record['ibge_code'].isdigit() and len(record['ibge_code'])==7:
                    ibge_lookup[(record['municipio_fonte'],record['uf'])]=record['ibge_code']
    with open(input_file,encoding='utf-8-sig',newline='') as handle:
        reader=csv.DictReader(handle,delimiter=';')
        if set(FIELDS)-set(reader.fieldnames or []): raise ValueError('Required columns missing')
        rows=list(reader)
    organizations,reviews,sites=prepare(rows,ibge_lookup)
    output_dir.mkdir(parents=True,exist_ok=True)
    def write(filename,data):
        (output_dir/filename).write_text(json.dumps(data,indent=2,sort_keys=True,ensure_ascii=False)+'\n',encoding='utf-8')
    write('organizations.json',organizations)
    write('site-candidates.json',sites)
    write('review.json',reviews)
    report = {
        'total':len(organizations),
        'by_force':dict(sorted(Counter(x['force'] for x in organizations).items())),
        'domestic_classification':sum(x['country_classification']=='BR' for x in organizations),
        'outside_or_undefined':sum(x['country_classification']!='BR' for x in organizations),
        'missing_city_or_uf':sum(not x['city_raw'] or x['state_raw'] not in UF for x in organizations),
        'site_candidates_not_verified':len(sites),
        'ibge_confirmed_oms':sum(bool(x['ibge_code']) for x in organizations),'geographic_search_ready':0,
        'military_personal_affiliations_collected':0,
        'review_flags':dict(sorted(Counter(r['reason'] for r in reviews).items()))
    }
    write('report.json',report)
    return report

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--input',required=True,type=Path)
    parser.add_argument('--out',required=True,type=Path)
    parser.add_argument('--crosswalk',type=Path)
    args=parser.parse_args()
    print(json.dumps(execute(args.input,args.out,args.crosswalk),indent=2,ensure_ascii=False))
