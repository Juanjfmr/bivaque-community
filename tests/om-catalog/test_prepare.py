import importlib.util
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / 'scripts/om-catalog/prepare_catalog.py'
SPEC = importlib.util.spec_from_file_location('om_catalog',SCRIPT)
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)

class TestOmCatalog(unittest.TestCase):
    def test_name_normalization(self):
        self.assertEqual(mod.key('Base Aérea  de São Luís'),'base aerea de sao luis')

    def test_duplicate_acronym_is_not_identity(self):
        a={'id':'one','forca':'FAB','sigla':'EBL','nome_publicado':'Org A',
           'municipio':'Manaus','uf':'AM','fonte_url':'https://fab.mil.br',
           'pais_classificacao':'BR'}
        b={**a,'id':'two','nome_publicado':'Org B'}
        orgs,reviews,_=mod.prepare([a,b])
        self.assertEqual(len({x['id'] for x in orgs}),2)
        self.assertEqual(sum(x['reason']=='duplicate_acronym' for x in reviews),2)

    def test_coordinates_never_inferred_from_postal_address(self):
        row={'id':'one','forca':'EB','nome_publicado':'Quartel A',
             'municipio':'Manaus','uf':'AM','fonte_url':'https://eb.mil.br',
             'endereco_publicado':'Rua de exemplo, 1','pais_classificacao':'BR'}
        orgs,_,sites=mod.prepare([row])
        self.assertIsNone(orgs[0]['site_id'])
        self.assertIsNone(sites[0]['latitude'])
        self.assertIsNone(sites[0]['longitude'])

    def test_external_coordinates_not_promoted_automatically(self):
        row={'id':'one','forca':'FAB','nome_publicado':'Org A',
             'latitude':'-3.1','fonte_url':'https://fab.mil.br'}
        with self.assertRaises(ValueError): mod.prepare([row])

    def test_ibge_verified_does_not_imply_geolocation(self):
        row={'id':'one','forca':'FAB','nome_publicado':'Base Aerea', 'municipio':'Manaus','uf':'AM',
             'fonte_url':'https://fab.mil.br','pais_classificacao':'BR'}
        orgs,_,_=mod.prepare([row],{('Manaus','AM'):'1302603'})
        self.assertEqual(orgs[0]['ibge_code'],'1302603')
        self.assertIsNone(orgs[0]['site_id'])
        self.assertEqual(orgs[0]['catalog_status'],'unverified')

    def test_real_file_has_expected_counts_without_fake_geodata(self):
        source=Path(__file__).resolve().parents[2]/'data/om-catalog/source-2026-10-20.csv'
        if not source.exists():self.skipTest('source file unavailable')
        import csv
        with source.open(encoding='utf-8-sig',newline='') as f:rows=list(csv.DictReader(f,delimiter=';'))
        orgs,_,sites=mod.prepare(rows)
        self.assertEqual(len(orgs),1416)
        self.assertEqual(sum(x['force']=='FAB' for x in orgs),322)
        self.assertEqual(sum(x['force']=='EB' for x in orgs),771)
        self.assertEqual(sum(x['force']=='MB' for x in orgs),323)
        self.assertTrue(all(x['catalog_status']=='unverified' for x in orgs))
        self.assertTrue(all(x['latitude'] is None for x in sites))
        self.assertEqual(len({x['id'] for x in orgs}),1416)

if __name__ == '__main__':unittest.main()
