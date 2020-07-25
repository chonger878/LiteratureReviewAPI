let mongoose = require('mongoose');
const { Db } = require('mongodb');

var Schema = mongoose.Schema;
 
const ScholarlyArticlesSchema =  new Schema({

    //Null string?
    _id: String,

    //Saves information about child paper into an array
    childPaper: [{articleName:String, articleAuthor:String, articleUrl:string}]   
})

const articlesModel = mongoose.model('Scholarly Articles', ScholarlyArticlesSchema);

const articleListing = new articlesModel();

await articleListing.save();

//Article id becomes a concatenated string of the article name and author
articleListing._id = articleName + "_" + articleAuthor;


await articleListing.save();
Db.createCollection("Child_Articles", {
    validator: {
        $and: [
                {
                    "articleName" : {$type:String, $exists:true}
                },
                {
                    "articleAuthor" : {$type:String, $exists:true}
                },
                {
                    "articleUrl" : {$type:String, $regex: "/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/"}
                }
            
            ]
    }
})

Db.Child_Articles.createIndex({"Article_id": articleName + "_" + articleAuthor}, {unique:true});
