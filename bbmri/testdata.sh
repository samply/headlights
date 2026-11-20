#!/bin/sh
# Generates the generated site's test data with bbmri-fhir-gen. A fixed seed makes
# the data the same on every run, so the loader only uploads it once.
#
#   testdata.sh    writes to /testdata
set -eu

version=0.4.0
patients=256

# The release binary is built against glibc
apk add -q --no-cache curl gcompat jq
arch=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')
curl -sfL "https://github.com/samply/bbmri-fhir-gen/releases/download/v$version/bbmri-fhir-gen-$version-linux-$arch.tar.gz" |
  tar xz -C /usr/local/bin

mkdir /tmp/bundles
bbmri-fhir-gen /tmp/bundles -n "$patients" --seed 1

# The bundles' own ids are random despite the seed; Blaze doesn't store them
rm -rf /testdata/*
for file in /tmp/bundles/*.json; do
  jq -c 'del(.id)' "$file" > "/testdata/$(basename "$file")"
done
