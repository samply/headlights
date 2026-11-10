# A container that runs one headlights project on its own podman, so stacks
# can run side by side without sharing host ports. See README.md.
FROM quay.io/podman/stable

ARG MINIJINJA_VERSION=3.1.0

RUN dnf -y install docker-compose && dnf clean all

RUN set -eu; \
    name="minijinja-cli-$(uname -m)-unknown-linux-musl"; \
    url="https://github.com/mitsuhiko/minijinja/releases/download/${MINIJINJA_VERSION}/$name.tar.xz"; \
    cd /tmp; \
    curl -fsSLO "$url"; \
    curl -fsSL "$url.sha256" | sha256sum -c; \
    tar -xJf "$name.tar.xz"; \
    install "$name/minijinja-cli" /usr/local/bin/; \
    rm -r "$name" "$name.tar.xz"

COPY . /headlights
RUN ln -s /headlights/headlights /usr/local/bin/headlights
# Rootless podman reads additionalimagestores only from the user's storage.conf
COPY --chown=podman:podman container/storage.conf /home/podman/.config/containers/storage.conf

ENV HEADLIGHTS_COMPOSE=docker-compose \
    HEADLIGHTS_CONFIG=/headlights/container/config.yaml:/config.yaml \
    DOCKER_HOST=unix:///tmp/podman.sock

USER podman
ENTRYPOINT ["/headlights/container/entrypoint.sh"]
