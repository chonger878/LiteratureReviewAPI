
const {MongoClient} = require('mongodb');

async function main(){
    /**
    * Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
    * See https://docs.mongodb.com/ecosystem/drivers/node/ for more details
    */
    const uri = "mongodb+srv://m001-student:<password>@sandbox-4tq1m.mongodb.net/<dbname>?retryWrites=true&w=majority";
    const client = new MongoClient(uri);

    try{
        await client.connect();
        const scholarlyArticlesDB = client.db("Scholarly Articles");
        expect(client).not.toBeNull();
        await queryDatabase(client);
        await client.close();
    }catch(e){
       expect(e).toBeNull();
    }finally{
       await client.close();
    }
    
    }
    main().catch(console.error);