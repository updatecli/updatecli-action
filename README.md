# Updatecli Github Action

* [Usage](#usage)
  * [Workflow](#workflow)
* [Deprecation](#deprecation) 
* [License](#license)

## Usage

Install Updatecli for GitHub Action

**Options**

- `version`: Specify the Updatecli version to install. Accepted values are any valid releases such as `v0.118.0`.

- `version-file`: The path to a file containing updatecli version. Supported file types are `.updatecli-version` and `.tool-versions`. See more details in [about version-file](#Updatecli-version-file).

### Updatecli version file

If the `version-file` input is specified, the action will extract the version from the file and install it.

Supported files are `.updatecli-version` and `.tool-versions`.
In `.updatecli-version` file, only the version should be specified (e.g., `v0.86.1`).
In `.tool-versions` file, updatecli version should be preceded by the updatecli keyword (e.g., `updatecli v0.86.1`).
The `.tool-versions` file supports version specifications in accordance with Semantic Versioning ([semver](https://semver.org/)).

If both version and version-file inputs are provided, the `version` input will be used.

If the file contains multiple versions, only the first one will be recognized.

### Workflow

```yaml
name: updatecli

on:
  workflow_dispatch:
  schedule:
    # * is a special character in YAML so you have to quote this string
    # Run once a day
    - cron: '0 0 * * *'

permissions:
  contents: write
  pull-requests: write

jobs:
  updatecli:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v7.0.1

      - name: Install Updatecli in the runner
        uses: updatecli/updatecli-action@v3.4.0

      - name: Run Updatecli in Dry Run mode
        run: updatecli diff
        env:
          UPDATECLI_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Run Updatecli in Apply mode
        run: updatecli apply --config updatecli/updatecli.d
        env:
          UPDATECLI_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

WARNING: Dont enable --debug mode in Github Action as it may leak information.

## Deprecation

> [!IMPORTANT]  
> The branch v1 and v2 are deprecated and will be remove soon.
> You should use GitHub action version instead (or track the main branch if you really want to).
> You can migrate to the latest GitHub action version using the following Updatecli policy:

.updatecli-compose.yaml
```
# export UPDATECLI_GITHUB_TOKEN=<insert PAT>
# export UPDATECLI_GITHUB_USERNAME=<insert username>
# updatecli compose diff --file updatecli-compose.yaml
# updatecli compose apply --file updatecli-compose.yaml

valuesinline:
  scm:
    enabled: true
    kind: githubsearch
    search: |
      org:<replace with your GitHub organization>
      archived:false
    branch: "^main$|^master$" # branch accept regular expression
    email: <email associatedi with the git commits>
    limit: 0 # zero means no repository limit

policies:
  - name: Update Updatecli GitHub action version
    policy: ghcr.io/updatecli/policies/updatecli/githubaction:0.8.1
```

## License

MIT. See `LICENSE` for more details.

