console.log("hello from devtools");
chrome.devtools.panels.create("Scholar Cookie",
  "coldfusion10.png",
  "panel.html",
  function(panel) { console.log("hello from callback"); });
