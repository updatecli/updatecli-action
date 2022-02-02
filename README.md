# Updatecli Github Action

* [Usage](#usage)
  * [Workflow](#workflow)
* [License](#license)

## Usage

Run updatecli from GitHub Action

### Workflow

WARNING: Dont enable --debug mode in Github Action as it may leak information.

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

      - name: Diff
        uses: updatecli/updatecli-action@v1
        with:
          command: diff
        env:
          UPDATECLI_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Apply
        uses: updatecli/updatecli-action@v1
        env:
          UPDATECLI_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## License

MIT. See `LICENSE` for more details.
