import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts/om-catalog'))
from validate_geocodes import validate

class GeocodeReviewTests(unittest.TestCase):
    def example(self,**kw):
        row={'site_id':'x','latitude':'-3.10','longitude':'-60.01','country':'BR','state':'AM','city':'Manaus','provider':'geocoder-approved','source_url':'https://example.org/place/x','precision':'entrance'}
        row.update(kw);return row
    def queue(self):return {'x':{'city':'Manaus','state':'AM'}}
    def test_never_auto_approves(self):
        self.assertEqual(validate(self.example(),self.queue())['status'],'SUGGESTED_REQUIRES_MANUAL_PUBLIC_ENTRANCE_CHECK')
    def test_wrong_city(self):
        self.assertIn('CITY_STATE_MISMATCH',validate(self.example(city='Rio de Janeiro'),self.queue())['reasons'])
    def test_wrong_country(self):
        self.assertIn('COUNTRY_MISMATCH',validate(self.example(country='US'),self.queue())['reasons'])
    def test_city_centroid_precision_blocked(self):
        self.assertIn('INSUFFICIENT_PRECISION',validate(self.example(precision='city'),self.queue())['reasons'])
    def test_outside_brazil(self):
        self.assertIn('OUTSIDE_BRAZIL_ENVELOPE',validate(self.example(longitude='30'),self.queue())['reasons'])
    def test_unknown_site_rejected(self):
        self.assertIn('SITE_NOT_IN_READY_QUEUE',validate(self.example(site_id='bad'),self.queue())['reasons'])
    def test_invalid_coordinates(self):
        self.assertIn('INVALID_COORDINATES',validate(self.example(latitude='oops'),self.queue())['reasons'])
    def test_source_required(self):
        self.assertIn('SOURCE_URL_REQUIRED',validate(self.example(source_url='http://example.org'),self.queue())['reasons'])
if __name__=='__main__':unittest.main()
