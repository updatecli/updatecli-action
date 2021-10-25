ARG UPDATECLI_VERSION=v0.11.0

FROM ghcr.io/updatecli/updatecli:$UPDATECLI_VERSION

## As per https://docs.github.com/en/actions/creating-actions/dockerfile-support-for-github-actions#user
# hadolint ignore=DL3002
USER root
WORKDIR /root

## The latest version of these "generic" package is always required
# hadolint ignore=DL3008
RUN apt-get update && \
  apt-get install --yes --no-install-recommends \
    curl \
    tar \
    unzip \
    wget \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

COPY github-actions-entrypoint.bash /usr/local/bin/github-actions-entrypoint.bash

ENTRYPOINT ["/usr/local/bin/github-actions-entrypoint.bash"]
