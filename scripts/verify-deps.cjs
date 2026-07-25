// Throwaway script: verify all key deps work.
const { createClient } = require("@libsql/client");

async function main() {
  const db = createClient({ url: ":memory:" });
  await db.execute("CREATE TABLE t(x INTEGER)");
  await db.execute({ sql: "INSERT INTO t VALUES (?)", args: [42] });
  const result = await db.execute("SELECT x FROM t");
  console.log("@libsql/client OK:", JSON.stringify(result.rows[0]));

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
