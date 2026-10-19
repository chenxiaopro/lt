const url = String(process.argv[2] || "").trim().replace(/\/$/, "");
const { setSetting } = require("./db");
setSetting("yy_api", url);
process.stdout.write(url || "");
