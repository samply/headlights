#!/bin/sh
# Loads the FHIR bundles in a directory (*.json, *.xml) into a Blaze, unless it
# already holds exactly this data. A marker resource records a hash of the files;
# when it differs, the Blaze is emptied first. A Blaze without the marker but with
# patients is someone else's and left alone.
#
#   load.sh <fhir base url> <directory>    needs curl and jq
set -eu

base=$1
dir=$2
marker=Basic/headlights-testdata

until curl -sf -o /dev/null "$base/metadata?_summary=true"; do sleep 2; done

files=$(find "$dir" -type f \( -name '*.json' -o -name '*.xml' \) | sort)
if [ -z "$files" ]; then
  echo "No test data in $dir" >&2
  exit 1
fi
# shellcheck disable=SC2086
hash=$(cat $files | sha256sum | cut -d' ' -f1)

loaded=$(curl -sf "$base/$marker" | jq -r '.code.text // empty' || true)
if [ "$loaded" = "$hash" ]; then
  echo "Test data already loaded"
  exit 0
fi

# Patients but no marker: someone else's data, which must not be overwritten
if [ -z "$loaded" ] && [ "$(curl -sfS "$base/Patient?_summary=count" | jq .total)" -gt 0 ]; then
  echo "$base holds patients headlights didn't load, so it is left alone"
  exit 0
fi

# Every type except the conformance resources Blaze ships with
types=$(curl -sfS "$base/metadata" | jq -r '.rest[0].resource[].type' |
  grep -vxE 'StructureDefinition|SearchParameter|CodeSystem|ValueSet|CompartmentDefinition|OperationDefinition|CapabilityStatement|ConceptMap|NamingSystem|ImplementationGuide')

# Empties the Blaze type by type in batches of single deletes
for type in $types; do
  while :; do
    page=$(curl -sfS "$base/$type?_count=1000&_elements=id")
    [ "$(printf '%s' "$page" | jq '.entry // [] | length')" -gt 0 ] || break
    printf '%s' "$page" |
      jq '{resourceType: "Bundle", type: "batch", entry: [.entry[].resource |
        {request: {method: "DELETE", url: "\(.resourceType)/\(.id)"}}]}' |
      curl -sfS -o /dev/null -H 'Content-Type: application/fhir+json' --data-binary @- "$base"
    echo "Deleted old $type resources"
  done
done

for file in $files; do
  case $file in
    *.xml) type=application/fhir+xml ;;
    *) type=application/fhir+json ;;
  esac
  curl -sfS -o /dev/null -H "Content-Type: $type" --data-binary "@$file" "$base"
  echo "Loaded $file"
done

jq -n --arg hash "$hash" \
  '{resourceType: "Basic", id: "headlights-testdata", code: {text: $hash}}' |
  curl -sfS -o /dev/null -X PUT -H 'Content-Type: application/fhir+json' \
    --data-binary @- "$base/$marker"
echo "Test data loaded"
