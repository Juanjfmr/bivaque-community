#!/usr/bin/env python3
"""Build editable fragments into a standalone HTML without re-extracting sources."""

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROTOTYPE = ROOT / "prototypes/bivaque-html"
SRC = PROTOTYPE / "src"
EXPECTED = "29a402c4e717ab2826c2e2aa0c3da6bac7f7b2b390090ed22c5ff1f2cbb385a4"
REFERENCE_NAME = "reference/Bivaque_Material_Web.original.html"
OUTPUT_NAME = "dist/Bivaque_Material_Web.html"


def local_path(base, relative):
    if not isinstance(relative, str) or not relative:
        raise ValueError("Manifest paths must be non-empty strings")
    path = (base / relative).resolve()
    if not path.is_relative_to(base.resolve()):
        raise ValueError(f"Manifest path escapes its area: {relative}")
    return path


def output_path(manifest):
    if manifest.get("output") != OUTPUT_NAME:
        raise ValueError(f"Output must be exactly {OUTPUT_NAME}")
    expected_dist = PROTOTYPE.resolve() / "dist"
    expected_output = expected_dist / "Bivaque_Material_Web.html"
    if expected_dist.resolve() != expected_dist or expected_output.resolve() != expected_output:
        raise ValueError("Output or dist resolves through a redirected filesystem path")
    return expected_output


def assemble(manifest=None):
    manifest_path = local_path(SRC, "manifest.json")
    if manifest is None:
        manifest = json.loads(manifest_path.read_bytes())
    if not isinstance(manifest, dict):
        raise ValueError("Manifest must be an object")
    if manifest.get("formatVersion") != 1 or manifest.get("referenceSha256") != EXPECTED:
        raise ValueError("Unsupported manifest or changed baseline fingerprint")
    output = output_path(manifest)
    if manifest.get("reference") != REFERENCE_NAME:
        raise ValueError("Reference must be the frozen original HTML")
    reference = local_path(PROTOTYPE, REFERENCE_NAME).read_bytes()
    if hashlib.sha256(reference).hexdigest() != EXPECTED:
        raise ValueError("Immutable reference changed")
    template_path = local_path(SRC, manifest["template"])
    if template_path == manifest_path:
        raise ValueError("Template cannot be the manifest")
    html = template_path.read_bytes()
    slots = manifest["slots"]
    if not isinstance(slots, list) or len(slots) != 4 or not all(isinstance(slot, dict) for slot in slots):
        raise ValueError("Manifest must contain four slot objects")
    if [slot.get("kind") for slot in slots] != ["style", "script", "script", "script"]:
        raise ValueError("Expected exactly one style and three scripts")
    expected_tokens = [f"{{{{BIVAQUE_INLINE_{index}}}}}" for index in range(4)]
    if [slot.get("token") for slot in slots] != expected_tokens:
        raise ValueError("Expected the four fixed inline placeholders in order")
    tokens = [token.encode("ascii") for token in expected_tokens]
    scripts = []
    all_paths = {template_path, manifest_path}
    for slot, token in zip(slots, tokens):
        if html.count(token) != 1:
            raise ValueError(f"Placeholder missing or duplicated: {slot['token']}")
        parts = []
        if not isinstance(slot["files"], list) or not slot["files"]:
            raise ValueError("Every slot must contain a non-empty source-file list")
        for relative in slot["files"]:
            path = local_path(SRC, relative)
            if path in all_paths:
                raise ValueError(f"Source reused or overlaps template/manifest: {relative}")
            all_paths.add(path)
            parts.append(path.read_bytes())
        content = b"".join(parts)
        if any(item in content for item in tokens):
            raise ValueError("Source contains a reserved build placeholder")
        html = html.replace(token, content, 1)
        if slot["kind"] == "script":
            scripts.append(content)
    if re.search(rb"\{\{BIVAQUE_INLINE_\d+\}\}", html):
        raise ValueError("Unresolved placeholder in assembled HTML")
    return html, reference, output, scripts


def write_output(output, html):
    """Replace the artifact atomically; never truncate a pre-existing hard-linked file."""
    if output != output_path({"output": OUTPUT_NAME}):
        raise ValueError("Output path changed since assembly")
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=output.parent, prefix=".bivaque-build-", suffix=".tmp", delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(html)
        if output != output_path({"output": OUTPUT_NAME}):
            raise ValueError("Output path changed before replacement")
        temporary.replace(output)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def check_syntax(scripts):
    node = shutil.which("node")
    if node is None:
        raise ValueError("node is required to validate the three assembled JavaScript blocks")
    for index, content in enumerate(scripts):
        result = subprocess.run([node, "--check", "-"], input=content, capture_output=True)
        if result.returncode:
            message = result.stderr.decode("utf-8", errors="replace")
            raise ValueError(f"Script {index + 1} syntax failed:\n{message}")
    print("PASS: syntax of the three complete script blocks (node --check)")


def verify_candidate(candidate, strict=False):
    """Check a current build without changing the immutable reference contract."""
    html, reference, output, _ = candidate
    if strict:
        if html != reference:
            digest = hashlib.sha256(html).hexdigest()
            raise ValueError(f"Editable sources differ from the frozen reference (built SHA256 {digest})")
    elif assemble() != candidate:
        raise ValueError("Independent assemblies differ; sources or manifest changed during verification")
    if not output.is_file() or output.read_bytes() != html:
        raise ValueError("dist is missing or stale; run build.py")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    checks = parser.add_mutually_exclusive_group()
    checks.add_argument("--check", action="store_true", help="Read-only comparison against frozen reference and existing dist")
    checks.add_argument("--check-current", action="store_true", help="Read-only current build check: reference intact, deterministic assembly, syntax and fresh dist")
    args = parser.parse_args()
    try:
        candidate = assemble()
        html, reference, output, scripts = candidate
        check_syntax(scripts)
        digest = hashlib.sha256(html).hexdigest()
        if args.check or args.check_current:
            verify_candidate(candidate, strict=args.check)
        if args.check:
            print(f"PASS: source, dist and reference are byte-identical ({len(html)} bytes; SHA256 {digest})")
        elif args.check_current:
            relation = "identical to" if html == reference else "differs from"
            print(f"PASS: current sources assemble deterministically; dist is fresh ({len(html)} bytes; SHA256 {digest})")
            print(f"Frozen reference is intact ({EXPECTED}); candidate {relation} the original")
        else:
            write_output(output, html)
            print(f"Built {output.relative_to(ROOT)} ({len(html)} bytes; SHA256 {digest})")
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
