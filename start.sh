#!/bin/bash
# Script de inicialização para hospedagem (Hostinger hPanel pode usar)
set -e
cd "$(dirname "$0")"
export NODE_ENV=production
node server/index.js