# Updatecli Github Action

* [Usage](#usage)
  * [Updatecli version file](#updatecli-version-file)
  * [Workflow](#workflow)
    * [Manual setup](#manual-setup)
    * [Scaffold the workflows with an Updatecli policy](#scaffold-the-workflows-with-an-updatecli-policy)
    * [Keep the workflows up to date](#keep-the-workflows-up-to-date)
* [Deprecation](#deprecation)
* [License](#license)

## Usage

Install Updatecli for GitHub Action

**Options**

- `version`: Specify the Updatecli version to install. Accepted values are any valid releases such as `v0.118.0`.

- `version-file`: The path to a file containing updatecli version. Supported file types are `.updatecli-version` and `.tool-versions`. See more details in [about version-file](#Updatecli-version-file).

Please check whether you need to allow Github Action tokens to create pull
requests in the repository settings in addition to granting write permissions in
the workflow. This is [required by GitHub in new repositories](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#preventing-github-actions-from-creating-or-approving-pull-requests).

Go to the Repository Settings → "Actions" → "General" → "Workflow permissions"
and enable "Allow GitHub Actions to create and approve pull requests"

### Updatecli version file

If the `version-file` input is specified, the action will extract the version from the file and install it.

Supported files are `.updatecli-version` and `.tool-versions`.
In `.updatecli-version` file, only the version should be specified (e.g., `v0.86.1`).
In `.tool-versions` file, updatecli version should be preceded by the updatecli keyword (e.g., `updatecli v0.86.1`).
The `.tool-versions` file supports version specifications in accordance with Semantic Versioning ([semver](https://semver.org/)).

If both version and version-file inputs are provided, the `version` input will be used.

If the file contains multiple versions, only the first one will be recognized.

### Workflow

#### Manual setup

The minimal workflow to install and run Updatecli on a schedule:

```yaml
name: updatecli

on:
  workflow_dispatch:
  schedule:
    # * is a special character in YAML so you have to quote this string
    # Run once a day
    - cron: '0 0 * * *'

# Please note that you need to allow Github Action tokens to
# create pull requests in the repository settings, too:
# Go to the Repository Settings → "Actions" → "General" → "Workflow permissions"
# and enable "Allow GitHub Actions to create and approve pull requests"
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
        uses: updatecli/updatecli-action@v3.6.0

      - name: Run Updatecli in Dry Run mode
        run: updatecli pipeline diff --config updatecli/updatecli.d
        env:
          UPDATECLI_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Run Updatecli in Apply mode
        run: updatecli pipeline apply --config updatecli/updatecli.d
        env:
          UPDATECLI_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

WARNING: Dont enable --debug mode in Github Action as it may leak information.
=======
> [!WARNING]
> Do not enable `--debug` mode in GitHub Actions as it may leak information.

#### Scaffold the workflows with an Updatecli policy

Instead of writing the workflows by hand, the `updatecli/githubaction/scaffold` policy generates
them, and re-renders them on every run so their pinned action digests never go stale.

| File | Trigger | What it does |
| --- | --- | --- |
| `.github/workflows/updatecli.yaml` | `release`, `workflow_dispatch`, `schedule` | `updatecli compose apply`, opens pull requests |
| `.github/workflows/updatecli_test.yaml` | `pull_request` | `updatecli compose diff`, read only dry run |
| `.github/workflows/updatecli_update.yaml` | `workflow_dispatch`, push to the default branch, `schedule` | `updatecli compose apply` over a job matrix, refreshes the pull requests already opened |

Worth knowing before you run it:

* the generated workflows all run `updatecli compose`, so your repository needs an
  `updatecli-compose.yaml`. This policy does not create one for you.
* the three workflow files become policy owned. They are rewritten in full on every run, so any
  hand edit is reverted. Use the `gha.steps` value to add your own steps.
* writing into `.github/workflows/` requires a token with the `workflow` scope on top of `repo`.
* do not run it alongside `ghcr.io/updatecli/policies/updatecli/githubaction`. Both rewrite the
  same files and would revert each other on every run.

From the root of your repository:

```bash
# The policy reads its token from GITHUB_TOKEN, configurable with the scm.env_token value
export GITHUB_TOKEN=<PAT with the repo and workflow scopes>

# To show what would be created
updatecli diff ghcr.io/updatecli/policies/updatecli/githubaction/scaffold:0.1.1
# To apply the changes if you are happy with the diff
updatecli apply ghcr.io/updatecli/policies/updatecli/githubaction/scaffold:0.1.1
```

Run that way the policy uses its default `scm.enabled: false`: the workflows are written to your
working copy, and committing them is up to you.

The policy documentation can be found [here](https://github.com/updatecli/policies/tree/main/updatecli/policies/updatecli/githubaction/scaffold).

#### Keep the workflows up to date

To keep the generated workflows in sync with the policy, declare it in an Updatecli compose file
instead of running it once. That compose file is also the one the generated workflows execute.

`updatecli-compose.yaml`

```yaml
# export GITHUB_TOKEN=<PAT with the repo and workflow scopes>
# export UPDATECLI_GITHUB_TOKEN=<PAT used by your own manifests>
# updatecli compose diff
# updatecli compose apply

name: Default Updatecli Policies

valuesinline:
  scm:
    enabled: true
    user: updatecli
    email: bot@updatecli.io
    owner: <replace with your GitHub organization>
    repository: <replace with your GitHub repository>
    username: "updatecli-bot"
    branch: main

policies:
  - name: Local Updatecli policies
    id: local
    config:
      - updatecli/updatecli.d

  - name: Configure Updatecli workflows
    id: updatecli
    policy: ghcr.io/updatecli/policies/updatecli/githubaction/scaffold:0.1.1
    valuesinline:
      gha:
        # Credentials referenced by the generated workflows
        #   token -> secrets.GITHUB_TOKEN, works with no further setup
        #   app   -> UPDATECLIBOT_APP_* secrets, the default, used by the Updatecli project itself
        auth: token
        udash:
          # Reports the pipeline results to Udash, requires the UPDATECLI_UDASH_* secrets
          enabled: false
        apply:
          # Opens new pull requests, default "0 12 */14 * *"
          cron: "0 12 */14 * *"
        update:
          # Refreshes the existing ones, default "0 1 * * *"
          cron: "0 3 * * *"
          matrix:
            - target_name: "existing pipelines"
              apply_args: "--existing-only=true"
            # Only useful if you label your manifests with "monitor: active"
            - target_name: "monitored pipelines"
              apply_args: "--labels=monitor:active"
```

With this configuration, the policy installs the three workflows described above:

* `updatecli.yaml` opens new pull requests every two weeks, as set by `gha.apply.cron`
* `updatecli_update.yaml` refreshes the pull requests already opened by Updatecli, on every push to
  the default branch and once a day at 3 AM UTC, as set by `gha.update.cron`
* `updatecli_test.yaml` runs Updatecli in dry run mode on every pull request

More Updatecli policies are available on [updatecli/policies](https://github.com/updatecli/policies).
>>>>>>> 8d9036c (doc: update documentation)

## Deprecation

> [!IMPORTANT]  
> The branch v1 and v2 are deprecated and will be removed at some point.
> You should use GitHub action version instead (or track the main branch if you really want to).
> You can migrate to the latest GitHub action version using the following Updatecli policy:

This policy patches the `uses:` and `with.version` of your existing workflows. It is an
alternative to the [scaffold policy](#scaffold-the-workflows-with-an-updatecli-policy), not a
companion: running both continuously makes them revert each other on every run.

`updatecli-compose.yaml`

```yaml
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
    policy: ghcr.io/updatecli/policies/updatecli/githubaction:0.9.1
```

## License

Apache-2.0. See `LICENSE` for more details.

