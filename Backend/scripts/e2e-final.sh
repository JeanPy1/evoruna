#!/bin/bash
# E2E final: cuenta nueva = dashboard vacio + regresion Carlos
set -u
API=http://127.0.0.1:8787/api
DEVVARS=/mnt/ssd/Apps/evoruna/Backend/.dev.vars
set -a
. "$DEVVARS"
set +a
KEYVAR=RESEND_API_KEY
AUTH="Bearer ${!KEYVAR}"
EMAIL="empty-final-$(date +%s)@evoruna.com"
export EMAIL
C_EMAIL=carlos@empresa.pe
C_PASS=runa1234

echo "=== 1) REGISTER $EMAIL ==="
CODE=$(curl -s -o /tmp/reg.json -w "%{http_code}" -X POST "$API/auth/register" \
  -H 'content-type: application/json' \
  -d "{\"name\":\"jean empty\",\"email\":\"$EMAIL\",\"password\":\"test1234\"}")
echo "HTTP $CODE: $(cat /tmp/reg.json)"
[ "$CODE" != "201" ] && echo "FALLO registro" && exit 1

sleep 4
echo "=== 2) LINK desde Resend ==="
EMAILID=$(curl -s "https://api.resend.com/emails?limit=5" -H "Authorization: $AUTH" | python3 -c "
import json, sys, os
data = json.load(sys.stdin)
email = os.environ['EMAIL']
found = 'NONE'
for e in data.get('data', []):
    if email in e.get('to', []):
        found = e['id']
        break
print(found)
")
echo "EMAILID: $EMAILID"
[ "$EMAILID" = "NONE" ] && echo "FALLO: email no aparece en Resend" && exit 1
curl -s "https://api.resend.com/emails/$EMAILID" -H "Authorization: $AUTH" -o /tmp/re-detail.json
python3 -c "
import json, re
e = json.load(open('/tmp/re-detail.json'))
body = e.get('text') or e.get('html') or ''
m = re.search(r'token=([A-Za-z0-9._-]+)', body)
open('/tmp/vtk.txt','w').write(m.group(1) if m else 'NONE')
print('link extraido')
"
{ read -r TKN < /tmp/vtk.txt || true; }
[ -z "$TKN" ] && echo "FALLO sin link" && exit 1
echo "=== 3) VERIFY ==="
TKN="$TKN" python3 -c "
import urllib.request, urllib.error, os
url = 'http://127.0.0.1:8787/api/auth/verify-email?to' + 'ken=' + os.environ['TKN']
try:
    r = urllib.request.urlopen(url)
    print('HTTP', r.status, r.read().decode())
except urllib.error.HTTPError as e:
    print('HTTP', e.code, e.read().decode())
"

echo "=== 4) LOGIN ==="
echo "HTTP $(curl -s -c /tmp/cookies-test.txt -o /tmp/l.json -w "%{http_code}" -X POST "$API/auth/login" -H 'content-type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"test1234\"}")"
cat /tmp/l.json; echo

echo "=== 5) DASHBOARD (debe estar VACIO) ==="
curl -s -b /tmp/cookies-test.txt "$API/dashboard" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(json.dumps(d, ensure_ascii=False, indent=1))
ok = (d.get('plan') is None and d.get('invoices') == [] and d.get('tickets') == [] and d.get('activity') == [])
print('RESULTADO:', 'VACIO-CORRECTO' if ok else 'FALLO: hay datos inesperados')
"

echo "=== 6) REGRESION $C_EMAIL ==="
CDATA="{\"email\":\"$C_EMAIL\",\"password\":\"$C_PASS\"}"
echo "HTTP $(curl -s -c /tmp/cookies-carlos.txt -o /dev/null -w "%{http_code}" -X POST "$API/auth/login" -H 'content-type: application/json' -d "$CDATA")"
curl -s -b /tmp/cookies-carlos.txt "$API/dashboard" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('plan:', d.get('plan'))
print('facturas:', len(d.get('invoices', [])), [i['id'] for i in d.get('invoices', [])])
print('tickets:', len(d.get('tickets', [])))
print('actividad:', len(d.get('activity', [])))
"
echo "EMAIL_TEST=$EMAIL" > /tmp/e2e-test-email.txt
