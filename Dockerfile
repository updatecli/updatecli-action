ARG UPDATECLI_VERSION=v0.6.1

FROM ghcr.io/updatecli/updatecli:$UPDATECLI_VERSION

COPY github-actions-entrypoint.bash /usr/local/bin/github-actions-entrypoint.bash 

ENTRYPOINT ["/usr/local/bin/github-actions-entrypoint.bash"]
