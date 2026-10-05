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

# Fingerprint the assets, then stamp the fingerprint onto the references in
# dist/index.html.
#
# _headers serves /assets/* as immutable for a year. That is right for a
# file whose name changes when its contents change — and nothing else here
# guarantees that, which is the whole problem. With `assets/app.js` always
# spelled the same, a deployed fix never reaches anyone who has the site
# open: their browser holds the old bytes for a year, and no amount of
# F5 helps, because immutable means "do not ask again".
#
# So the URL carries the content hash. The file keeps its name and its
# year-long cache; the address changes whenever the contents do, so a new
# deploy is a new URL and the old one is simply never requested again.
# This is the same trick a CDN does for hashed filenames, without renaming
# anything on disk — which matters, because index.html is hand-edited by a
# non-technical owner who must keep typing plain paths.
fingerprint() {
  # short, stable, content-derived: first 8 hex chars of the file's sha256
  sha256sum "$1" | cut -c1-8
}

APP_V=$(fingerprint assets/app.js)
CSS_V=$(fingerprint assets/style.css)
LOGO_V=$(fingerprint assets/img/logo.jpg)
CRIMSON_V=$(fingerprint assets/img/logo-crimson.jpg)

sed -i \
  -e "s|\(href=\"assets/style\.css\)\"|\1?v=$CSS_V\"|" \
  -e "s|\(src=\"assets/app\.js\)\"|\1?v=$APP_V\"|" \
  -e "s|\(src=\"assets/img/logo\.jpg\)\"|\1?v=$LOGO_V\"|" \
  -e "s|\(href=\"assets/img/logo-crimson\.jpg\)\"|\1?v=$CRIMSON_V\"|" \
  dist/index.html

echo "stamped: app.js?v=$APP_V style.css?v=$CSS_V logo.jpg?v=$LOGO_V logo-crimson.jpg?v=$CRIMSON_V"

# Cloudflare Pages reads this for cache headers; it sits at the root of
# the output directory, not of the repository
cp _headers dist/_headers

# the 404 body, served with a real 404 status for any unknown path.
# See 404.html's own comment: a catch-all redirect to "/" is not possible
# here — it also matches the root, and every target resolves to "/", so
# the site loops to itself and goes down. That was tried and rolled back.
cp 404.html dist/404.html

echo "built $(find dist -type f | wc -l) files into dist/"
