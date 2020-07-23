let mongoose = require('mongoose');

var Schema = mongoose.Schema;
 
const ScholarlyArticlesSchema =  new Schema({

    //Null string?
    _id: String,

    //Saves information about child paper into an array
    childPaper: [{articleName:String, articleAuthor:String, articleUrl:String}]   
})

const articlesModel = mongoose.model('Scholarly Articles', ScholarlyArticlesSchema);

const articleListing = new articlesModel();

await articleListing.save();

//Article id becomes a concatenated string of the article name and author
articleListing._id = articleName + "_" + articleAuthor;


await articleListing.save();