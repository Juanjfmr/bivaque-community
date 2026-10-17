#!/usr/bin/env python3
"""Bootstrap byte-preserving sources once; never run implicitly during a build."""

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROTOTYPE = ROOT / "prototypes/bivaque-html"
REFERENCE = PROTOTYPE / "reference/Bivaque_Material_Web.original.html"
EXPECTED = "29a402c4e717ab2826c2e2aa0c3da6bac7f7b2b390090ed22c5ff1f2cbb385a4"


def partition(content, definitions):
    """Cut only at exact, unique existing boundaries, leaving separators intact."""
    cuts = [(0, definitions[0][0])]
    for path, marker in definitions[1:]:
        needle = marker.encode("utf-8")
        if content.count(needle) != 1:
            raise ValueError(f"Boundary must occur once: {path}")
        cuts.append((content.index(needle), path))
    if cuts != sorted(cuts):
        raise ValueError("Partition boundaries must preserve original order")
    return [
        (path, content[start : cuts[index + 1][0] if index + 1 < len(cuts) else len(content)])
        for index, (start, path) in enumerate(cuts)
    ]


def main():
    original = REFERENCE.read_bytes()
    if hashlib.sha256(original).hexdigest() != EXPECTED:
        raise ValueError("Reference fingerprint changed; refusing extraction")
    src = PROTOTYPE / "src"
    if src.exists():
        raise ValueError("src already exists; extraction never overwrites editable sources")
    blocks = list(re.finditer(rb"<(style|script)>(.*?)</\1>", original, re.S))
    if [block.group(1) for block in blocks] != [b"style", b"script", b"script", b"script"]:
        raise ValueError("Expected exactly one style and three script blocks")
    css, vendor, data, app = [block.group(2) for block in blocks]
    font_end = list(re.finditer(rb"@font-face\{[^}]*\}", css))[1].end()
    style_parts = [("styles/fonts.css", css[:font_end])] + partition(css[font_end:], [
        ("styles/base.css", None),
        ("styles/create-menu.css", "/* Restore the original SVG proportions"),
        ("styles/palette.css", "/* Preserve the original Bivaque palette"),
        ("styles/navigation.css", "/* The original mobile bar collapses"),
        ("styles/overlays.css", "/* Keep the original sheets"),
        ("styles/groups.css", "/* ===== Grupos ===== */"),
    ])
    data_parts = partition(data, [
        ("data/demo/material-version.js", None),
        ("data/demo/source.js", "const SOURCE="),
        ("data/demo/assets.js", "const ASSETS="),
    ])
    app_parts = partition(app, [
        ("app/open.js", None),
        ("utilities/format.js", "const $=(s,r=document)"),
        ("data/demo/model.js", "const KEY="),
        ("features/groups/presets.js", "/* ================= Grupos"),
        ("app/state.js", "let groupQuery="),
        ("shell/primitives.js", "function image(ref)"),
        ("shell/navigation.js", "function theme()"),
        ("features/home/views.js", "function renderHome()"),
        ("features/listings/catalog.js", "function filterChips("),
        ("features/businesses/catalog.js", "function renderBusinesses()"),
        ("features/search/views.js", "const SYNONYMS="),
        ("features/community/views.js", "function renderCommunity()"),
        ("features/listings/detail.js", "function unavailable()"),
        ("features/businesses/detail.js", "function renderBusiness()"),
        ("features/community/question.js", "function renderQuestion()"),
        ("features/groups/views.js", "function cycleOf("),
        ("features/groups/editors.js", "function openPostEditor("),
        ("features/groups/handlers.js", "async function groupAction("),
        ("features/events/views.js", "function renderAgenda()"),
        ("features/profile/views.js", "function renderProfile()"),
        ("features/messaging/views.js", "function renderThreads()"),
        ("features/transfers/guide.js", "function renderGuide()"),
        ("shell/dialogs.js", "function showDialog("),
        ("shell/create-menu.js", "function openCreate("),
        ("features/profile/settings.js", "function openCity()"),
        ("features/listings/editor.js", "function photoUploadHtml()"),
        ("features/events/editor.js", "function openEventEditor("),
        ("features/businesses/editor.js", "function openBusinessEditor("),
        ("features/community/editor.js", "function openAsk("),
        ("features/businesses/indication.js", "function openIndicate()"),
        ("features/profile/demo-actions.js", "function openPlans()"),
        ("features/auth/onboarding.js", "function openOnboarding()"),
        ("features/messaging/actions.js", "function ensureThread("),
        ("shell/bindings.js", "function bindScreen()"),
        ("motion/gestures.js", "let openSwipe="),
        ("app/handlers.js", "async function perform("),
        ("app/start.js", "document.addEventListener('click',async e=>"),
    ])
    groups = [style_parts, [("vendor/material-web-2.5.0.js", vendor)], data_parts, app_parts]
    template = original
    slots = []
    for index in reversed(range(len(blocks))):
        block = blocks[index]
        token = f"{{{{BIVAQUE_INLINE_{index}}}}}".encode("ascii")
        if token in original:
            raise ValueError("Placeholder collides with reference bytes")
        template = template[:block.start(2)] + token + template[block.end(2):]
    for index, pieces in enumerate(groups):
        for path, content in pieces:
            target = src / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
        slots.append({
            "token": f"{{{{BIVAQUE_INLINE_{index}}}}}",
            "kind": "style" if index == 0 else "script",
            "files": [path for path, _ in pieces],
            "baselineSha256": hashlib.sha256(b"".join(content for _, content in pieces)).hexdigest(),
        })
    template_path = src / "shell/template.html"
    template_path.write_bytes(template)
    manifest = {
        "formatVersion": 1,
        "reference": "reference/Bivaque_Material_Web.original.html",
        "referenceSha256": EXPECTED,
        "template": "shell/template.html",
        "output": "dist/Bivaque_Material_Web.html",
        "slots": slots,
    }
    (src / "manifest.json").write_bytes((json.dumps(manifest, indent=2) + "\n").encode("utf-8"))
    print(f"Extracted {sum(len(parts) for parts in groups)} byte-preserving fragments")


if __name__ == "__main__":
    main()
