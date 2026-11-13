import csv
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import tempfile
import unittest

MODULE = Path(__file__).resolve().parents[3] / "scripts" / "om-catalog" / "catalog.py"
spec = spec_from_file_location("om_catalog", MODULE)
catalog = module_from_spec(spec)
spec.loader.exec_module(catalog)


class OMCatalogTests(unittest.TestCase):
    def test_marinha_candidate_parser(self):
        html = """
        <div class="views-row">
          <h3>1BtlOpRib</h3>
          <div><a href="/om">1º Batalhão de Operações Ribeirinhas</a></div>
          <span>Manaus</span>
        </div>
        <div class="views-row">
          <h3>CPAM</h3><a href="/cpam">Capitania dos Portos da Amazônia Ocidental</a>
          <div>Manaus</div>
        </div>
        """
        rows = catalog.parse_marinha(html)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["city"], "Manaus")
        self.assertEqual(rows[0]["force"], "MARINHA")
        self.assertEqual(rows[0]["uf"], "")

    def test_army_public_directory_card_fields(self):
        sample = """
        <section class="row">
          <div class="card"><div class="card-body">
            <h5 class="card-header bg-secondary">12º Batalhão de Suprimento</h5>
            <div><span class="card-title">Endereço:</span> RUA MARECHAL BITTENCOURT 55</div>
            <div><span class="card-title">Bairro:</span> Santo Antônio</div>
            <div><span class="card-title">Cidade - UF:</span> Manaus - AM</div>
            <div><span class="card-title">CEP:</span> 69029290</div>
          </div></div>
        </section>"""
        rows = catalog.parse_exercito(sample)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["city"], "Manaus")
        self.assertEqual(rows[0]["uf"], "AM")
        self.assertEqual(rows[0]["address_published"], "RUA MARECHAL BITTENCOURT 55")
        self.assertEqual(rows[0]["postal_code_published"], "69029290")

    def test_no_institutional_approval_from_text_match(self):
        seed = [{"force": "MARINHA", "name": "Base Naval de Aratu",
                 "city": "Salvador", "candidate_id": "abc"}]
        candidates = [{"force": "MARINHA", "name": "Base Naval de Aratu",
                       "city": "Salvador", "acronym": "BNA"}]
        new, review = catalog.reconcile(seed, candidates)
        self.assertEqual(new, [])
        self.assertEqual(review[0]["kind"], "CONFIRMED_TEXT_MATCH")
        self.assertNotIn("verified", str(review).lower())

    def test_unmatched_item_does_not_invent_state_or_coordinates(self):
        new, review = catalog.reconcile([], [{
            "force": "MARINHA", "acronym": "X", "name": "Org de Teste",
            "city": "Localidade Teste", "uf": "", "address_published": "",
            "source_url": catalog.SOURCES["MARINHA"]
        }])
        self.assertEqual(new[0]["geo_status"], "NOT_VERIFIED")
        self.assertEqual(new[0]["institutional_status"], "PENDING")
        self.assertEqual(new[0]["uf"], "")
        self.assertEqual(review[0]["action"], "confirm_uf_and_status_before_publish")

    def test_csv_with_bom(self):
        with tempfile.TemporaryDirectory() as d:
            filename = Path(d) / "rows.csv"
            catalog.write_csv(filename, [{"candidate_id": "a"}])
            with filename.open(encoding="utf-8-sig", newline="") as f:
                data = list(csv.DictReader(f, delimiter=";"))
            self.assertEqual(data[0]["candidate_id"], "a")

    def test_stable_identity(self):
        self.assertEqual(catalog.ident("MARINHA", "CPAM", "", "Manaus", "AM"),
                         catalog.ident("MARINHA", "CPAM", "", "Manaus", "AM"))
        self.assertNotEqual(catalog.ident("MARINHA", "CPAM", "", "Manaus", "AM"),
                            catalog.ident("MARINHA", "CPAM", "", "Belém", "PA"))


if __name__ == "__main__":
    unittest.main()
