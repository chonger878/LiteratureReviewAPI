let cookieVal = document.getElementById('cookie-val');

document.getElementById('user-agent-val').value=navigator.userAgent;

let test;

chrome.devtools.network.onRequestFinished.addListener(function(request) {
  if(request.request.url.indexOf('https://scholar.google.com/scholar?') === 0) {
    test = request;
    cookieVal.value = request.request.headers.filter(a=>a.name=='cookie')[0].value;
  }
});

cookieVal.value = 'Refresh Google Scholar';

function copyCookie() {
  cookieVal.select();
  cookieVal.setSelectionRange(0, cookieVal.value.length);
  document.execCommand("copy");
}

document.getElementById('copyBtn').addEventListener('click', copyCookie)
