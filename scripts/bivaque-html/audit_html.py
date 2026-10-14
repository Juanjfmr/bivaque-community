#!/usr/bin/env python3
"""Inventário estático heurístico: NÃO substitui teste de navegador nem AST JS."""
import re, argparse, json
from pathlib import Path

def main():
 p=argparse.ArgumentParser()
 p.add_argument('--html',type=Path,required=True)
 p.add_argument('--output',type=Path)
 a=p.parse_args();s=a.html.read_text('utf-8')
 funcs=sorted(set(re.findall(r'\bfunction\s+([a-zA-Z_$][\w$]*)\s*\(',s)))
 render=[x for x in funcs if x.startswith('render')]
 handlers=sorted(set(re.findall(r'\bcase\s+[\'\"]([a-zA-Z0-9_-]+)[\'\"]\s*:',s)))
 data_actions=sorted(set(re.findall(r'data-action\s*=\s*\\?[\'\"]([a-zA-Z0-9_-]+)',s)))
 # Ações frequentemente criadas por helpers btn/iconBtn, apenas literais analisados.
 literal_buttons=sorted(set(re.findall(r'\b(?:btn|iconBtn)\s*\([^,]{0,160},\s*[\'\"]([a-zA-Z0-9_-]+)[\'\"]',s)))
 likely=sorted(set(data_actions+literal_buttons))
 maybe_missing=sorted(set(likely)-set(handlers))
 info={'file':str(a.html),'bytes':a.html.stat().st_size,'functions_count':len(funcs),
       'render_functions':render,'case_labels_found_in_file':handlers,
       'data_action_literals':data_actions,'button_action_literals_heuristic':literal_buttons,
       'possible_unhandled_static_actions':maybe_missing,
       'limitations':'Regex global: cases from other switches can inflate coverage; dynamic actions and template interpolation can escape detection. Confirm via AST and browser.'}
 text=json.dumps(info,ensure_ascii=False,indent=2)
 if a.output:
  a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(text+'\n',encoding='utf-8')
 print(text)
if __name__=='__main__': main()
