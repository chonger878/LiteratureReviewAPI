var htmlMinimumRelevance = document.getElementById("minRel");
var htmlSearches = document.getElementById("depth");
var htmlAllowUnconnected = document.getElementById("singles");

var MinimumRelevance;
var Searches = htmlSearches.value;
var AllowUnconnected = htmlAllowUnconnected.checked;

const CitationMinimum = 5; // How many citations needed to search
var MaximumArticles = 1; // Most articles searched (rounded up to the nearest page) (each page has ~10 articles)

var progressBar = document.getElementById('progress');

function tanh(x) {
  return Math.tanh((x - 0.5) * 5) * 0.50675 + 0.5
}

var IndexWeight = tanh(0.5);
var StepWeight = tanh(0.5);
var Presearch = 5;

let started = false;

async function getArticles(url) {
  //  AJAX call
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', '/query?query=' + escape(url), true);
    xhr.send();
    xhr.onreadystatechange = function() {
      if(xhr.readyState === 4) {
        try {
          let resp = xhr.responseText;
          let respJson = JSON.parse(resp);
          resolve(respJson);
        } catch (e) { return { error: 'something went wrong' } }
      }
    }
  })
}

var controlRe = /[\x00-\x1f\x80-\x9f]/g;
var reservedRe = /^\.+$/;
var windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
var windowsTrailingRe = /[\. ]+$/;
function sanitize(input) {
  let replacement = '';
  if(typeof input !== 'string') {
    throw new Error('Input must be string');
  }
  var sanitized = input
    .replace(/\//g, '{sl}')
    .replace(/\?/g, '{qu}')
    .replace(/</g, '{gt}')
    .replace(/>/g, '{lt}')
    .replace(/\\/g, '{bs}')
    .replace(/:/g, '{cl}')
    .replace(/\*/g, '{ax}')
    .replace(/\|/g, '{pp}')
    .replace(/"/g, '{dq}')
    .replace(controlRe, replacement)
    .replace(reservedRe, replacement)
    .replace(windowsReservedRe, replacement)
    .replace(windowsTrailingRe, replacement);
  return sanitized.slice(0, 255);
}

let allData = JSON.parse(JSON.stringify(Data));

async function loadArticles(query) {
  if(allData.hasOwnProperty(query)){return;}
  //  AJAX call
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    //xhr.open('GET', `https://cdn.jsdelivr.net/gh/chonger878/LiteratureReviewAPI@master/src/DB/${encodeURIComponent(sanitize(query))}.json`, true);
    xhr.open('GET', `https://raw.githubusercontent.com/chonger878/LiteratureReviewAPI/master/src/DB/${encodeURIComponent(sanitize(query))}.json`,true);
    xhr.send();
    xhr.onreadystatechange = function() {
      if(xhr.readyState === 4) {
        try {
          let resp = xhr.responseText;
          let respJson = JSON.parse(resp);
          //console.log(respJson);
          for(let k in respJson) {
            //console.log('- '+k);
            Data[k] = respJson[k];
            allData[k] = JSON.parse(JSON.stringify(respJson[k]));
          }
          resolve(true);
        } catch (e) { console.error(e); resolve(false); }
      }
    }
  })
}
loadArticles('information+theory');

/**
 * queryDatabase - queries the database for results from a specific search url
 *
 * @param  {string} search search url querying
 * @return {[Article Object]} Article object Array
 */
async function queryDatabase(search, searched, searchedBranch) {
  console.log(search);
  if(!Data.hasOwnProperty(search)) {//|| allData[search][0].p < (MaximumArticles + 9) / 10
    promptDownload();
    abortSearch = true;
    throw 'abort';


    /*find and save to file if not available
    var response = await getArticles(search, searched, searchedBranch);
    if(response.hasOwnProperty('error')) {
      promptDownload();
      abortSearch = true;
      throw 'abort';
    }
    Data[search] = response;
    Data[search][0].p = (MaximumArticles + 9) / 10;
    for(var i = 0; i < Data[search].length; i++) {
      if(Data[search][i].hasOwnProperty('description')) {
        delete Data[search][i].description;
      }
    }
    allData[search] = JSON.parse(JSON.stringify(Data[search]));
    */
  }
  return JSON.parse(JSON.stringify(allData[search]));
}

/**
 * getChildrenArticles - Retrieves the most relevent articles that cite a given article
 *
 * @param  {Article} article original article
 * @return {[Article Array Promise]} resolves with a list of children articles
 */
function getChildrenArticles(article, searched, searchedBranch) {
  if(article.hasOwnProperty('citationUrl')) {
    let url = article.citationUrl.replace('http://scholar.google.com/scholar?', '&');
    return queryDatabase(url, searched, searchedBranch);
  }
  return [];
}

/**
 * getNeighborArticles - Retrieves the most relevent articles to a given article
 *
 * @param  {Article} article original article
 * @return {[Article Array Promise]} resolves with a list of children articles
 */
function getNeighborArticles(article, searched, searchedBranch) {
  if(article.hasOwnProperty('relatedUrl')) {
    let url = article.relatedUrl.replace('http://scholar.google.com/scholar?q=', '');
    return queryDatabase(url, searched, searchedBranch);
  }
  return [];
}

/**
 * Takes in search terms and returns an Article array promise
 * @param {string} searchTerm main search term within blurb/title
 * @param {[string]} [authors] author(s) name(s)
 * @param {number} [year] publication year
 * @return {[Article Array Promise]} Array of articles found with the given search terms
 */
function searchArticles(searchTerm, names, year) {
  let url = searchTerm +
    (names && names.length > 0 ? `author:${names.join(' ').replace(/�/g,'').split(' ').join(' author:')}` : '') +
    (year ? ` &as_ylo=${year}&as_yhi=${year}` : '');
  return queryDatabase(url, {}, {});
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
var parentWeight = 1;

function stepValue(steps) {
  var val = steps.length * 2;
  for(var i = 0; i < steps.length; i++) {
    val += (1 + steps[i]) * Math.pow(StepWeight * 4, 1 + i);
  }
  return val;
}

function counterWeight(v, x) {
  return -Math.log(v) * Math.pow(v, x);
}

/**
 * articleRelevance - dtermines the initial relevance value of an article
 *
 * @param  {Article Object} article article object
 * @param  {array} steps the steps away from the original search
 * @param  {number} index the index on the page
 * @return {number} initial relevancy value of the article
 */
function articleRelevance(article, steps, index) {
  return (
      -1 / Math.pow(2,
        Math.log(article.numCitations / 1000 + 1) / Math.log(10)) +
      1 +
      Math.min(1, 1.4 / (Math.abs(article.year - 1900) / 50 + 1))
    ) *
    //Math.pow(1 - IndexWeight, stepValue(steps))
    (2 * counterWeight(1 - IndexWeight, stepValue(steps) / 10));
}

function formatArticle(article, steps, index, searchedBranch) {
  let articleID = getArticleID(article);
  searchedBranch[articleID] = article;
  article.visits = 1;
  article.steps = steps.concat(index);
  article.relevance = articleRelevance(article, article.steps, index);
  article.base = article.relevance;
}

function branch(steps, article, parent, searched, searchedBranch, queued, index) {
  let parentID = parent ? getArticleID(parent) : false;
  let articleID = getArticleID(article);
  if(parentID && searched.hasOwnProperty(parentID + '->' + articleID)) {
    return;
  }
  if(parent) {
    searched[parentID + '->' + articleID] = true;
  }
  if(searchedBranch.hasOwnProperty(articleID)) {
    if(stepValue(steps.concat(index)) < stepValue(searchedBranch[articleID].steps)) {
      searchedBranch[articleID].steps = steps.concat(index);
    }
    searchedBranch[articleID].relevance += searchedBranch[articleID].base / (1 + searchedBranch[articleID].visits / 4);
    searchedBranch[articleID].visits++;
    return;
  }

  formatArticle(article, steps, index, searchedBranch);

  if(article.numCitations > CitationMinimum) {
    queued.push({ steps: steps, article: article, parent: parent });
  }
}

async function searchBranch(steps, article, searched, searchedBranch, queued) {
  if(abortSearch) { throw 'aborting'; }
  let children = await getChildrenArticles(article, searched, searchedBranch);
  progressBar.value++;
  for(let i = 0; i < children.length; i++) {
    branch(steps, children[i], article, searched, searchedBranch, queued, i);
  }

  if(abortSearch) { throw 'aborting'; }
  let neighbors = await getNeighborArticles(article, searched, searchedBranch);
  progressBar.value++;
  for(let i = 0; i < neighbors.length; i++) {
    branch(steps, neighbors[i], false, searched, searchedBranch, queued, i);
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
    await searchBranch(best.article.steps, best.article, searched, searchedBranch, queued);
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
  let anyConnected = false;
  for(var node in searched) {
    let nodes = node.split('->');
    if(nodes.length === 2 && searchedBranch[nodes[0]].relevance >= MinimumRelevance && searchedBranch[nodes[1]].relevance >= MinimumRelevance) {
      anyConnected = true;
      connected[nodes[0]] = true;
      connected[nodes[1]] = true;
      graphTextCons += '\n' + node + ';';
    }
  }
  for(let node in searchedBranch) {
    if(searchedBranch[node].relevance < MinimumRelevance || (anyConnected && !AllowUnconnected && !connected.hasOwnProperty(node))) { continue; }
    let cites = -1 / Math.pow(2, Math.log(searchedBranch[node].numCitations / 1000 + 1) / Math.log(10)) + 1;
    let rel = -1 / Math.pow(2, Math.log(searchedBranch[node].relevance + 1) / Math.log(3)) + 1;
    graphTextVars += 'node [color="#' +
      ((255 - (rel * 255 >> 0)).toString(16).padStart(2, '0')) +
      ((cites * 255 >> 0).toString(16).padStart(2, '0')) +
      ((rel * 255 >> 0).toString(16).padStart(2, '0')) +
      '" label ="' + addSlashes(searchedBranch[node].title) +
      '" tooltip="' + searchedBranch[node].authors[0].replace(/�/g, '') + ' - ' + searchedBranch[node].year + (searchedBranch[node].publication !== 'books.google.com' ? ', ' + searchedBranch[node].publication : '') + ' - citated by ' + searchedBranch[node].numCitations +
      '" href="' + (searchedBranch[node].hasOwnProperty('urlVersionsList') ? searchedBranch[node].urlVersionsList : (searchedBranch[node].hasOwnProperty('searchedBranch[node].pdf') ? searchedBranch[node].pdf : searchedBranch[node].url)).replace(/&/g, '&amp;') + '"];\n' + node + ';\n';
  }

  viz.renderSVGElement('digraph Enlarge{\nnode [style=filled fontcolor=white shape=rectangle];\n' +
      graphTextVars + graphTextCons +
      '\n}')
    .then(function(element) {
      document.getElementById('graph').innerHTML = '<a onclick="openSVG(this,event)" href="data:image/svg+xml;utf8,' + encodeURIComponent(element.outerHTML) + '">' + element.outerHTML + '</a>';
      fixExternalLinks();
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
  await loadArticles(args[0]);
  progressBar.max = (searches * 1 + Presearch) * 2 + 2;
  let searched = {};
  let searchedBranch = {};
  let queued = [];
  try {
    let root = await searchArticles(...args);
    progressBar.max = (searches * 1 + Math.min(Presearch, root.length)) * 2 + 2;
    progressBar.value++;
    for(let i = 0; i < root.length; i++) {
      branch([], root[i], false, searched, searchedBranch, queued, i);
    }
    for(let i = 0; i < Presearch && root.length > 0; i++) {
      //let article = root.shift();
      //formatArticle(article, [], i, searchedBranch);
      let articleID = getArticleID(root[i]);
      for(let j = 0; j < queued.length; j++) {
        if(getArticleID(queued[j].article) === articleID) {
          await searchBranch([j], queued.splice(j, 1)[0].article, searched, searchedBranch, queued);
          j = Infinity;
        }
      }
      if(abortSearch) { throw 'aborting'; }
    }
    for(let i = 0; i < searches; i++) {
      await nextBranch(searched, searchedBranch, queued);
      if(abortSearch) { throw 'aborting'; }
    }
  } catch (e) {
    if(!abortSearch) {
      console.error(e);
    }
  }

  progressBar.style.display = "none";
  renderGraph(searched, searchedBranch);
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

var searching = true;
async function main() {
  abortSearch = false;
  await buildArticleGraph(Searches, [encodeURIComponent(document.getElementById('q').value.replace(/  +/g, ' ').toLowerCase().trim()).replace(/%20| /g, '+')]);
  if(started) {
    setAutoComplete();
  }
  searching = false;
}

async function openSVG(a, event) {
  if(event.path.length > 9) { return; }

  var w = window.open("", "SVG");
  w.document.write(unescape(a.href.replace('data:image/svg+xml;utf8,', '')));
  w.stop();
}

function fixExternalLinks() {
  document.querySelectorAll('a').forEach(function(link) {
    if(link.hasAttribute('target') == false) {
      link.setAttribute('target', '_blank');
    }
  })
}
document.addEventListener("DOMContentLoaded", fixExternalLinks);

var settingsModal = document.getElementById("settingsModal");

// When the user clicks on <span> (x), close the modal
function closeModal() {
  settingsModal.style.display = "none";
}

function openModal() {
  settingsModal.style.display = "block";
}

function closeDownload() {
  downloadModal.style.display = "none";
}

function promptDownload() {
  downloadModal.style.display = "block";
}

var defaultUrl = { q: 'information theory', depth: 8, minRel: 50, stepSetting: 500, indexSetting: 500, presearchSetting: 5, pagesSetting: 1, maxDepthSetting: 10 };

function setUrl() {
  if(!history.pushState) { return; }
  var qs = '?';
  let first = true;
  for(let el in defaultUrl) {
    let element = document.getElementById(el);
    if(element.value != defaultUrl[el]) {
      if(!first) { qs += '&'; }
      first = false;
      qs += el + '=' + encodeURIComponent(element.value);
    }
  }
  if(document.getElementById('singles').checked) {
    if(!first) { qs += '&'; }
    qs += 'singles=true';
  }
  var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + qs;
  window.history.pushState({ path: newurl }, '', newurl);
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if(event.target == settingsModal) {
    settingsModal.style.display = "none";
  }
}

htmlIndexWeight = document.getElementById('indexSetting');
htmlStepWeight = document.getElementById('stepSetting');
htmlPresearch = document.getElementById('presearchSetting');
htmlMaxDepth = document.getElementById('maxDepthSetting');

htmlIndexWeight.onchange = function() {
  IndexWeight = tanh(this.value / 1000);
}

htmlStepWeight.onchange = function() {
  StepWeight = tanh(this.value / 1000);
}

htmlPresearch.onchange = function() {
  Presearch = this.value;
}

htmlMaxDepth.onchange = function() {
  htmlSearches.max = Math.abs(this.value);
  htmlSearches.value = Math.min(Math.abs(this.value), htmlSearches.value);
}

document.getElementById('pagesSetting').onchange = function() {
  MaximumArticles = (this.value - 1) * 10 + 1;
  if(!(this.value * 1)) {
    MaximumArticles = 1;
    this.value = 1;
  }
}

var mlt = 0.2;

function getM() {
  return 2 - (2 - htmlMinimumRelevance.value / 100);
  //return 2 - (2 - htmlMinimumRelevance.value / 100) * (1 + //Math.pow(htmlIndexWeight.value / 1000 + htmlStepWeight.value / 1000 - 1, 3) * mlt);
}
MinimumRelevance = Math.pow(getM() * 3, 3) / 3;

async function submitSearch() {
  if(searching) { return; }
  setUrl();
  searching = true;
  MinimumRelevance = Math.pow(getM() * 3, 3) / 3;
  Searches = htmlSearches.value;
  AllowUnconnected = htmlAllowUnconnected.checked;

  progressBar.style.display = "inline";
  progressBar.value = 0;

  document.getElementById('graph').innerHTML = '';

  await main();
}

main();
