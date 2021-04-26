# Automatically trusting multiple accounts

We need a script which automatically create ~500-1000 trust connections from a Safe account to a list of Circles accounts.

Inputs:

- `.txt` file with a list of Circles account addresses (ca. ~500-1000), one address per line in the file
- Private key of a Safe owner

## Usage

Install dependencies

```bash
npm install
```

Copy config file and edit variables according to your needs.
When running against the local ganache instance no changes are required here.

```bash
cp config.json.example config.json
```

Copy the private key of the Safe owner in a file and indicate its path in the config file, in the variable `ORG_SAFE_OWNER_PRIVATE_KEY_PATH`. **Keep this private key secret.**

Copy the Safe account addresses to be trusted in a file (one address per line) and indicate its path in the config file, in the variable `USR_SAFE_ADDRS_PATH`.

Run the script to trust the multiple accounts:

```bash
npm run start
```

### Organization signup

**Work in process**

If you need to signup an organization that is a Safe contract, you can execute:

```bash
node org-signup.js
```

## Testing environment

If you want to create a **testing environment**

Start the ganache instance

```
ganache-cli start --mnemonic 'enable depend figure right kit daughter job giraffe news window tonight more' --defaultBalanceEther='100000000000000000000'   --gasLimit '0xfffffffffff' --account_keys_path keys.json
```

and run

```
node create-test-env.js
```

The constracts will be deployed and the variables will be wrtten in the config file and the necessary files.

Then you can trust the multiple accounts in a local environment:

```bash
npm test
```
