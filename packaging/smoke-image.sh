#!/bin/sh
# The collector image starts and is healthy (distribution spec §4.1, §9):
# run with the anonymous volume its `VOLUME` makes, as its own user, the
# collector must find that directory its own (65532, 0700), write it, answer
# `collector healthcheck`, and be reported healthy by Docker's own
# `HEALTHCHECK`. Reading the volume's directory on the host needs `sudo`.
#
# Usage: smoke-image.sh <image>
set -eu

image=$1
name="hennery-smoke-$$"
scratch=$(mktemp -d)
trap 'docker rm -fv "$name" >/dev/null 2>&1 || true; rm -f "$scratch/index.html" "$scratch/asset.js"; rmdir "$scratch"' EXIT

fail() {
    docker logs "$name" >&2 || true
    echo "FAIL: $*" >&2
    exit 1
}

# Docker's checks start one interval after the start: shortened here.
docker run -d --name "$name" --health-interval=2s \
    -p 127.0.0.1::8080 "$image" >/dev/null

# The healthcheck itself, as the HEALTHCHECK runs it (no shell in the image).
healthy=0
for _ in $(seq 1 30); do
    if docker exec "$name" /usr/local/bin/hennery collector healthcheck; then
        healthy=1
        break
    fi
    sleep 1
done
[ "$healthy" = 1 ] || fail "collector healthcheck never passed"
echo "ok: collector healthcheck passes"

# The database is in the volume, so the collector could write it.
docker exec "$name" /usr/local/bin/hennery admin hosts >/dev/null ||
    fail "the admin socket in the data directory does not answer"
volume=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/hennery"}}{{.Name}}{{end}}{{end}}' "$name")
[ -n "$volume" ] || fail "no volume at /var/lib/hennery"
mode=$(docker run --rm --user 65532:65532 -v "$volume:/data:ro" \
    --entrypoint /busybox/stat \
    gcr.io/distroless/static-debian13:debug@sha256:07148a6899406df51906b183f581cf66e5b05fd51aca438bdf1d3998df566961 \
    -c '%u:%g %a' /data)
[ "$mode" = "65532:65532 700" ] || fail "the data directory is $mode, not 65532:65532 700"
# The collector warns when it finds its data directory open to others.
if docker logs "$name" 2>&1 | grep -q "other users"; then
    fail "the collector warned about its data directory's permissions"
fi
echo "ok: the data directory is the collector's (65532:65532 700)"

status=
for _ in $(seq 1 30); do
    status=$(docker inspect --format '{{.State.Health.Status}}' "$name")
    [ "$status" = healthy ] && break
    sleep 1
done
[ "$status" = healthy ] || fail "Docker reports the container $status"
echo "ok: Docker reports the container healthy"

# In the image itself: the directory is 65532's and 0700, and its parent is
# still root's (`COPY --from=data … /var/lib/` merges into the existing one).
listing=$(docker export "$name" | tar -tvf - | grep -E ' var/lib/(hennery/)?$' || true)
printf '%s\n' "$listing" | grep -Eq '^drwx------ +65532/65532 .* var/lib/hennery/$' ||
    fail "the image's /var/lib/hennery is not 65532's and 0700: $listing"
printf '%s\n' "$listing" | grep -Eq '^drwxr-xr-x +0/0 .* var/lib/$' ||
    fail "the image's /var/lib is not root's and 0755: $listing"
echo "ok: the image's /var/lib/hennery is 65532's and 0700, /var/lib root's"

user=$(docker inspect --format '{{.Config.User}}' "$image")
[ "$user" = 65532:65532 ] || fail "the image runs as $user"
echo "ok: the image runs as 65532:65532"

# Docker's daemon requires a PID column in ps output. Keep its failure status
# separate from parsing so a transport/daemon error cannot pass via a pipeline.
processes=$(docker top "$name" -eo pid,uid,user) || fail "cannot inspect running processes"
printf '%s\n' "$processes" | awk -f "$(dirname "$0")/image-processes.awk" >/dev/null ||
    fail "running process UID listing is invalid: $processes"
echo "ok: the running collector is non-root (UID 65532)"

# Check what the running collector actually serves, including a real JS chunk.
port=$(docker port "$name" 8080/tcp)
case "$port" in 127.0.0.1:*) ;; *) fail "port is not loopback: $port" ;; esac
curl --fail --silent --show-error "http://$port/" > "$scratch/index.html"
grep -q 'id="root"' "$scratch/index.html" || fail "UI root missing"
if grep -q hennery-web-ui-not-embedded "$scratch/index.html"; then
    fail "placeholder UI is embedded"
fi
asset=$(sed -n 's/.*src="\(\/assets\/[^" ]*\.js\)".*/\1/p' "$scratch/index.html" | head -n 1)
[ -n "$asset" ] || fail "no embedded module asset"
curl --fail --silent --show-error "http://$port$asset" > "$scratch/asset.js"
[ -s "$scratch/asset.js" ] || fail "empty UI module"
echo "ok: embedded UI and module asset served"
