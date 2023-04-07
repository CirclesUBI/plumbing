import csv
import datetime

from sqlalchemy import sql, create_engine

# ===========================================================
# Do not run the transactions yet, just print them
DRY_RUN = True

# The data which was generated running the `analyze.py` script
INPUT_FILE = 'ethereumtx_data.csv'

# Change these values to connect to DigitalOcean database
ssl_args = {
        'sslrootcert': 'ca-certificate.crt',
        'sslmode': 'require'
}
engine = create_engine('postgresql://username:password@db/relayer',
                       connect_args=ssl_args)
# ===========================================================


def read_csv(file, limit=0):
    print("Read csv file '{}'".format(file))
    data = []
    with open(file) as csvfile:
        reader = csv.DictReader(csvfile)
        for (index, row) in enumerate(reader):
            data.append(row)
            if limit != 0 and index > limit:
                break
    return data


def print_query(query):
    print(query.compile(engine, compile_kwargs={"literal_binds": True}))


def execute_query(query, dry_run=DRY_RUN):
    with engine.connect() as connection:
        print_query(query)
        if not dry_run:
            connection.execute(query)
            connection.commit()


data = read_csv(INPUT_FILE)


for item in data:
    tx_hash = item['tx_hash']
    tx_status = item['tx_status']
    tx_gas_used = item['tx_gas_used']
    tx_index = item['tx_index']
    block_number = item['block_number']
    block_gas_limit = item['block_gas_limit']
    block_gas_used = item['block_gas_used']
    block_hash = item['block_hash']
    block_timestamp = item['block_timestamp']
    error = item['error']

    print('')
    print('================================')
    print('')
    print(item)
    print('')

    if error != '':
        print("ERROR: {} {}".format(tx_hash, error))
        continue

    if block_number == '':
        # No block found, transaction is invalid
        # 1. Delete `relay_safemultisigtx` row
        query = sql.text(
            """
            DELETE FROM relay_safemultisigtx
            WHERE ethereum_tx_id = :tx_hash
            """
        )
        query = query.bindparams(tx_hash=tx_hash)
        execute_query(query)
        # 2. Delete related `relay_ethereumtx` row
        query = sql.text(
            """
            DELETE FROM relay_ethereumtx
            WHERE tx_hash = :tx_hash
            """
        )
        query = query.bindparams(tx_hash=tx_hash)
        execute_query(query)
    else:
        # Transaction exists on blockchain but state is not in db yet
        # 1. Insert the `relay_ethereumblock` when it does not exist yet
        query = sql.text(
            """
            INSERT INTO relay_ethereumblock
            (
                number,
                gas_limit,
                gas_used,
                timestamp,
                block_hash
            )
            VALUES
            (
                :number,
                :gas_limit,
                :gas_used,
                :timestamp,
                :block_hash
            )
            ON CONFLICT DO NOTHING
            """
        )
        psql_timestamp = datetime.datetime.fromtimestamp(
            int(block_timestamp)).strftime("%Y-%m-%d %H:%M:%S") + '+00'
        query = query.bindparams(number=int(block_number),
                                gas_limit=int(block_gas_limit),
                                gas_used=int(block_gas_used),
                                timestamp=psql_timestamp,
                                block_hash=block_hash[2:])
        execute_query(query)
        # 2. Update the `relay_ethereumtx` row to also contain mined data
        query = sql.text(
            """
                UPDATE relay_ethereumtx
                SET gas_used = :gas_used,
                    block_id = :block_id,
                    status = :status,
                    transaction_index = :transaction_index
                WHERE tx_hash = :tx_hash
            """
        )
        query = query.bindparams(tx_hash=tx_hash,
                                gas_used=int(tx_gas_used),
                                block_id=int(block_number),
                                transaction_index=int(tx_index),
                                status=int(tx_status))
        execute_query(query)
