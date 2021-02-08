# 90days

Gets a list of all known Circles Tokens from *The Graph* and calls the `update` method on each Token contract to issue UBI for them.

## Why?

The *Dead Man Switch* feature in the Circles contracts disables Tokens after 90 days of inactivity. To buy us more time to actually announce that feature we've decided to manually trigger payout for all users so their accounts did not get turned off yet.

## Usage

```bash
# Install NodeJS dependencies
npm install

# Edit `index.js` and enter your private key with which you want to issue the
# transactions with
vim index.js

# Start the script
npm start
```

## Ideas

* Improve script runtime by batching ethereum requests
