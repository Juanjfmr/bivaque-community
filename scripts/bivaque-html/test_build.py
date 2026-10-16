#!/usr/bin/env python3
"""Builder invariants; all negative probes are read-only and use in-memory inputs."""

from contextlib import redirect_stdout
from copy import deepcopy
import importlib.util
import io
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch

sys.dont_write_bytecode = True
SPEC = importlib.util.spec_from_file_location("bivaque_html_build", Path(__file__).with_name("build.py"))
BUILD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILD)


class BuilderInvariants(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((BUILD.SRC / "manifest.json").read_bytes())
        cls.reference = (BUILD.PROTOTYPE / BUILD.REFERENCE_NAME).read_bytes()

    def changed_manifest(self):
        return deepcopy(self.manifest)

    def output_stub(self, content, exists=True):
        output = Mock(spec=Path)
        output.is_file.return_value = exists
        output.read_bytes.return_value = content
        return output

    def candidate(self, html=None, exists=True, stored=None):
        html = self.reference if html is None else html
        output = self.output_stub(html if stored is None else stored, exists)
        return html, self.reference, output, [b"const demo = 1;\n"] * 3

    def test_actual_sources_assemble_repeatedly_without_changes(self):
        self.assertEqual(BUILD.assemble(self.manifest), BUILD.assemble(self.manifest))

    def test_forbidden_output_locations(self):
        for name in [BUILD.REFERENCE_NAME, "src/app/start.js", "dist/other.html", "dist/../reference/original.html"]:
            with self.subTest(output=name):
                manifest = self.changed_manifest()
                manifest["output"] = name
                with self.assertRaisesRegex(ValueError, "Output must be exactly"):
                    BUILD.assemble(manifest)

    def test_output_redirects_are_rejected_without_creating_symlinks(self):
        resolve = Path.resolve
        dist = resolve(BUILD.PROTOTYPE) / "dist"
        for target in [dist, dist / "Bivaque_Material_Web.html"]:
            def redirected(path, *args, **kwargs):
                return resolve(BUILD.PROTOTYPE) / "reference/redirected" if path == target else resolve(path, *args, **kwargs)

            with self.subTest(target=target), patch.object(Path, "resolve", redirected):
                with self.assertRaisesRegex(ValueError, "redirected filesystem path"):
                    BUILD.assemble(self.manifest)

    def test_direct_writer_cannot_target_sources(self):
        with self.assertRaisesRegex(ValueError, "Output path changed"):
            BUILD.write_output(BUILD.SRC / "app/start.js", b"must never be written")

    def test_missing_fragment_is_an_error(self):
        manifest = self.changed_manifest()
        manifest["slots"][0]["files"] = ["styles/missing-fragment-for-negative-test.css"]
        with self.assertRaises(FileNotFoundError):
            BUILD.assemble(manifest)

    def test_fragment_cannot_escape_sources(self):
        manifest = self.changed_manifest()
        manifest["slots"][0]["files"] = ["../reference/Bivaque_Material_Web.original.html"]
        with self.assertRaisesRegex(ValueError, "escapes its area"):
            BUILD.assemble(manifest)

    def test_template_and_manifest_cannot_be_fragments(self):
        for source in [self.manifest["template"], "manifest.json"]:
            with self.subTest(source=source):
                manifest = self.changed_manifest()
                manifest["slots"][0]["files"] = [source]
                with self.assertRaisesRegex(ValueError, "overlaps template/manifest"):
                    BUILD.assemble(manifest)

    def test_duplicate_fragment_is_rejected(self):
        manifest = self.changed_manifest()
        manifest["slots"][0]["files"] *= 2
        with self.assertRaisesRegex(ValueError, "Source reused"):
            BUILD.assemble(manifest)

    def test_duplicate_placeholder_is_rejected(self):
        manifest = self.changed_manifest()
        manifest["slots"][0]["token"] = manifest["slots"][1]["token"]
        with self.assertRaisesRegex(ValueError, "fixed inline placeholders"):
            BUILD.assemble(manifest)

    def test_frozen_reference_cannot_be_reassigned(self):
        manifest = self.changed_manifest()
        manifest["reference"] = "dist/Bivaque_Material_Web.html"
        with self.assertRaisesRegex(ValueError, "frozen original HTML"):
            BUILD.assemble(manifest)

    def test_reference_content_drift_is_rejected(self):
        read_bytes = Path.read_bytes
        reference = (BUILD.PROTOTYPE / BUILD.REFERENCE_NAME).resolve()

        def altered(path):
            return b"changed immutable reference" if path == reference else read_bytes(path)

        with patch.object(Path, "read_bytes", altered):
            with self.assertRaisesRegex(ValueError, "Immutable reference changed"):
                BUILD.assemble(self.manifest)

    def test_current_check_accepts_authorized_source_changes(self):
        candidate = self.candidate(self.reference + b"\n")
        with patch.object(BUILD, "assemble", return_value=candidate):
            BUILD.verify_candidate(candidate)

    def test_strict_check_still_rejects_source_changes(self):
        with self.assertRaisesRegex(ValueError, "differ from the frozen reference"):
            BUILD.verify_candidate(self.candidate(self.reference + b"\n"), strict=True)

    def test_strict_check_accepts_identical_reference_and_dist(self):
        BUILD.verify_candidate(self.candidate(), strict=True)

    def test_current_check_rejects_stale_or_missing_dist(self):
        for candidate in [self.candidate(stored=b"stale artifact"), self.candidate(exists=False)]:
            with self.subTest(exists=candidate[2].is_file()), patch.object(BUILD, "assemble", return_value=candidate):
                with self.assertRaisesRegex(ValueError, "dist is missing or stale"):
                    BUILD.verify_candidate(candidate)

    def test_current_check_rejects_changed_second_assembly(self):
        candidate = self.candidate()
        with patch.object(BUILD, "assemble", return_value=self.candidate(self.reference + b"\n")):
            with self.assertRaisesRegex(ValueError, "Independent assemblies differ"):
                BUILD.verify_candidate(candidate)

    def test_missing_node_prevents_syntax_claim(self):
        with patch.object(BUILD.shutil, "which", return_value=None):
            with self.assertRaisesRegex(ValueError, "node is required"):
                BUILD.check_syntax([b"const valid = 1;"])

    def test_invalid_javascript_is_rejected_by_real_node(self):
        with self.assertRaisesRegex(ValueError, "syntax failed"):
            BUILD.check_syntax([b"const invalid = ;"])

    def test_current_cli_describes_change_and_never_writes(self):
        candidate = self.candidate(self.reference + b"\n")
        with patch.object(BUILD, "assemble", return_value=candidate), patch.object(BUILD, "write_output") as writer:
            with patch.object(sys, "argv", ["build.py", "--check-current"]), redirect_stdout(io.StringIO()) as output:
                self.assertEqual(BUILD.main(), 0)
            writer.assert_not_called()
            self.assertIn("candidate differs from the original", output.getvalue())
            self.assertNotIn("source, dist and reference are byte-identical", output.getvalue())

    def test_module_map_covers_all_79_fragments(self):
        document = (BUILD.PROTOTYPE / "docs/MODULE_MAP.md").read_text(encoding="utf-8")
        paths = [name for slot in self.manifest["slots"] for name in slot["files"]]
        self.assertEqual(len(paths), 79)  # Rodada 08: 2 de motion; Rodada 09: alto contraste; Rodada 11: 3 de pedidos; Rodada 12: taxonomia; Rodada 13: Início do desktop e Criar; Rodada 14: paleta; Rodada 15: linha do tempo; Rodada 16: comparação de propostas; Rodada 17: avisos; Rodada 18: fotos e galeria; Rodada 19: contador
        for path in paths:
            with self.subTest(path=path):
                self.assertIn(f"`src/{path}`", document)


if __name__ == "__main__":
    unittest.main(verbosity=2)
