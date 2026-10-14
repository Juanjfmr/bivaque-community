#!/usr/bin/env python3
from pathlib import Path
import hashlib,sys
root=Path(__file__).resolve().parents[2]
p=root/'prototypes/bivaque-html/reference/Bivaque_Material_Web.original.html'
expected='29a402c4e717ab2826c2e2aa0c3da6bac7f7b2b390090ed22c5ff1f2cbb385a4'
if not p.exists():
 print('FAIL: HTML original não encontrado:',p,file=sys.stderr);sys.exit(2)
got=hashlib.sha256(p.read_bytes()).hexdigest()
if got!=expected:
 print('FAIL: SHA256 divergente. Esperado',expected,'Atual',got,file=sys.stderr);sys.exit(1)
print('PASS: HTML original intacto (SHA256',got+')')
