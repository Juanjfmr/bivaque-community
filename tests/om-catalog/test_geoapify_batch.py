import csv,json,sys,tempfile,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts/om-catalog'))
from geoapify_batch import build,run
class BatchTests(unittest.TestCase):
    def test_prepare_without_api_or_network(self):
        with tempfile.TemporaryDirectory() as td:
            src=Path(td)/'input.csv'
            with src.open('w',encoding='utf-8',newline='') as f:
                w=csv.DictWriter(f,fieldnames=['site_id','address','city','state','address_quality'])
                w.writeheader()
                w.writerow(dict(site_id='abc',address='Rua Exemplo, 123',city='Manaus',state='AM',address_quality='READY_FOR_EXTERNAL_GEOCODING'))
                w.writerow(dict(site_id='bad',address='...invalid',city='Manaus',state='AM',address_quality='BLOCKED'))
            self.assertEqual(len(build(src)),1)
            result=run(src,Path(td)/'out')
            self.assertEqual(result['addresses'],1)
            self.assertFalse(result['submitted'])
            self.assertEqual(len(json.loads((Path(td)/'out/geoapify_batch_request.json').read_text())),1)
    def test_refuse_costly_batch_over_explicit_cap(self):
        with tempfile.TemporaryDirectory() as td:
            src=Path(td)/'input.csv'
            src.write_text('site_id,address,city,state,address_quality\na,Av A 20,Manaus,AM,READY_FOR_EXTERNAL_GEOCODING\n',encoding='utf-8')
            with self.assertRaises(ValueError):run(src,Path(td)/'out',max_addresses=0)
if __name__=='__main__':unittest.main()
