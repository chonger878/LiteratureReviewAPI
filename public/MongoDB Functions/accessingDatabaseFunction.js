
const {MongoClient} = require('mongodb');

async function main(){
    /**
    * Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
    * See https://docs.mongodb.com/ecosystem/drivers/node/ for more details
    */
    const uri = "mongodb+srv://<username>:<password>@<your-cluster-url>/test?retryWrites=true&w=majority";
    const client = new MongoClient(uri);

    try{
        await client.connect();
        await queryDatabase(client);
    }catch(e){
        console.error(e);
    }finally{
        await client.close();
    }

    }
     main().catch(console.error);