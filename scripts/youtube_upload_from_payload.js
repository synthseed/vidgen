const fsp = require("fs/promises");
const { runUpload } = require("./youtube_upload");

function parseArgs(argv) {
  const options = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--payload") {
      options.payload = next;
      i += 1;
    } else if (arg === "--payload-file") {
      options.payloadFile = next;
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function usage() {
  console.log(
    [
      "Usage:",
      "  node scripts/youtube_upload_from_payload.js --payload '<json>'",
      "  node scripts/youtube_upload_from_payload.js --payload-file <file.json>",
      "  cat payload.json | node scripts/youtube_upload_from_payload.js",
      "",
      "Payload fields:",
      "  file (required)",
      "  title, description, tags, privacy, category, publishAt, madeForKids, dryRun",
      "",
      "Example payload:",
      '  {"file":"C:\\\\videos\\\\clip.mp4","title":"Daily Clip","privacy":"private","tags":["ai","clip"]}'
    ].join("\n")
  );
}

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(chunks.join("").trim()));
    process.stdin.on("error", reject);
  });
}

async function loadPayload(args) {
  if (args.payload && args.payloadFile) {
    throw new Error("Pass either --payload or --payload-file, not both");
  }

  if (args.payload) {
    return args.payload;
  }

  if (args.payloadFile) {
    return (await fsp.readFile(args.payloadFile, "utf8")).trim();
  }

  if (!process.stdin.isTTY) {
    const stdinPayload = await readStdin();
    if (stdinPayload) return stdinPayload;
  }

  throw new Error("Missing payload. Use --payload, --payload-file, or pipe JSON to stdin.");
}

function parsePayload(rawPayload) {
  let payload;
  try {
    payload = JSON.parse(rawPayload);
  } catch (error) {
    throw new Error(`Invalid JSON payload: ${error.message}`);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Payload must be a JSON object");
  }

  return payload;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const rawPayload = await loadPayload(args);
  const payload = parsePayload(rawPayload);
  const result = await runUpload(payload);

  if (result.dryRun) {
    console.log("Dry run completed.");
    return;
  }

  console.log("Upload complete.");
  console.log(JSON.stringify(result, null, 2));
  if (result.id) {
    console.log(`Video URL: https://www.youtube.com/watch?v=${result.id}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
