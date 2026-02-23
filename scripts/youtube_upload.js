const fs = require("fs");
const fsp = require("fs/promises");
const https = require("https");
const path = require("path");

const VALID_PRIVACY = new Set(["private", "unlisted", "public"]);

function defaultOptions() {
  return {
    description: "",
    privacy: process.env.YOUTUBE_DEFAULT_PRIVACY || "private",
    category: process.env.YOUTUBE_DEFAULT_CATEGORY_ID || "22",
    madeForKids: process.env.YOUTUBE_MADE_FOR_KIDS === "true",
    dryRun: false
  };
}

function parseArgs(argv) {
  const options = defaultOptions();

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--file" || arg === "-f") {
      options.file = next;
      i += 1;
    } else if (arg === "--title" || arg === "-t") {
      options.title = next;
      i += 1;
    } else if (arg === "--description" || arg === "-d") {
      options.description = next || "";
      i += 1;
    } else if (arg === "--tags") {
      options.tags = (next || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      i += 1;
    } else if (arg === "--privacy") {
      options.privacy = (next || "").toLowerCase();
      i += 1;
    } else if (arg === "--category") {
      options.category = next;
      i += 1;
    } else if (arg === "--publish-at") {
      options.publishAt = next;
      i += 1;
    } else if (arg === "--made-for-kids") {
      options.madeForKids = true;
    } else if (arg === "--not-made-for-kids") {
      options.madeForKids = false;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
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
      "  node scripts/youtube_upload.js --file <path> [--title <title>] [--description <text>]",
      "    [--tags tag1,tag2] [--privacy private|unlisted|public] [--category <id>]",
      "    [--publish-at <ISO-8601>] [--made-for-kids|--not-made-for-kids] [--dry-run]",
      "",
      "Required env vars:",
      "  GOOGLE_CLIENT_ID",
      "  GOOGLE_CLIENT_SECRET",
      "  YOUTUBE_REFRESH_TOKEN",
      "",
      "Optional defaults via env vars:",
      "  YOUTUBE_DEFAULT_PRIVACY (default: private)",
      "  YOUTUBE_DEFAULT_CATEGORY_ID (default: 22)",
      "  YOUTUBE_MADE_FOR_KIDS (true|false, default: false)"
    ].join("\n")
  );
}

function detectContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const byExt = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".m4v": "video/x-m4v",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo"
  };
  return byExt[ext] || "application/octet-stream";
}

async function getAccessToken() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing YouTube OAuth env vars");
  }

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(JSON.stringify(data));
  return data.access_token;
}

async function startResumableUpload(accessToken, filePath, fileSize, contentType, metadata) {
  const initResp = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=resumable",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(fileSize),
        "X-Upload-Content-Type": contentType
      },
      body: JSON.stringify(metadata)
    }
  );

  if (!initResp.ok) {
    const errorText = await initResp.text();
    throw new Error(`Failed to start upload: ${initResp.status} ${errorText}`);
  }

  const uploadUrl = initResp.headers.get("location");
  if (!uploadUrl) {
    throw new Error("Upload URL missing from YouTube response");
  }

  return uploadUrl;
}

function uploadFile(uploadUrl, filePath, fileSize, contentType) {
  return new Promise((resolve, reject) => {
    const target = new URL(uploadUrl);
    const request = https.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || undefined,
        path: `${target.pathname}${target.search}`,
        method: "PUT",
        headers: {
          "Content-Length": fileSize,
          "Content-Type": contentType
        }
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (response.statusCode >= 200 && response.statusCode < 300) {
            if (!body.trim()) return resolve({});
            try {
              return resolve(JSON.parse(body));
            } catch (e) {
              return resolve({ raw: body });
            }
          }
          reject(
            new Error(
              `Upload failed: ${response.statusCode} ${response.statusMessage || ""} ${body}`.trim()
            )
          );
        });
      }
    );

    request.on("error", reject);

    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.pipe(request);
  });
}

function validate(options) {
  if (!options.file) {
    throw new Error("--file is required");
  }

  if (!VALID_PRIVACY.has(options.privacy)) {
    throw new Error("--privacy must be one of: private, unlisted, public");
  }

  if (options.publishAt) {
    const parsed = Date.parse(options.publishAt);
    if (Number.isNaN(parsed)) {
      throw new Error("--publish-at must be an ISO-8601 datetime");
    }
  }
}

function normalizeOptions(inputOptions) {
  const options = { ...defaultOptions(), ...inputOptions };
  if (typeof options.privacy === "string") {
    options.privacy = options.privacy.toLowerCase();
  }
  if (typeof options.tags === "string") {
    options.tags = options.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return options;
}

async function buildUploadRequest(inputOptions) {
  const options = normalizeOptions(inputOptions);
  validate(options);

  const filePath = path.resolve(options.file);
  const fileStats = await fsp.stat(filePath);
  if (!fileStats.isFile()) {
    throw new Error(`Not a file: ${filePath}`);
  }

  const contentType = detectContentType(filePath);
  const title = options.title || path.parse(filePath).name;
  const metadata = {
    snippet: {
      title,
      description: options.description || "",
      categoryId: String(options.category || "22")
    },
    status: {
      privacyStatus: options.privacy,
      selfDeclaredMadeForKids: Boolean(options.madeForKids)
    }
  };

  if (options.tags && options.tags.length > 0) {
    metadata.snippet.tags = options.tags;
  }

  if (options.publishAt) {
    metadata.status.publishAt = new Date(options.publishAt).toISOString();
  }

  return {
    options,
    filePath,
    fileSize: fileStats.size,
    contentType,
    metadata
  };
}

async function runUpload(inputOptions, logger = console) {
  const request = await buildUploadRequest(inputOptions);
  const { options, filePath, fileSize, contentType, metadata } = request;

  if (options.dryRun) {
    logger.log("Dry run. Upload request validated.");
    logger.log(JSON.stringify({ filePath, fileSize, contentType, metadata }, null, 2));
    return { dryRun: true, filePath, fileSize, contentType, metadata };
  }

  logger.log(`Uploading ${filePath} (${fileSize} bytes) to YouTube...`);

  const accessToken = await getAccessToken();
  const uploadUrl = await startResumableUpload(accessToken, filePath, fileSize, contentType, metadata);
  const result = await uploadFile(uploadUrl, filePath, fileSize, contentType);

  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  const result = await runUpload(options);

  console.log("Upload complete.");
  console.log(JSON.stringify(result, null, 2));

  if (result.id) {
    console.log(`Video URL: https://www.youtube.com/watch?v=${result.id}`);
  }
}

module.exports = {
  defaultOptions,
  parseArgs,
  usage,
  normalizeOptions,
  buildUploadRequest,
  runUpload
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
