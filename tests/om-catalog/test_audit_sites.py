import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts/om-catalog'))
from audit_sites import assess, audit

class SiteAuditTests(unittest.TestCase):
    def s(self, **kw):
        site=dict(id='abc',public_address='Avenida Brasil, 2525',city='Manaus',state='AM',zip_code='69000000',source_url='https://eb.mil.br')
        site.update(kw)
        return site
    def om(self,name='Base Aerea'):
        return dict(site_id='abc',name=name)
    def test_numbered_street_candidate_not_verified(self):
        v=assess(self.s(),[self.om()])
        self.assertEqual(v['address_quality'],'READY_FOR_EXTERNAL_GEOCODING')
        self.assertEqual(v['geolocation_status'],'UNVERIFIED_TEXT')
    def test_corrupt_address_blocked(self):
        self.assertEqual(assess(self.s(public_address='...Rua XYZ, 12'),[self.om()])['address_quality'],'BLOCKED')
    def test_corrupt_city_blocked(self):
        self.assertEqual(assess(self.s(city='...São José da Laje'),[self.om()])['address_quality'],'BLOCKED')
    def test_shared_address_not_proof_of_same_installation(self):
        v=assess(self.s(),[self.om('1'),self.om('2')])
        self.assertIn('POSSIBLE_SHARED_SITE',v['issues'])
        self.assertEqual(v['organization_count'],'2')
    def test_bad_cep_blocked(self):
        self.assertEqual(assess(self.s(zip_code='690'),[self.om()])['address_quality'],'BLOCKED')
    def test_ibge_unmatched_blocked(self):
        v=assess(self.s(),[self.om()],{('rio de janeiro','RJ')})
        self.assertEqual(v['address_quality'],'BLOCKED')
    def test_ibge_match(self):
        self.assertEqual(assess(self.s(),[self.om()],{('manaus','AM')})['ibge_city_match'],'MATCH')
    def test_orphan_blocked(self):
        self.assertEqual(assess(self.s(),[])['address_quality'],'BLOCKED')
    def test_only_ready_is_queued(self):
        org=[self.om()]; sites=[self.s(),self.s(id='corrupt',public_address='...Rua Teste, 20')]
        _,_,q,summary=audit(org,sites)
        self.assertEqual(len(q),1)
        self.assertEqual(summary['verified_public_access'],0)
    def test_street_name_number_is_not_house_number(self):
        v=assess(self.s(public_address='Rua 25 de Agosto'),[self.om()])
        self.assertIn('NO_HOUSE_NUMBER',v['issues'])
        self.assertNotEqual(v['address_quality'],'READY_FOR_EXTERNAL_GEOCODING')
if __name__=='__main__':unittest.main()
