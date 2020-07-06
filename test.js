var scholarly = require("scholarly");

/*
// To search for a specific topic
scholarly.search("machine learning").then((data) => {
  console.log(data);
});

// To list articles a user co-authored
scholarly.user("H18-9fkAAAAJ").then((data) => {
  console.log(data);
});
*/

function getArticles(searchTerm,authorFirst = '', authorLast = '', yearLow = false, yearHigh = false, callback){
  console.log('Searching '+(authorFirst?`${authorFirst}`+
  (authorLast?` ${authorLast}`:''):'')+
  (yearLow?` from ${yearLow}-${yearHigh?yearHigh:yearLow}`:''));
  return new Promise((resolve, reject)=>{
    scholarly.search(
      (authorFirst?`author:${authorFirst}`+
      (authorLast?` author:${authorLast}`:''):'')+
      yearLow?` &as_ylo=${yearLow}&as_yhi=${yearHigh?yearHigh:yearLow}`:'').then((data) => {
      resolve(data);
    });
  });
}

function titlesMap(a){
  return a.title;
}

async function main(){
  const art=await getArticles('','Claude','Shannon',1948);
  console.log(art.map(titlesMap));
}

main();
