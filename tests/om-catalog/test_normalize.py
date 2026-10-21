import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts/om-catalog'))
from normalize import build
class NormalizationTests(unittest.TestCase):
    def row(self,**kw):
        x=dict(id='1',forca='FAB',sigla='BAMN',nome_publicado='Base Aérea de Manaus',municipio='Manaus',uf='AM',pais_classificacao='BR',endereco_publicado='Rua Teste',cep='69000000',fonte_url='https://fab.mil.br/a',data_coleta='2026-10-20',categoria='',situacao_institucional='NAO_HOMOLOGADA',revisao='PENDENTE',observacoes='')
        x.update(kw);return x
    def test_normalized_name_dedupes(self):
        a=self.row();b=self.row(nome_publicado='Base Aerea de Manaus',id='2')
        orgs,sites,reviews=build([a,b])
        self.assertEqual((len(orgs),len(sites)),(1,1))
        self.assertIn('DUPLICATE_KEY',[r[1] for r in reviews])
    def test_no_invented_coordinates(self):
        _,sites,_=build([self.row()])
        self.assertEqual(sites[0][-2:],['',''])
        self.assertEqual(sites[0][6],'UNVERIFIED_TEXT')
    def test_shared_textual_site(self):
        orgs,sites,_=build([self.row(),self.row(nome_publicado='Outra OM')])
        self.assertEqual(len(orgs),2);self.assertEqual(len(sites),1)
        self.assertEqual(orgs[0][8],orgs[1][8])
    def test_foreign_not_located_in_brazil(self):
        orgs,sites,_=build([self.row(pais_classificacao='US',uf='',municipio='Washington')])
        self.assertFalse(orgs[0][8]);self.assertEqual(len(sites),0)
if __name__=='__main__':unittest.main()
