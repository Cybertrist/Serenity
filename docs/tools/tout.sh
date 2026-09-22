#!/bin/bash
# Re-renders every figure of both READMEs, then installs them.
D="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "pastilles.sh"; bash "$D/pastilles.sh"
for LG in fr en; do
  echo; echo "=== $LG ==="
  LANGUE=$LG bash "$D/figures.sh"
  LANGUE=$LG bash "$D/installer.sh"
done
