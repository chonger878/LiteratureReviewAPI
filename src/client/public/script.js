/*
TODO:
- query database for articles
  - alert user of queue length on error
*/

const MinimumRelevance = document.getElementById("minRel").value / 100;
const Searches = document.getElementById("depth").value;
const AllowUnconnected = document.getElementById("singles").checked;

/**
 * queryDatabase - queries the database for results from a specific search url
 *
 * @param  {string} search search url querying
 * @return {[Article Object]} Article object Array
 */
async function queryDatabase(search) {
  //search pre-computed data for now
  if(Data.hasOwnProperty(search)) {
    return Data[search];
  } else {
    throw 'data not available';
  }
  /*
  //ajax api call
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://backend.com/api?q='+search, true);
    xhr.send();
    xhr.onreadystatechange = function(){
      if (xhr.readyState === 4){
        if (xhr.status === 200){
          let resp = xhr.responseText;
          let respJson = JSON.parse(resp);
          resolve(respJson);
        } else {
          reject(xhr.status);
        }
      }
    }
  })
  */
}

/**
 * getChildrenArticles - Retrieves the most relevent articles that cite a given article
 *
 * @param  {Article} article original article
 * @param  {number} [citationMinimum] minimum citations
 * @return {[Article Array Promise]} resolves with a list of children articles
 */
function getChildrenArticles(article) {
  let url = article.citationUrl.replace('http://scholar.google.com/scholar?', '&');
  return queryDatabase(url);
}

/**
 * getNeighborArticles - Retrieves the most relevent articles to a given article
 *
 * @param  {Article} article original article
 * @param  {number} [citationMinimum] minimum citations
 * @return {[Article Array Promise]} resolves with a list of children articles
 */
function getNeighborArticles(article) {
  let url = article.relatedUrl.replace('http://scholar.google.com/scholar?q=', '');
  return queryDatabase(url);
}

/**
 * Takes in search terms and returns an Article array promise
 * @param {string} searchTerm main search term within blurb/title
 * @param {[string]} [authors] author(s) name(s)
 * @param {number} [year] publication year
 * @param  {number} [citationMinimum] minimum citations
 * @return {[Article Array Promise]} Array of articles found with the given search terms
 */
function searchArticles(searchTerm, names, year) {
  let url = searchTerm +
    (names && names.length > 0 ? `author:${names.join(' ').replace(/�/g,'').split(' ').join(' author:')}` : '') +
    (year ? ` &as_ylo=${year}&as_yhi=${year}` : '');
  return queryDatabase(url);
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

  queued.push({ steps: steps, article: article, parent: parent });
}

async function searchBranch(steps, article, parent, searched, searchedBranch, queued) {
  let children = await getChildrenArticles(article);
  for(let i = 0; i < children.length; i++) {
    branch(steps + 1, children[i], article, searched, searchedBranch, queued);
  }

  let neighbors = await getNeighborArticles(article);
  for(let i = 0; i < neighbors.length; i++) {
    branch(steps + 1, neighbors[i], false, searched, searchedBranch, queued);
  }
}

/**
 * nextBranch - Searches the next most relevent query
 *
 * @param  {Object} searched Connections already searched
 * @param  {Object} searchedBranch Branches already searched
 * @param  {Array} queued Array of queued urls to search
 */
async function nextBranch(searched, searchedBranch, queued) {
  if(queued.length <= 0) {
    console.log('No queue');
    return;
  }
  let bestCandidate = [0, 0];
  for(let i = 0; i < queued.length; i++) {
    let score = queued[i].article.relevance;
    if(score > bestCandidate[0]) {
      bestCandidate = [score, i];
    }
  }
  let best = queued.splice(bestCandidate[1], 1)[0];
  try {
    await searchBranch(best.article.steps, best.article, best.parent, searched, searchedBranch, queued);
  } catch (e) {
    console.error(e);
  }
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
 * renderGraph - Prints Graphviz code from a graph
 *
 * @param  {type} searched list of searched article pairs
 * @param  {type} searchedBranch list of searched articles
 */
function renderGraph(searched, searchedBranch) {
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
    if(searchedBranch[node].relevance < MinimumRelevance || (!AllowUnconnected && !connected.hasOwnProperty(node))) { continue; }
    let cites = -1 / Math.pow(2, Math.log(searchedBranch[node].numCitations / 1000 + 1) / Math.log(10)) + 1;
    let rel = -1 / Math.pow(2, Math.log(searchedBranch[node].relevance + 1) / Math.log(3)) + 1;
    graphTextVars += 'node [color="#' +
      ((255 - (rel * 255 >> 0)).toString(16).padStart(2, '0')) +
      ((cites * 255 >> 0).toString(16).padStart(2, '0')) +
      ((rel * 255 >> 0).toString(16).padStart(2, '0')) +
      '" label ="' + addSlashes(searchedBranch[node].title) +
      '" tooltip="' + searchedBranch[node].authors[0].replace(/�/g, '') + ' - ' + searchedBranch[node].year + (searchedBranch[node].publication !== 'books.google.com' ? ', ' + searchedBranch[node].publication : '') + ' - citated by ' + searchedBranch[node].numCitations +
      '" href="' + (searchedBranch[node].pdf ? searchedBranch[node].pdf : searchedBranch[node].url).replace(/&/g, '&amp;') + '"];\n' + node + ';\n';
  }

  viz.renderSVGElement('digraph Enlarge{\nnode [style=filled fontcolor=white];\n' +
      graphTextVars + graphTextCons +
      '\n}')
    .then(function(element) {
      document.getElementById('graph').innerHTML = '<a href="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(element.outerHTML) + '">' + element.outerHTML + '</a>';
    })
    .catch(error => {
      viz = new Viz();
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
  console.log(allArticles.slice(0, 10).map(prettyMap).join('\n'));

  allArticles.sort(compareCitations);

  console.log('\nMost cited:');
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
  } catch (e) {
    console.error(e);
  }
  renderGraph(searched, searchedBranch);

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
  return `\x1b[34m${(''+article.numCitations).padStart(7,' ')}\x1b[35m - ${article.year}\x1b[32m ${article.title}\x1b[0m`;
}

async function main() {
  await buildArticleGraph(Searches, [document.getElementById('q').value.replace(/  +/g, ' ').toLowerCase().trim()]);
}

main();
