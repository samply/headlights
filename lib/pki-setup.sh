#!/bin/sh
# Sets up the local Beam PKI in Vault and issues a key for each proxy in $PROXIES.
set -e

echo "$VAULT_TOKEN" > /pki/pki.secret

# Waits here rather than on a healthcheck, which podman can't run without systemd
until vault status > /dev/null 2>&1; do sleep 1; done

# Already set up by an earlier `up` against this Vault
if vault secrets list | grep -q '^samply_pki/'; then
  exit 0
fi

vault secrets enable -path=samply_pki pki
vault write -field=certificate samply_pki/root/generate/internal common_name=broker > /pki/root.crt.pem
vault write samply_pki/roles/myrole allowed_domains=broker allow_subdomains=true

for proxy in $PROXIES; do
  vault write -field=private_key samply_pki/issue/myrole common_name="$proxy.broker" ttl=30d > "/pki/$proxy.priv.pem"
done
