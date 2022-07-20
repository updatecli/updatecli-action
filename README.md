# Updatecli Github Action

* [Usage](#usage)
  * [Workflow](#workflow)
* [License](#license)

## Usage

Install Updatecli for GitHub Action

**Options**

`version`: Specify the Updatecli version to install. Accepted values are any valid releases such as v0.25.0

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
        uses: actions/checkout@v2

      - name: Install Updatecli in the runner
        uses: updatecli/updatecli-action@v2

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

## License

MIT. See `LICENSE` for more details.

