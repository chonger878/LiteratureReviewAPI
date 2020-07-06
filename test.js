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
 * @param  {number} [citationMinimum = 10] minimum citations
 * @param  {number} [maximumArticles = 20] maximum number of articles to return
 * @return {[Article Array Promise]} resolves with a list of found articles
 */
async function getArticles(url, citationMinimum = 10, maximumArticles = 20) {
  let lowest = Infinity;
  let children = [];
  let page = 0;
  while(lowest > citationMinimum && children.length < maximumArticles) {
    //offset Bell curve of delay to maybe look more human
    let ms = Math.random() * 10000 + Math.random() * 4000 + Math.random() * 4000 + 10000;
    console.log('sleep for ' + (ms / 10 >> 0) / 100 + ' seconds');
    await sleep(ms);

    let currentURL = url + `&as_vis=1&as_sdt=1,5${page?`&start=${page}`:''}`;
    console.log('- query: ' + currentURL);

    //try multiple times in the event of an error, like ECONNREFUSED or ETIMEDOUT
    let done = false,
      newChildren;
    while(!done) {
      try {
        newChildren = await scholarly.search(currentURL);
        done = true;
      } catch (e) {
        console.log(`error: ${e.code}\ntrying again . . .`);
      }
    }

    page += 10;
    children = children.concat(newChildren); //concat children to output array

    lowest = newChildren[newChildren.length - 1].numCitations;
    if(newChildren.length <= 0) {
      lowest = 0;
    }
    console.log(children.length + '/' + maximumArticles); //progress over maximum articles
  }
  console.log(children.length + ' hits'); //total articles returned
  return children;
}

/**
 * getChildrenArticles - Retrieves the most relevent articles that cite a given article
 *
 * @param  {Article} article original article
 * @param  {number} [citationMinimum = 10] minimum citations
 * @param  {number} [maximumArticles = 20] maximum number of articles to return
 * @return {[Article Array Promise]} resolves with a list of children articles
 */
function getChildrenArticles(article, citationMinimum = 10, maximumArticles = 20) {
  let url = article.citationUrl.replace('http://scholar.google.com/scholar?', '&');
  return getArticles(url, citationMinimum, maximumArticles);
}

/**
 * Takes in search terms and returns an Article array promise
 * @param {string} searchTerm main search term within blurb/title
 * @param {[string]} [authors] author(s) name(s)
 * @param {number} [year] publication year
 * @param  {number} [citationMinimum = 10] minimum citations
 * @param  {number} [maximumArticles = 20] maximum number of articles to return
 * @return {[Article Array Promise]} Array of articles found with the given search terms
 */
function searchArticles(searchTerm, names, year, citationMinimum = 10, maximumArticles = 20) {
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
  return `\x1b[33m${(''+article.numCitations).padStart(7,' ')}\x1b[36m - ${article.year}\x1b[32m ${article.title}\x1b[0m`;
}

async function main() {
  const art = await searchArticles('biology');
  console.log(art.map(prettyMap).join('\n'));
  //console.log(art[0]);

  //const chil = await getChildrenArticles(art[0]);
  //console.log(chil.map(titlesMap));
}

main();
