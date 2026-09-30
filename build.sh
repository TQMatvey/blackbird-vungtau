#!/bin/sh
# Cloudflare Pages build.
#
# The site has no build step — it is static files. But the repository root
# also holds the docs and 32 MB of source photography, and none of that
# should be served. So the build copies exactly what is public into dist/,
# and the output directory is set to dist.
#
# Cloudflare Pages settings:
#   Build command:      bash build.sh
#   Build output dir:   dist
#
# The same thing works locally: `bash build.sh && npx serve dist`

set -e

rm -rf dist
mkdir -p dist

# the site itself
cp index.html dist/
cp -r assets dist/

# Cloudflare Pages reads this for cache headers; it sits at the root of
# the output directory, not of the repository
cp _headers dist/_headers

# Stamp the assets' content hash into the ?v= on the stylesheet and the
# script, so a deploy busts every browser's cache. The assets are served
# `immutable` for a year (see _headers), so without this a visitor who
# loaded the site once keeps running the JavaScript they first got and a
# fix here never reaches them — which is exactly how a broken Send order
# button outlived the commit that fixed it. That is what the version query
# is for; do not hand-edit the number in index.html.
VER=$(cat dist/assets/app.js dist/assets/style.css | cksum | cut -d' ' -f1)
sed -e "s#\(assets/app\.js?v=\)[^\"']*#\1$VER#" \
    -e "s#\(assets/style\.css?v=\)[^\"']*#\1$VER#" \
    dist/index.html > dist/index.html.tmp
mv dist/index.html.tmp dist/index.html

echo "built $(find dist -type f | wc -l) files into dist/ (assets v=$VER)"
