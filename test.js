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
 * @param {string} [authorFirst] - author's first name
 * @param {string} [authorLast] - author's last name
 * @param {string} [yearLow] - publication year lower bound
 * @param {string} [yearHigh=yearLow] - publication year upper bound
 * @return {[Article Array]} - Array of articles found with the given search terms
 */
function getArticles(searchTerm, authorFirst = '', authorLast = '', yearLow = false, yearHigh = false) {
  console.log('Searching ' + (authorFirst ? `${authorFirst}` +
      (authorLast ? ` ${authorLast}` : '') : '') +
    (yearLow ? ` from ${yearLow}-${yearHigh?yearHigh:yearLow}` : ''));
  return new Promise((resolve, reject) => {
    scholarly.search(
      (authorFirst ? `author:${authorFirst}` +
        (authorLast ? ` author:${authorLast}` : '') : '') +
      (yearLow ? ` &as_ylo=${yearLow}&as_yhi=${yearHigh?yearHigh:yearLow}` : '') +
      '&as_vis=1'
    ).then((data) => {
      resolve(data);
    });
  });
}

function titlesMap(article) {
  return article.authors;
}

async function main() {
  const art = await getArticles('', 'Claude', 'Shannon', 1948);
  console.log(art.map(titlesMap));
}

main();
