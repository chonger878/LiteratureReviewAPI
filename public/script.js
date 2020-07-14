(new URL(window.location.href)).searchParams.forEach((x, y) =>
    document.getElementById(y).value = x)

/*
TODO:
- set up basic code to tree traverse search articles
- query database for articles
  - alert user of queue length on error
- render result into a graph
  - ideally using GraphViz for minimal effort
  - set background svg
*/

const CitationMinimum = 100; // How many citations needed to search
const MaximumArticles = 5; // Most articles searched (rounded up to the nearest page) (each page has ~10 articles)
const MinimumRelevance = 0.8; // How relevent an article has to be to be drawn
const Sleep = false; // how many minutes maximum to wait between calls (minimum is 1/3)

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

async function queryDatabase(search){
  if(Data.hasOwnProperty(search)){
    return Data[search];
  }
  else{
    throw 'data not available';
  }/*
  return [
    {
      title:"something",
      url:"idk.com",
      authors:["mr. something"],
      year:1999,
      numCitations:314,
      description:"An article",
      pdf:"n/a",
      citationUrl:"cite.com?cite=12345&stuff",
      relatedUrl:"related.com",
      urlVersionsList:"vers123",
      publication:"GitHub"
    },
  ];*/
  /*
  //put api call ajax here
  return new Promise((resolve, reject) => {
    $.ajax({
      url: 'api?url='+search,
      type: 'GET',
      data: {
        //key: 'value',
      },
      success: function (data) {
        resolve(data);
      },
      error: function (error) {
        reject(error);
      },
    })
  })
  */
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

    let currentURL = url + `&as_vis=1&as_sdt=1,5${page?`&start=${page}`:''}`;
    console.log('- query: ' + currentURL);

    //try multiple times in the event of an error, like ECONNREFUSED or ETIMEDOUT
    let done = 0,
      newChildren;
    while(done < 5) {
      try {
        newChildren = await queryDatabase(url);
        console.clear();
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
    //console.log(children.length + '/' + maximumArticles); //progress over maximum articles
  }
  //console.log(children.length + ' hits'); //total articles returned

  //console.log(children.map(prettyMap).join('\n'));
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
  /*console.log('Searching ' + searchTerm +
    (names && names.length > 0 ? `${names.join(' ').replace(/�/g,'')}` : '') +
    (year ? ` from ${year}` : ''));*/
  let url = searchTerm +
    (names && names.length > 0 ? `author:${names.join(' ').replace(/�/g,'').split(' ').join(' author:')}` : '') +
    (year ? ` &as_ylo=${year}&as_yhi=${year}` : '') +
    '&as_vis=1&as_sdt=1,5';
  return getArticles(url);
}


/**
 * getArticleID - Get an article's unique ID
 *
 * @param  {Article} article article object
 * @return {string} article ID
 */
function getArticleID(article) {
  return article && article.hasOwnProperty('citationUrl') ? article.citationUrl.match(/[0-9]+/)[0] : 'null';
}

function branch(steps, article, parent, searched, searchedBranch, queued) {
  let parentID = parent ? getArticleID(parent) : false;
  let articleID = getArticleID(article);
  if(parentID && searched.hasOwnProperty(parentID + '->' + articleID)) {
    return;
  }
  if(parent) {
    searched[parentID + '->' + articleID] = true;
    parent.relevance += -1 / Math.pow(2, Math.log(article.numCitations / 1000 + 1) / Math.log(10)) + 1;
  }
  if(searchedBranch.hasOwnProperty(articleID)) {
    searchedBranch[articleID].visits++;
    searchedBranch[articleID].steps = Math.min(steps, searchedBranch[articleID].steps);
    searchedBranch[articleID].relevance += 1 / steps;
    return;
  }
  searchedBranch[articleID] = article;
  article.visits = 1;
  article.steps = steps;
  article.relevance = (-1 / Math.pow(2, Math.log(article.numCitations / 1000 + 1) / Math.log(10)) + 1 + Math.min(1, 1.4 / (Math.abs(article.year - 1900) / 50 + 1))) / steps;

  if(article.numCitations < CitationMinimum) { return; }

  queued.push({ steps: steps, article: article, parent: parent });
}

async function searchBranch(steps, article, parent, searched, searchedBranch, queued) {
  let children = await getChildrenArticles(article);
  for(let i = 0; i < children.length; i++) {
    await branch(steps + 1, children[i], article, searched, searchedBranch, queued);
  }

  let neighbors = await getNeighborArticles(article);
  for(let i = 0; i < neighbors.length; i++) {
    await branch(steps + 1, neighbors[i], false, searched, searchedBranch, queued);
  }
  //printGraph(searched,searchedBranch);
}

async function nextBranch(searched, searchedBranch, queued) {
  if(queued.length <= 0) {
    console.log('No queue');
    return;
  }
  let bestCandidate = [0, 0];
  for(let i = 0; i < queued.length; i++) {
    let score = queued[i].article.relevance;
    //console.log('  - ' + score + ' - ' + prettyMap(queued[i].article));
    if(score > bestCandidate[0]) {
      bestCandidate = [score, i];
      //console.log('    - ' + score);
    }
  }
  let best = queued.splice(bestCandidate[1], 1)[0];
  //console.log(best.article);
  await searchBranch(best.article.steps, best.article, best.parent, searched, searchedBranch, queued);
}

/**
 * addSlashes - Escapes a string
 *
 * @param  {string} str original string
 * @return {string} escaped string
 */
function addSlashes(str) {
  //https://locutus.io/php/strings/addslashes/
  return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

var viz = new Viz();

/**
 * printGraph - Prints Graphviz code from a graph
 *
 * @param  {type} searched list of searched article pairs
 * @param  {type} searchedBranch list of searched articles
 */
function printGraph(searched, searchedBranch) {
  let graphTextVars = '';
  let graphTextCons = '';
  let connected = {};
  for(var node in searched) {
    let nodes = node.split('->');
    if(nodes.length === 2 && searchedBranch[nodes[0]].relevance >= MinimumRelevance && searchedBranch[nodes[1]].relevance >= MinimumRelevance) {
      connected[nodes[0]] = true;
      connected[nodes[1]] = true;
      graphTextCons += '\n' + node + ';';
    }
  }
  for(let node in searchedBranch) {
    if(searchedBranch[node].relevance < MinimumRelevance || !connected.hasOwnProperty(node)) { continue; }
    let cites = -1 / Math.pow(2, Math.log(searchedBranch[node].numCitations / 1000 + 1) / Math.log(10)) + 1;
    let rel = -1 / Math.pow(2, Math.log(searchedBranch[node].relevance + 1) / Math.log(10)) + 1;
    graphTextVars += 'node [color="#' +
      ((255 - (cites * 255 >> 0)).toString(16).padStart(2, '0')) +
      ((rel * 255 >> 0).toString(16).padStart(2, '0')) +
      ((cites * 255 >> 0).toString(16).padStart(2, '0')) +
      '" label ="' + addSlashes(searchedBranch[node].title) +
      '" tooltip="' + searchedBranch[node].authors.join(', ').replace(/�/g, '') + ' - ' + searchedBranch[node].year + (searchedBranch[node].publication !== 'books.google.com' ? ', ' + searchedBranch[node].publication : '') + ' - citated by ' + searchedBranch[node].numCitations +
      '" href="' + (searchedBranch[node].pdf ? searchedBranch[node].pdf : searchedBranch[node].url).replace(/&/g, '&amp;') + '"];\n' + node + ';\n';
  }

  console.log('digraph G {\nnode [style=filled fontcolor=white];\n' +
    graphTextVars + graphTextCons +
    '\n}');

  viz.renderSVGElement('digraph G {\nnode [style=filled fontcolor=white];\n' +
    graphTextVars + graphTextCons +
    '\n}')
  .then(function(element) {
    document.getElementById('graph').innerHTML=element.outerHTML;
  })
  .catch(error => {
    // Create a new Viz instance (@see Caveats page for more info)
    viz = new Viz();

    // Possibly display the error
    console.error(error);
  });
}

function compareRelevance(a, b) {
  return b.relevance - a.relevance;
}

function compareCitations(a, b) {
  return b.numCitations - a.numCitations;
}

/**
 * printRelevent - prints the most relevent results from a traversal
 *
 * @param  {object} searchedBranch object of all searched articles
 */
function printRelevent(searchedBranch) {
  let allArticles = [];
  for(let i in searchedBranch) {
    allArticles.push(searchedBranch[i]);
  }

  allArticles.sort(compareRelevance);

  console.log('\nMost Relevent:');
  //console.log(allArticles.map(prettyMap).join('\n'));
  console.log(allArticles.slice(0, 10).map(prettyMap).join('\n'));

  allArticles.sort(compareCitations);

  console.log('\nMost cited:');
  //console.log(allArticles.map(prettyMap).join('\n'));
  console.log(allArticles.slice(0, 10).map(prettyMap).join('\n'));
}

/**
 * buildArticleGraph - Builds and prints the article graph
 *
 * @param  {number} searches number of queries to make
 * @param  {[arguments]} args the same arguments as searchArticles in args
 */
async function buildArticleGraph(searches, args) {
  let root = await searchArticles(...args);
  let searched = {};
  let searchedBranch = {};
  let queued = [];
  try {
    for(let i = 0; i < root.length; i++) {
      branch(1, root[i], false, searched, searchedBranch, queued);
    }
    for(let i = 0; i < searches; i++) {
      console.log(i + '/' + searches + ' searched');
      await nextBranch(searched, searchedBranch, queued);
    }
    console.clear();
  } catch (e) {
    console.error(e);
  }
  printGraph(searched, searchedBranch);

  console.log('Finished searching: ' + args[0]);

  printRelevent(searchedBranch);
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
  return `\x1b[34m${(''+article.numCitations).padStart(7,' ')}\x1b[35m - ${article.year}\x1b[32m ${article.title}\x1b[0m`; // ${getArticleID(article)}
}

async function main() {
  await buildArticleGraph(8, [document.getElementById('q').value.replace(/  +/g,' ').toLowerCase().trim()]);
  //const art = await searchArticles('astrobiology');
  //console.log(art);
  //console.log(art.map(prettyMap).join('\n'));
}

main();
