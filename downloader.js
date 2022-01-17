const axios = require("axios");
const { parse } = require("node-html-parser");
const https = require("https");
const fs = require("fs");
const process = require("process");
const readline = require("readline");
const { response } = require("express");

//remove unwnated last part of the link
function getCleanUrl(url) {
  cutOffIndex = String(url).indexOf("?");
  if (cutOffIndex != -1) return url.substring(0, cutOffIndex);
  return url;
}
async function getPostLink(url) {
  url = url + "embed" + "/captioned";

  let res = axios.get(url).then(async (response) => {
    const root = parse(response.data);

    let link = "";
    if (response.data.search("video_url") != -1)
      link = getVideoLinkFromHtml(response.data);
    else
      link = root.querySelector("img.EmbeddedMediaImage").getAttribute("src");

    while (link.search("&amp;") != -1) {
      link = link.replace("&amp;", "&");
    }
    let caption = await getCaptionFromHtml(response.data);

    return { link, caption };
  });

  return res;
}

async function getCaption(url) {
  url = url + "embed" + "/captioned";
  let res = axios.get(url).then((response) => {
    let caption = getCaptionFromHtml(response.data);
    return caption;
  });
  return res;
}

async function getCaptionFromHtml(html) {
  const root = parse(html);

  let caption = root.querySelector(".Caption")?.text;
  if (caption == undefined) caption = "No caption";

  caption = caption.replace("view all comments", "");
  return caption;
}

function getVideoLinkFromHtml(html) {
  let crop =
    '{"' +
    html.substring(html.search("video_url"), html.search("video_url") + 1000);

  crop = crop.substring(0, crop.search(",")) + "}";

  return JSON.parse(crop).video_url;
}

(async () => {})();

function downloadFile(link) {
  //generate index number for filename
  fileIndex = fs.readdirSync("./videos", (err, files) => {
    if (!err) {
      return true;
    }
    console.log(err);
    return false;
  });

  //index must not be equal to 0
  fileIndex = fileIndex.length >= 1 ? fileIndex.length++ : "";
  //download usign https
  const req = https.get(link, (res) => {
    const fileStream = fs.createWriteStream(
      `./videos/insta_video${fileIndex}.mp4`
    );
    res.pipe(fileStream);
    fileStream.on("finish", () => {
      fileStream.close();
      console.log("Done!\n");
    });

    fileStream.on("error", (err) => {
      console.log(err);
    });
  });

  req.on("error", (err) => {
    console.log(err);
  });
}
//initial all
async function downloadInit(url) {
  const cleanUrl = getCleanUrl(url);
  const response = await getPostLink(cleanUrl);
  const isDownloaded = downloadFile(response.link);
  return isDownloaded;
}

//read terminal until except
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

//recuresion at play 😊
async function waitForUserInput() {
  rl.question("Enter Link or 'exit': ", function (link) {
    if (link == "exit") {
      rl.close();
    } else {
      downloadInit(link).then((response) => {
        waitForUserInput();
      });
    }
  });
}
waitForUserInput();
