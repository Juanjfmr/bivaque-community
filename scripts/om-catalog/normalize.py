#!/usr/bin/env python3
"""Normalização conservadora de fontes públicas de OMs, sem homologação."""
import csv
import hashlib
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

COLUMNS=['id','forca','sigla','nome_publicado','municipio','uf','categoria','localidade_original','pais_classificacao','endereco_publicado','bairro_publicado','cep','latitude','longitude','fonte_url','fonte_arquivo','data_coleta','origem','situacao_institucional','precisao_localizacao','revisao','observacoes']

def norm(s):
    return re.sub(r'\s+', ' ', ''.join(c for c in unicodedata.normalize('NFKD',s.lower()) if not unicodedata.combining(c))).strip()

def build(rows):
    records=[];seen=set();sites={};reviews=[]
    for r in rows:
        force=r['forca'].strip();name=r['nome_publicado'].strip();city=r['municipio'].strip()
        uf=r['uf'].strip().upper();country=r['pais_classificacao'].strip() or 'UNKNOWN'
        sigla=r['sigla'].strip();addr=r['endereco_publicado'].strip();cep=re.sub(r'\D','',r['cep'])
        if force not in ('FAB','EB','MB') or not name: raise ValueError('invalid source entry')
        identity='|'.join((force,norm(name),norm(city),uf,country))
        if identity in seen:
            reviews.append((r['id'],'DUPLICATE_KEY',name));continue
        seen.add(identity);oid=hashlib.sha256(identity.encode()).hexdigest()[:24]
        site_id='';reasons=[]
        if country!='BR': reasons.append('FOREIGN_OR_UNKNOWN')
        if not city or (country=='BR' and not re.fullmatch('[A-Z]{2}',uf)): reasons.append('MISSING_CITY_UF')
        if not r['fonte_url'].startswith('https://'): reasons.append('SOURCE_CHECK')
        if force=='EB' and re.search(r'\btiro(s)? de guerra\b|^TG\s*\d',norm(name),flags=re.I): reasons.append('TIRO_DE_GUERRA')
        if r['situacao_institucional'] not in ('ATIVA_CONFIRMADA','ATIVO_CONFIRMADO'): reasons.append('ACTIVE_NOT_VERIFIED')
        if r['revisao'].strip() and r['revisao'].strip() not in ('OK','VALIDADO'): reasons.append('LEGACY_REVIEW')
        if addr and city and uf and country=='BR':
            key='|'.join((norm(addr),norm(city),uf,cep))
            site_id=hashlib.sha256(key.encode()).hexdigest()[:24]
            sites.setdefault(site_id,[site_id,addr,city,uf,cep,r['fonte_url'],'UNVERIFIED_TEXT','',''])
        else: reasons.append('NO_SITE_ADDRESS')
        for reason in reasons: reviews.append((oid,reason,name))
        records.append([oid,force,sigla,name,city,uf,country,r['categoria'],site_id,r['fonte_url'],r['data_coleta'],'UNVERIFIED' if reasons else 'PENDING',';'.join(reasons)])
    return records,list(sites.values()),reviews

def write_csv(path,headers,rows):
    with open(path,'w',encoding='utf-8',newline='') as f:
        w=csv.writer(f);w.writerow(headers);w.writerows(rows)

def run(source,out):
    out.mkdir(parents=True,exist_ok=True)
    with source.open(encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f,delimiter=';');missing=set(COLUMNS)-set(reader.fieldnames or [])
        if missing:raise ValueError(f'missing columns: {missing}')
        rows=list(reader)
    orgs,sites,reviews=build(rows)
    write_csv(out/'military_organizations.csv',['id','force','acronym','name','city','state','country','source_category','site_id','source_url','collected_at','status','review_reasons'],orgs)
    write_csv(out/'military_sites.csv',['id','public_address','city','state','zip_code','source_url','geolocation_status','latitude','longitude'],sites)
    write_csv(out/'review_queue.csv',['organization_id','reason','name'],reviews)
    print(f'INPUT={len(rows)} ORGANIZATIONS={len(orgs)} ADDRESS_SITES={len(sites)} REVIEW_FLAGS={len(reviews)} FORCES={dict(Counter(r[1] for r in orgs))}')
    return orgs,sites,reviews

if __name__=='__main__':
    if len(sys.argv)!=3: raise SystemExit('usage: normalize.py INPUT_CSV OUTPUT_DIR')
    run(Path(sys.argv[1]),Path(sys.argv[2]))
