# Relayer Invalid Transactions Cleanup

## Why?

The Relayer does not check for Ethereum Reorgs and might hold invalid data about transactions in its database, see: https://github.com/CirclesUBI/safe-relay-service/issues/32. A manual script is required to clean up that invalid state from the PostgreSQL database by checking which transactions are actually invalid and which are valid but have missing information.

## Usage

1. Install Python dependencies

```bash
pip install SqlAlchemy web3
```

2. Make sure you have access to the DigitalOcean PostgreSQL database and a valid SSL certificate on your drive.

3. Update the according configuration values in `db.py` and `analyze.py`.

4. Get `.csv` data with all transactions without an ethereum block from PostgreSQL database. Example:

```sql
\copy (SELECT * FROM relay_ethereumtx WHERE block_id IS NULL AND created > '2020-12-31') to 'relay_ethereumtx.csv' with csv header
```

5. Change values in `analyze.py` script to read `relay_ethereumtx.csv` file.

6. Execute script to analyze data / check if transactions actually exist on the blockchain. The results are exported in another new `.csv` file:

```
python analyze.py
```

7. Change values in `db.py` to read result of created analysis `.csv` file.

8. Execute insert db script to create data.

```
python db.py
```

9. You might want to run `redis-cli flushall` afterwards in the servers Redis database, to avoid invalid state after your changes to the PostgreSQL database.

## Ideas

* Introduce command line arguments instead of config variables
* Batch ethereum transactions to improve speed
* Bundle SQL transactions to improve speed
