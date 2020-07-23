let mongoose = require('mongoose');

var Schema = mongoose.Schema;
 
const ScholarlyArticlesSchema =  new Schema({
    _id: String,
    articleName: String,
    articleAuthor: String
    
    
})

const articlesModel = mongoose.model('Scholarly Articles', ScholarlyArticlesSchema);

const articleListing = new articlesModel();

await articleListing.save();

articleListing._id = articleName + "_" + articleAuthor;
await articleListing.save();