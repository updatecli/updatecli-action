ARG UPDATECLI_VERSION=
FROM ghcr.io/updatecli/updatecli:$UPDATECLI_VERSION

COPY github-actions-entrypoint.bash /usr/local/bin/github-actions-entrypoint.bash 

ENTRYPOINT ["/usr/local/bin/github-actions-entrypoint.bash"]
