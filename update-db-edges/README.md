# Update Edges in the db

## Usage

Tested with [`Node.js v14`](https://nodejs.org/en/). You can run `nvm use` to set up the version.

Install dependencies:

```bash
npm install
```

Copy config file and edit variables according to your needs:

```bash
cp config.json.example config.json
```

Run the script to update all the edges in the db:

```bash
npm start
```

Run the script to update The edges of a specific account:

```bash
npm start <safe-address>
```

Or if you want to update the edges for several accounts, use the `run_update.sh` script.