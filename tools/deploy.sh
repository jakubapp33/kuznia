#!/bin/sh
# Buduje aplikację i publikuje folder dist/ na gałęzi gh-pages (GitHub Pages).
set -e
cd "$(dirname "$0")/.."
npm test
npm run build
touch dist/.nojekyll
cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C .. config user.name)" -c user.email="$(git -C .. config user.email)" commit -q -m "Publikacja $(date '+%Y-%m-%d %H:%M')"
git push -f -q "$(git -C .. remote get-url origin)" gh-pages
rm -rf .git
echo "✓ Opublikowano"
