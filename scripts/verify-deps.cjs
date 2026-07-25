// Throwaway script: verify all key deps work.

async function main() {
  console.log("fetch (native): OK");

  const cheerio = require("cheerio");
  const $ = cheerio.load("<h1>Hi</h1><meta name='description' content='x'>");
  console.log("cheerio OK:", $("h1").text(), "/", $('meta[name=description]').attr("content"));

  const { diffWords } = require("diff");
  const parts = diffWords("hello world", "hello there world");
  console.log("diff OK:", parts.length, "parts");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
