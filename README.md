# Updatecli Action

> GitHub Action that runs [Updatecli](https://www.updatecli.io).


Updatecli is an automation engine that allows you to define custom update pipelines.

Documentation is available on [updatecli/docs/automate/github_action](https://www.updatecli.io/docs/automate/github_action/)

## Usage

Add the following steps to your worfkow 


```yaml
- name: Run Updatecli pipeline
  uses: updatecli/updatecli-action@v1
  with:
      command: "diff --config updatecli.d --values values.yaml"
  env:
      UPDATECLI_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Name              | Description                               | Default          |
|------------------ |------------------------------------------ |----------------- |
| command           | The updatecli command                     | apply            |
| flags             | The flags provided to an updatecl command | nil              |


### Workflow

More detailed documentation is available on [updatecli/docs/automate/github_action](https://www.updatecli.io/docs/automate/github_action/)

WARNING: Do not enable --debug mode in Github Action as you may leak credentials.

```yaml
name: updatecli

on:
  workflow_dispatch:
  schedule:
    # * is a special character in YAML so you have to quote this string
    # Run once a day 
    - cron: '0 0 * * *'

# Different write permission may be needed
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

## Contributing

This is a community-oriented project, all contributions are greatly appreciated.

Here is a non-exhaustive list of contributions:

* ⭐️ our main GitHub repository [updatecli/updatecli](https://github.com/updatecli/updatecli/stargazers)
* Propose a new feature request on any of [updatecli](https://github.com/updatecli/) repositories.
* Highlight an existing feature request with ":thumbsup:" on any of the [updatecli](https://github.com/updatecli/) repositories.
* Contribute to any repository in the [updatecli](https://github.com/updatecli/) organization
* Share the love

## License

MIT. See `LICENSE` for more details.
