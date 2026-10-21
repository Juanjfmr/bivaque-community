import csv,json,sys,tempfile,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts/om-catalog'))
from export_browser_catalog import render
class CatalogTests(unittest.TestCase):
    def test_invalid_city_excluded_and_names_only(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td);raw=root/'raw.csv';cities=root/'cities.csv'
            cols=['id','forca','sigla','nome_publicado','municipio','uf','pais_classificacao','endereco_publicado']
            with raw.open('w',newline='',encoding='utf-8') as f:
                w=csv.DictWriter(f,fieldnames=cols,delimiter=';');w.writeheader()
                w.writerow(dict(id='1',forca='FAB',sigla='BAMN',nome_publicado='Base Aérea de Manaus',municipio='Manaus',uf='AM',pais_classificacao='BR',endereco_publicado='Sensitive address'))
                w.writerow(dict(id='2',forca='EB',sigla='',nome_publicado='Falso',municipio='Roma',uf='DF',pais_classificacao='BR',endereco_publicado='Elsewhere'))
            cities.write_text('city_name,state_code,ibge_code\nManaus,AM,1302603\nBrasília,DF,5300108\n',encoding='utf-8')
            out=json.loads(render(raw,cities))
            self.assertEqual(len(out),1)
            self.assertEqual(out[0]['city'],'Manaus')
            self.assertNotIn('endereco_publicado',out[0])
    def test_repo_snapshot_determinism(self):
        # Regression against the checked-in generated directory.
        repo=Path(__file__).resolve().parents[2]
        expected=repo/'apps/web/lib/om/catalog.json'
        if not expected.exists():self.skipTest('Generated snapshot not yet in repo')
        self.assertEqual(expected.read_text(encoding='utf-8'),
                         render(repo/'data/om/raw_oms_1416.csv',repo/'data/om/ibge_localities.csv'))
if __name__=='__main__':unittest.main()
