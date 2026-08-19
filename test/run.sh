#!/usr/bin/env bash
# Puszcza wszystkie zestawy testowe. Bez argumentów: całość.
# Z argumentami: tylko podane zestawy, np. ./test/run.sh db wariant
#
# Dziewięć zestawów działa na file:// i nie potrzebuje niczego poza Playwrightem.
# Dwa ostatnie (updbar, offline) sprawdzają prawdziwego service workera, więc
# wymagają HTTP — ten skrypt stawia im lokalne serwery i buduje atrapy dwóch
# wdrożeń (A i B), żeby dało się przejść aktualizację od początku do końca.
set -u
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"
WORK="$(mktemp -d)"
LOCAL=(test nl qual wariant db dict dish mobile reopen)
SERVED=(updbar ratunek offline)
HTTP="$(command -v http-server || echo /opt/node22/lib/node_modules/http-server/bin/http-server)"

want=("$@")
run_it () { [ ${#want[@]} -eq 0 ] && return 0; for w in "${want[@]}"; do [ "$w" = "$1" ] && return 0; done; return 1; }

pass=0; fail=0; ran=0

for s in "${LOCAL[@]}"; do
  run_it "$s" || continue
  out="$(node "$s.mjs" "$WORK" 2>&1)"
  p=$(grep -c '^PASS' <<<"$out"); f=$(grep -c '^FAIL' <<<"$out")
  pass=$((pass+p)); fail=$((fail+f)); ran=$((ran+1))
  printf '%-10s %3d PASS %3d FAIL\n' "$s" "$p" "$f"
  grep '^FAIL' <<<"$out"
  grep -i 'błędy JS' <<<"$out" | grep -v brak
done

# ── atrapy dla zestawów serwerowych ────────────────────────────────────────
stage () {  # stage <katalog> <build>
  mkdir -p "$1"
  cp "$ROOT"/index.html "$ROOT"/manifest.webmanifest "$ROOT"/icon.svg \
     "$ROOT"/icon-192.png "$ROOT"/icon-512.png "$ROOT"/apple-touch-icon.png "$1"/
  sed "s/__BUILD__/$2/" "$ROOT"/sw.js > "$1"/sw.js
  grep -q "$2" "$1"/sw.js || { echo "nie podstawiono numeru buildu w sw.js"; exit 1; }
}

serve () {  # serve <katalog> <port>
  # Zajęty port znaczy, że ktoś inny serwuje swoje pliki — test przeszedłby
  # wtedy na cudzej atrapie i wynik nic by nie znaczył. Lepiej stanąć.
  if curl -sf -o /dev/null --max-time 2 "http://localhost:$2/"; then
    echo "port $2 jest już zajęty — zgaś tamten serwer, inaczej test sprawdza nie te pliki"
    exit 1
  fi
  ( cd "$1" && setsid nohup node "$HTTP" -p "$2" -c-1 --silent >/dev/null 2>&1 </dev/null & )
  for i in $(seq 40); do
    curl -sf -o /dev/null "http://localhost:$2/" && return 0
    sleep 0.2
  done
  echo "serwer na porcie $2 nie wstał"
  exit 1
}

if run_it updbar; then
  # wersja A stoi pod /app, wersja B czeka w /b — updbar.mjs podmienia pliki
  stage "$WORK/upd/app" aaaaaaa
  stage "$WORK/upd/b"   bbbbbbb
  sed -i 's|<b>Makro</b>|<b>Makro2</b>|' "$WORK/upd/b/index.html"
  serve "$WORK/upd" 8211
  out="$(node updbar.mjs "$WORK" 2>&1)"
  p=$(grep -c '^PASS' <<<"$out"); f=$(grep -c '^FAIL' <<<"$out")
  pass=$((pass+p)); fail=$((fail+f)); ran=$((ran+1))
  printf '%-10s %3d PASS %3d FAIL\n' updbar "$p" "$f"; grep '^FAIL' <<<"$out"
fi

if run_it ratunek; then
  stage "$WORK/rescue/app" aaaaaaa
  serve "$WORK/rescue" 8215
  out="$(node ratunek.mjs "$WORK" 2>&1)"
  p=$(grep -c '^PASS' <<<"$out"); f=$(grep -c '^FAIL' <<<"$out")
  pass=$((pass+p)); fail=$((fail+f)); ran=$((ran+1))
  printf '%-10s %3d PASS %3d FAIL\n' ratunek "$p" "$f"; grep '^FAIL' <<<"$out"
  grep -i 'błędy JS' <<<"$out" | grep -v brak
fi

if run_it offline; then
  # offline.mjs sam gasi ten serwer — na tym polega dowód pracy bez sieci
  stage "$WORK/serve/test" aaaaaaa
  serve "$WORK/serve" 8199
  out="$(node offline.mjs "$WORK" 2>&1)"
  p=$(grep -c '^PASS' <<<"$out"); f=$(grep -c '^FAIL' <<<"$out")
  pass=$((pass+p)); fail=$((fail+f)); ran=$((ran+1))
  printf '%-10s %3d PASS %3d FAIL\n' offline "$p" "$f"; grep '^FAIL' <<<"$out"
fi

# to, co jeszcze żyje w katalogu roboczym, gasimy po sobie
for d in "$WORK/serve" "$WORK/upd" "$WORK/rescue"; do
  for pid in /proc/[0-9]*; do
    [ "$(readlink "$pid/cwd" 2>/dev/null)" = "$d" ] && kill -9 "${pid#/proc/}" 2>/dev/null
  done
done

echo "────────────────────────────────"
printf 'zestawów: %d   RAZEM: %d PASS, %d FAIL\n' "$ran" "$pass" "$fail"
echo "katalog roboczy (zrzuty ekranu): $WORK"
[ "$fail" -eq 0 ] || exit 1
