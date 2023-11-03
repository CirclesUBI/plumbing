const { User } = require('./models/users');
const Web3 = require('web3');
const config = require('./config.json');
const fs = require("fs");
const readXlsxFile = require('read-excel-file/node');

const web3 = new Web3(
    new Web3.providers.WebsocketProvider(config.ETHEREUM_NODE_WS),
);

async function getEmails() {


    // read the addresses
    await readXlsxFile('./Active_users_by_quarter.xlsx').then(async (rows) => {
        // create new file with the address plus email
        const filename = "address-user-email.csv";
        const writableStream = await fs.createWriteStream(filename);
        
        rows.shift()
        const data = await Promise.all(
            rows.map(async (element) => {
                let email = ''
                const user = await User.findOne({
                    limit: 1,
                    where: {
                        safeAddress: web3.utils.toChecksumAddress(element[1]),
                    }
                })
                if (user == null){
                    console.log('Not found!');
                } else {
                    console.log(user.email);
                    email = user.email || '';
                }
                writableStream.write(element[1] + "," + email + '\n')
                return [element[1], email];
            })
        ) 

        console.log(rows.length);
        console.log(data.length);
        writableStream.end();
    })
}

module.exports = {
    getEmails,
}
