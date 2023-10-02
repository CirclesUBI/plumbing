# Clean up unused images in S3 storage

This scipt deletes the avatar images that are not referenced in the users profilewq data.

## Usage

Tested with [`Node.js v16`](https://nodejs.org/en/). You can run `nvm use` to set up the version.

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
