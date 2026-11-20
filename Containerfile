# A container that runs one headlights project on its own podman, so stacks
# can run side by side without sharing host ports. See README.md.
FROM quay.io/podman/stable

ARG COMPOSE_VERSION=5.7.0
ARG MINIJINJA_VERSION=3.1.0
ARG YQ_VERSION=4.54.1

# Only the compose client: it drives the container's podman through its Docker API
RUN set -eu; \
    name="docker-compose-linux-$(uname -m)"; \
    url="https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/$name"; \
    cd /tmp; \
    curl -fsSLO "$url"; \
    curl -fsSL "$url.sha256" | sha256sum -c; \
    install "$name" /usr/local/bin/docker-compose; \
    rm "$name"

RUN set -eu; \
    name="minijinja-cli-$(uname -m)-unknown-linux-musl"; \
    url="https://github.com/mitsuhiko/minijinja/releases/download/${MINIJINJA_VERSION}/$name.tar.xz"; \
    cd /tmp; \
    curl -fsSLO "$url"; \
    curl -fsSL "$url.sha256" | sha256sum -c; \
    tar -xJf "$name.tar.xz"; \
    install "$name/minijinja-cli" /usr/local/bin/; \
    rm -r "$name" "$name.tar.xz"

# Merges the config files for the headlights script
RUN set -eu; \
    arch=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/'); \
    name="yq_linux_$arch"; \
    url="https://github.com/mikefarah/yq/releases/download/v${YQ_VERSION}"; \
    cd /tmp; \
    curl -fsSLO "$url/$name"; \
    curl -fsSL "$url/checksums-bsd" | grep -F "SHA256 ($name) =" | sed -E 's/^SHA256 \(([^)]+)\) = (.+)$/\2  \1/' | sha256sum -c; \
    install "$name" /usr/local/bin/yq; \
    rm "$name"

COPY . /headlights
RUN ln -s /headlights/headlights /usr/local/bin/headlights
# Rootless podman reads additionalimagestores only from the user's storage.conf
COPY --chown=podman:podman container/storage.conf /home/podman/.config/containers/storage.conf

ENV HEADLIGHTS_COMPOSE=docker-compose \
    HEADLIGHTS_CONFIG=/config.yaml \
    DOCKER_HOST=unix:///tmp/podman.sock

USER podman
ENTRYPOINT ["/headlights/container/entrypoint.sh"]
