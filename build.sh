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

# and this for the unknown-path redirect — same reason, same place
cp _redirects dist/_redirects

echo "built $(find dist -type f | wc -l) files into dist/"
