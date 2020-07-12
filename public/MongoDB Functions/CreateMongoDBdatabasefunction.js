
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/Scholarly-trees-webscraper-data";

MongoClient.connect(url, function(error,database) {
    if(error) throw error;
    console.log("Webscraper Data created");
    database.close();
});