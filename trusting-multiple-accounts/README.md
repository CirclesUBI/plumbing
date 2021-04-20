# Automatically trusting multiple accounts

We need a script which automatically create ~500-1000 trust connections from a Safe account to a list of Circles accounts.

Inputs:

    .txt file with a list of Circles account addresses (ca. ~500-1000)
    Private key of a Safe owner

## Usage

Install dependencies

```bash
npm install
```

Copy config file and edit variables according to your needs.
When running against the default docker setup no changes are required here

```bash
cp config.py.example config.py
```

Copy the private key of the Safe owner in a file and indicate its path in the config file, in the variable `ORG_SAFE_OWNER_PRIVATE_KEY_PATH`. **Keep this private key secret.**

Copy the Safe accounts to be trusted in a file and indicare its path in the config file, in the variable `USR_SAFE_ADDRS_PATH`.

Run the script to trust the multiple accounts:

```bash
node test-local.js
```

## Test

If you want to create a **testing environment**

Start the ganache instance

```
ganache-cli start --mnemonic 'enable depend figure right kit daughter job giraffe news window tonight more' --defaultBalanceEther='100000000000000000000'   --gasLimit '0xfffffffffff' --account_keys_path keys.json
```

And run:

```
node create-test-env.js
```

The constracts will be deployed and the variables will be wrtten in the config file and the necessary files.
