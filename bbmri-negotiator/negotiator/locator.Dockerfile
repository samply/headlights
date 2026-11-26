# The Locator reads PUBLIC_LENS_OPTIONS and DIRECTORY_GRAPHQL_ENDPOINT at runtime.
# Only the entrypoint is added here, to load the fixture-generated options before startup.
FROM samply/bbmri-sample-locator:main
COPY locator-entrypoint.mjs .
CMD ["node", "locator-entrypoint.mjs"]
