#!/bin/bash -l
set -eo pipefail

ARGS=""

if test -n "${UPDATECLI_COMMAND}"; then
  ARGS="$UPDATECLI_COMMAND"
else
  ARGS="help"
fi

if test -n "${UPDATECLI_FLAGS}"; then
  ARGS="$ARGS $UPDATECLI_FLAGS"
fi

# Convert ARGS to an array so we can quote the variable
# passed to updatecli as command parameter

IFS=" " read -r -a ARGS <<< "$ARGS"

updatecli "${ARGS[@]}"
