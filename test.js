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

return format:
[
Article {
  title:
  url:
  authors:[]
  year:
  numCitations:
  description:
  pdf:
  citationUrl:
  relatedUrl:
  urlVersionsList:
  publication:
},
. . .
]
*/

/*

Google Scholar URL tricks:

author: <name>
  searches for articles co-authored by someone with this term in their name (multiple names supported)

  example: author: Claude author:Shannon
    searches for works by Claude Shannon (and maybe unexpected combinations??)

*/

/**
 * Takes in search terms and returns an Article array promise
 * @param {string} searchTerm - main search term within blurb/title
 * @param {[string]} [authors] - author(s) name(s)
 * @param {number} [year] - publication year
 * @return {[Article Array]} - Array of articles found with the given search terms
 */
function getArticles(searchTerm, names, year) {
  console.log('Searching ' + searchTerm +
    (names && names.length>0 ? `${names.join(' ').replace('','')}` : '') +
    (year ? ` from ${year}` : ''));
  return new Promise(async (resolve, reject) => {
    let currentURL=searchTerm +
      (names && names.length>0 ? `author:${names.join(' ').replace('','').split(' ').join(' author:')}` : '') +
      (year ? ` &as_ylo=${year}&as_yhi=${year}` : '') +
      '&as_vis=1&as_sdt=1,5';
    console.log('query: '+currentURL);

    let done=0;
    while(done<5){
      try{
        let data = await scholarly.search(currentURL);
        resolve(data);
        done = Infinity;
      }
      catch(e){
        done++;
        console.log(`error: ${e.code}\ntrying again . . . `+done);
      }
    }
    reject('Errored persistently');
  });
}

function sleep(ms){
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function getChildrenArticles(article,min){
  let url=article.citationUrl.replace('http://scholar.google.com/scholar?','&');
  let lowest=Infinity;
  let max=20;
  let children=[];
  let page=0;
  while(lowest>min&&children.length<max){
    let ms=Math.random()*10000+Math.random()*4000+Math.random()*4000+10000;
    console.log('sleep for '+(ms/10>>0)/100+' seconds');
    await sleep(ms);

    let currentURL=url+`&as_vis=1&as_sdt=1,5${page?`&start=${page}`:''}`;
    console.log('- query: '+currentURL);
    let done=false,newChildren;
    while(!done){
      try{
        newChildren = await scholarly.search(currentURL);
        done=true;
      }
      catch(e){
        console.log(`error: ${e.code}\ntrying again . . .`);
      }
    }
    page+=10;
    children=children.concat(newChildren);
    lowest=newChildren[newChildren.length-1].numCitations;
    if(newChildren.length<=0){
      lowest=0;
    }
    console.log(children.length+'/'+max);
  }
  console.log(children.length+' hits');
  return children;
}

function titlesMap(article) {
  return article.title;
}

async function main() {
  const art = await getArticles('astrobiology');
  console.log(art.length+' hits');
  console.log(art.map(titlesMap));

  const chil = await getChildrenArticles(art[0],10);
  console.log(chil.map(titlesMap));
}

main();
