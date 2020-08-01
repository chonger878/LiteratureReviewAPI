'use strict';

let cookieVal = document.getElementById('cookie-val');

cookieVal.value='Refresh Google Scholar';

function copyCookie(){
  cookieVal.select();
  cookieVal.setSelectionRange(0,cookieVal.value.length);
  document.execCommand("copy");
}

document.getElementById('copyBtn').addEventListener('click',copyCookie)
