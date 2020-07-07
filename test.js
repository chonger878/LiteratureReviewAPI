const CitationMinimum = 2000;
const MaximumArticles = 5;

const scholarly = require("scholarly");
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

&as_ylo=<year>
&as_yhi=<year>
  specifies a lower/upper bound for year of publication

  example: &as_ylo=1948&as_yhi=1948
    searches for articles published in 1948

&as_vis=1
  exclude citations

&as_sdt=1,5
  exclude pattents

&scisbd=1
  sort by date
*/

/**
 * sleep - wait a sepcified time before continuing execution
 *
 * @param  {number} ms milliseconds
 * @return {Promise} promise that resolves in ms milliseconds
 */
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * getChildrenArticles - Retrieves the most relevent articles that cite a given article
 *
 * @param  {string} url search url
 * @param  {number} [citationMinimum] minimum citations
 * @param  {number} [maximumArticles] maximum number of articles to return
 * @return {[Article Array Promise]} resolves with a list of found articles
 */
async function getArticles(url, citationMinimum = CitationMinimum, maximumArticles = MaximumArticles) {
  let lowest = Infinity;
  let children = [];
  let page = 0;
  while(lowest > citationMinimum && children.length < maximumArticles) {
    //offset Bell curve of delay to maybe look more human
    let ms = Math.random() * 10000 + Math.random() * 4000 + Math.random() * 4000 + 10000;
    console.log('sleep for ' + (ms / 10 >> 0) / 100 + ' seconds');
    await sleep(ms);
    console.clear();
    console.log(treeVis);
    console.log(treeVisB);

    let currentURL = url + `&as_vis=1&as_sdt=1,5${page?`&start=${page}`:''}`;
    console.log('- query: ' + currentURL);

    //try multiple times in the event of an error, like ECONNREFUSED or ETIMEDOUT
    let done = 0,
      newChildren;
    while(done < 5) {
      try {
        newChildren = await scholarly.search(currentURL);
        done = Infinity;
      } catch (e) {
        done++;
        if(done < 5) {
          console.log(`error: ${e}\ntrying again . . . ` + done);
        }
      }
    }
    if(done !== Infinity) {
      throw 'Too many errors';
    }

    page += 10;
    children = children.concat(newChildren); //concat children to output array

    for(let i = 0; i < newChildren.length; i++) {
      lowest = Math.min(lowest, newChildren[i].numCitations);
    }
    if(newChildren.length <= 0) {
      lowest = 0;
    }
    console.log(children.length + '/' + maximumArticles); //progress over maximum articles
  }
  console.log(children.length + ' hits'); //total articles returned

  console.log(children.map(prettyMap).join('\n'));
  return children;
}

/**
 * getChildrenArticles - Retrieves the most relevent articles that cite a given article
 *
 * @param  {Article} article original article
 * @param  {number} [citationMinimum] minimum citations
 * @param  {number} [maximumArticles] maximum number of articles to return
 * @return {[Article Array Promise]} resolves with a list of children articles
 */
function getChildrenArticles(article, citationMinimum = CitationMinimum, maximumArticles = MaximumArticles) {
  let url = article.citationUrl.replace('http://scholar.google.com/scholar?', '&');
  return getArticles(url, citationMinimum, maximumArticles);
}

/**
 * getNeighborArticles - Retrieves the most relevent articles to a given article
 *
 * @param  {Article} article original article
 * @param  {number} [citationMinimum] minimum citations
 * @param  {number} [maximumArticles] maximum number of articles to return
 * @return {[Article Array Promise]} resolves with a list of children articles
 */
function getNeighborArticles(article, citationMinimum = CitationMinimum, maximumArticles = MaximumArticles) {
  let url = article.relatedUrl.replace('http://scholar.google.com/scholar?q=', '');
  return getArticles(url, citationMinimum, maximumArticles);
}

/**
 * Takes in search terms and returns an Article array promise
 * @param {string} searchTerm main search term within blurb/title
 * @param {[string]} [authors] author(s) name(s)
 * @param {number} [year] publication year
 * @param  {number} [citationMinimum] minimum citations
 * @param  {number} [maximumArticles] maximum number of articles to return
 * @return {[Article Array Promise]} Array of articles found with the given search terms
 */
function searchArticles(searchTerm, names, year, citationMinimum = CitationMinimum, maximumArticles = MaximumArticles) {
  console.log('Searching ' + searchTerm +
    (names && names.length > 0 ? `${names.join(' ').replace('','')}` : '') +
    (year ? ` from ${year}` : ''));
  let url = searchTerm +
    (names && names.length > 0 ? `author:${names.join(' ').replace('','').split(' ').join(' author:')}` : '') +
    (year ? ` &as_ylo=${year}&as_yhi=${year}` : '') +
    '&as_vis=1&as_sdt=1,5';
  return getArticles(url);
}


/**
 * articleID - Get an article's unique ID
 *
 * @param  {Article} article article object
 * @return {string} article ID
 */
function getArticleID(article) {
  return article && article.hasOwnProperty('citationUrl') ? article.citationUrl.match(/[0-9]+/)[0] : 'null';
}

let treeVis=[];
let treeVisB=[];

async function branch(steps, article, parent, searched, searchedBranch) {
  let parentID = parent ? getArticleID(parent) : false;
  let articleID = getArticleID(article);
  if(parentID && searched.hasOwnProperty(parentID + '->' + articleID)) {
    return;
  }
  if(parent) {
    searched[parentID + '->' + articleID] = true;
  }
  if(searchedBranch.hasOwnProperty(articleID)) {
    return;
  }
  searchedBranch[articleID] = article;

  treeVis[steps]++;
  if(article.numCitations < CitationMinimum) { return; }
  if(steps <= 0) { return; }
  treeVisB[steps]++;

  let children = await getChildrenArticles(article);
  for(let i = 0; i < children.length; i++) {
    await branch(steps - 1, children[i], article, searched, searchedBranch);
  }

  if(steps === 1){return;}

  let neighbors = await getNeighborArticles(article);
  for(let i = 0; i < neighbors.length; i++) {
    await branch(steps - 1, neighbors[i], false, searched, searchedBranch);
  }
  //printTree(searched,searchedBranch);
}


/**
 * addSlashes - Escapes a string
 *
 * @param  {string} str original string
 * @return {string} escaped string
 */
function addSlashes( str ) {
  //https://locutus.io/php/strings/addslashes/
  return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

/**
 * printTree - Prints Graphviz code from a tree
 *
 * @param  {type} searched list of searched article pairs
 * @param  {type} searchedBranch list of searched articles
 */
function printTree(searched, searchedBranch) {
  let treeText = '';
  for(let node in searchedBranch) {
    let cites = searchedBranch[node].numCitations / 10 >> 0;
    cites = -1 / Math.pow(2, Math.log(searchedBranch[node].numCitations / 1000) / Math.log(10)) + 1;
    treeText += 'node [color="#' +
      ((255 - (cites * 255 >> 0)).toString(16).padStart(2, '0')) +
      '00' +
      ((cites * 255 >> 0).toString(16).padStart(2, '0')) + '" label ="' + addSlashes(searchedBranch[node].title) + '" weight=' + (50 * cites >> 0) + ' tooltip="' + searchedBranch[node].numCitations + '"];\n' + node + ';\n';
  }
  for(var node in searched) {
    treeText += node + ';\n';
  }

  console.log('\n\ndigraph G {\nnode [style=filled fontcolor=white];\n');
  console.log(treeText);
  console.log('}\n\n');
}

//takes the same arguments as searchArticles
async function buildArticleTree(steps, args) {
  treeVis=[];
  treeVisB=[];
  for(let i=0;i<steps;i++){
    treeVis.push(0);
    treeVisB.push(0);
  }

  let root = await searchArticles(...args);
  let searched = {};
  let searchedBranch = {};
  try {
    for(let i = 0; i < root.length; i++) {
      await branch(steps - 1, root[i], false, searched, searchedBranch);
    }
  } catch (e) {
    console.log(e);
  }
  printTree(searched, searchedBranch);
}

/**
 * titlesMap - function used to map articles to article titles
 *
 * @param  {Article} article source article
 * @return {string} title
 */
function titlesMap(article) {
  return article.title;
}

/*
Reset = "\x1b[0m"
Bright = "\x1b[1m"
Dim = "\x1b[2m"
Underscore = "\x1b[4m"
Blink = "\x1b[5m"
Reverse = "\x1b[7m"
Hidden = "\x1b[8m"

FgBlack = "\x1b[30m"
FgRed = "\x1b[31m"
FgGreen = "\x1b[32m"
FgYellow = "\x1b[33m"
FgBlue = "\x1b[34m"
FgMagenta = "\x1b[35m"
FgCyan = "\x1b[36m"
FgWhite = "\x1b[37m"

BgBlack = "\x1b[40m"
BgRed = "\x1b[41m"
BgGreen = "\x1b[42m"
BgYellow = "\x1b[43m"
BgBlue = "\x1b[44m"
BgMagenta = "\x1b[45m"
BgCyan = "\x1b[46m"
BgWhite = "\x1b[47m"
*/
function prettyMap(article) {
  return `\x1b[33m${(''+article.numCitations).padStart(7,' ')}\x1b[36m - ${article.year}\x1b[32m ${article.title}\x1b[0m ${getArticleID(article)}`;
}

async function main() {
  await buildArticleTree(3, ['information theory']);
  //const art = await searchArticles('astrology', undefined, undefined, 10, 10);
  //console.log(art.map(prettyMap).join('\n'));
  //console.log(art[0]);

  //const chil = await getChildrenArticles(art[0]);
  //console.log(chil.map(titlesMap));
}

main();
