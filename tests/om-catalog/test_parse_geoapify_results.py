import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts/om-catalog'))
from parse_geoapify_results import convert

class ProviderResultsTests(unittest.TestCase):
    def test_full_match_is_still_unverified(self):
        m=[{'site_id':'abc'}]
        r=[{'lat':-3.1,'lon':-60.0,'country_code':'br','state_code':'AM','city':'Manaus','result_type':'building','rank':{'confidence':1}}]
        q=[{'site_id':'abc','city':'Manaus','state':'AM'}]
        out=convert(m,r,q)[0]
        self.assertEqual(out['status'],'SUGGESTED_REQUIRES_MANUAL_PUBLIC_ENTRANCE_CHECK')
        self.assertIn('MAP_LINK_IS_NOT_ACCESS_EVIDENCE',out['reasons'])
    def test_length_mismatch_rejected(self):
        with self.assertRaises(ValueError):convert([{'site_id':'a'}],[],[])
    def test_city_centroid_rejected(self):
        m=[{'site_id':'abc'}];r=[{'lat':-3.1,'lon':-60.0,'country_code':'br','state_code':'AM','city':'Manaus','result_type':'city'}];q=[{'site_id':'abc','city':'Manaus','state':'AM'}]
        self.assertEqual(convert(m,r,q)[0]['status'],'REJECTED')
if __name__=='__main__':unittest.main()
