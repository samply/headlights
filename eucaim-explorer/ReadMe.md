To use Headlights with Lens, Spot and Focus (With 2 Providers):
    `docker compose -f eucaim-explorer/compose.local.yaml up --pull always`

To Use Headlighs (as above) with local lens-image
    build the lens-image (including the dev-environment)
    `docker build --build-arg TARGET\_ENVIRONMENT=staging -t samply/eucaim-frontend:latest .`
    then start headlights with:
    `docker compose -f eucaim-explorer/compose.local.yaml up`

To use Headlights as above but with Lens running separately:
    `docker-compose -f eucaim-explorer/compose.dev.yaml up --pull always`
    then start eucaim-frontend with
    `npm run dev:headlighs`

