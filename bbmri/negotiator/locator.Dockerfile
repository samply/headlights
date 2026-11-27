# The Locator reads PUBLIC_LENS_OPTIONS and DIRECTORY_GRAPHQL_ENDPOINT at runtime.
# Only the entrypoint is added here, to load the fixture-generated options before startup.
# BASE is the Locator image from `images.lens2`; compose.yaml.j2 passes it.
ARG BASE=samply/bbmri-sample-locator:main
FROM ${BASE}
COPY locator-entrypoint.mjs .
CMD ["node", "locator-entrypoint.mjs"]
