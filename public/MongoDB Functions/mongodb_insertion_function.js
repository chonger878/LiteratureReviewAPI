
var MongoClient = 
    require('mongodb').MongoClient;
var url=
    "mongodb://localhost:27017/"

MongoClient.connect(url, function(err,db) {
    if(err) throw err;
    //var treesdb = db.("scholarlytrees");
    var dbObj = [{articleName: "test title", articleAuthor: "test author", articleUrl: "http://www.testurl.com/"}];

    treesdb.collection("articles-listings").insertOne(dbObj, function(error,response) {
        if (error) throw error;
        console.log(response.insertedCount + "documents inserted for scholarly articles.");
        treesdb.close();
    });
});
