import csv
from web3 import Web3
from web3.exceptions import TransactionNotFound

# Example from `psql`:
# \copy (SELECT * FROM relay_ethereumtx WHERE block_id IS NULL AND created >
# '2020-12-31') to 'relay_ethereumtx_no_block.csv' with csv header
CSV_TABLE_DATA = 'relay_ethereumtx_no_block.csv'
NAME_PREFIX = "no_block_2021"


w3 = Web3(Web3.HTTPProvider('https://rpc.gnosischain.com/'))


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


def write_csv(file, data):
    if len(data) == 0:
        # Nothing to write
        return
    with open(NAME_PREFIX + file, 'w') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=data[0].keys())
        writer.writeheader()
        for item in data:
            writer.writerow(item)


ethtx = read_csv(CSV_TABLE_DATA)

latest_block = w3.eth.get_block('latest')
latest_block_height = int(latest_block['number'])
print("Block height is {}".format(latest_block_height))

result = []
for (index, tx) in enumerate(ethtx):
    while True:
        print("-----------")
        print("check tx {} - {}/{}".format(tx['tx_hash'], index + 1, len(ethtx)))

        data = {
            'index': index,
            'tx_hash': tx['tx_hash'],
            'tx_status': None,
            'tx_gas_used': None,
            'tx_index': None,
            'block_number': None,
            'block_gas_limit': None,
            'block_gas_used': None,
            'block_hash': None,
            'block_timestamp': None,
            'error': None,
        }

        try:
            chain_tx = w3.eth.get_transaction_receipt(tx['tx_hash'])
            block = w3.eth.get_block(int(chain_tx['blockNumber']))
            data['tx_status'] = chain_tx['status']
            data['tx_gas_used'] = chain_tx['gasUsed']
            data['tx_index'] = chain_tx['transactionIndex']
            data['block_number'] = chain_tx['blockNumber']
            data['block_gas_limit'] = block['gasLimit']
            data['block_gas_used'] = block['gasUsed']
            data['block_hash'] = block['hash'].hex()
            data['block_timestamp'] = block['timestamp']
        except TransactionNotFound:
            print("tx not found {}".format(tx['tx_hash']))
        except Exception as err:
            print("Unknown error for tx {}: {}".format(tx['tx_hash'], err))

            if err.response != None and err.response.status_code == 502:
                print("Retrying!")
                continue

            data['error'] = err

        result.append(data)

        # Write on every iteration in case script fails
        write_csv("result.csv", result)
        break

print("Write csv file '{}'".format(NAME_PREFIX + 'result.csv'))
