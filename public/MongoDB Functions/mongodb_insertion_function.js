
var MongoClient = 
    require('mongodb').MongoClient;
var url=
    "mongodb://localhost:27017/"

MongoClient.connect(url, function(err,db) {
    if(err) throw err;
    //var treesdb = db.("scholarlytrees");
    var dbObj = [];

    treesdb.collection("articles-listings").insertMany(dbObj, function(error,response) {
        if (error) throw error;
        console.log(response.insertedCount + "documents inserted for scholarly articles.");
        treesdb.close();
    });
});
