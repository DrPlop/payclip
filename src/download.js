import https from "node:https";
import fs from "node:fs";

async function login(email, password) {
  const payload = {
    login: email,
    password: password,
  };
  const response = await fetch(
    "https://edocperso.fr/index.php?api=Authenticate&a=doAuthentication",
    {
      method: "POST",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  return response.json();
}

async function fetchLast(token, limit = 10) {
  const response = await fetch(
    `https://v2-app.edocperso.fr/edocPerso/V1/edpDoc/getLast`,
    {
      method: "POST",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: token,
        limit,
      }),
    }
  );
  return response.json();
}

function downloadPayslip(token, id, output) {
  return new Promise((resolve) => {
    let writable = fs.createWriteStream(output);
    https.get(
      `https://v2-app.edocperso.fr/edocPerso/V1/edpDoc/getDocContent?sessionId=${token}&documentId=${id}`,
      (response) => {
        response.pipe(writable);
        writable.on("finish", () => {
          writable.close(resolve);
        });
      }
    );
  });
}

function extractSessionId(payload) {
  const { loginUrl } = payload.content;
  return loginUrl.replace("https://v2-app.edocperso.fr/login/", "");
}

function getFileName(name, iteration = 0) {
  const fileName = name.replaceAll(" ", "_").replaceAll("/", "_");
  const completeFileName =
    iteration === 0 ? `./${fileName}.pdf` : `./${fileName}_${iteration}.pdf`;

  if (fs.existsSync(completeFileName)) {
    return getFileName(name, iteration + 1);
  }
  return completeFileName;
}

export default async function fetchPayslip(email, password, { last }) {
  console.log("Fetching last", last, "payslip");
  const payload = await login(email, password);
  const sessionId = extractSessionId(payload);

  const lastPayrolls = await fetchLast(sessionId, last);
  const docs = lastPayrolls.content.edpDocs;

  for (const doc of docs) {
    const { name, id } = doc;
    const output = getFileName(name);

    await downloadPayslip(sessionId, id, output);
    console.log(`Downloaded ${output}`);
  }
}
