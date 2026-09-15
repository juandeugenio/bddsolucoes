#!/usr/bin/env python3
"""
Gerador do Relatório de Auditoria de Segurança (HTML -> PDF via Chrome headless).
Uso: python gerar_relatorio.py
Requisitos: Google Chrome instalado (usa o caminho abaixo; ajuste se preciso).
Gera: docs/security-audit/relatorio-auditoria-seguranca.pdf
"""
import subprocess
import os
import sys
from datetime import date

BASE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(BASE, "relatorio-auditoria-seguranca.html")
PDF = os.path.join(BASE, "relatorio-auditoria-seguranca.pdf")

CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
]

def find_chrome():
    for c in CHROME_CANDIDATES:
        if os.path.exists(c):
            return c
    return None

def main():
    chrome = find_chrome()
    if not chrome:
        print("[ERRO] Google Chrome/Edge não encontrado. Ajuste CHROME_CANDIDATES.")
        sys.exit(1)

    cmd = [
        chrome, "--headless", "--disable-gpu", "--no-sandbox",
        "--print-to-pdf=" + PDF,
        "--no-pdf-header-footer",
        "--print-to-pdf-no-header",
        "file:///" + HTML.replace("\\", "/"),
    ]
    print(f"[INFO] Gerando PDF com: {chrome}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(PDF):
        size = os.path.getsize(PDF)
        print(f"[OK] PDF gerado: {PDF} ({size} bytes)")
    else:
        print("[ERRO] Falha ao gerar PDF.")
        print(result.stdout)
        print(result.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()