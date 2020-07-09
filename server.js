console.log('Server is starting. . .')

var express = require('express');
var app=express();
const path=require("path");
const bodyParser= require('body-parser');
const objectGraph= require('./test.js');


let port=process.env.PORT || 1337;
const router= express.Router();




app.use(express.static('public'));
app.use(bodyParser());




router.get('/',(req,res)=>{

    res.sendFile(path.join(__dirname,"/public/index.html"));
})


router.post('/user', async (req,res) => {

    const url= req.body.url;

    const string = await objectGraph.main(url);

    const user={
        url:string
    }
    //validation if the URL is valid
    res.json({data : string});
})




app.use('/',router);

var server=app.listen(port, listening);

function listening(){
    console.log("Listening. . .")
}
