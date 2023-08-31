import fetch from "node-fetch";
import https from "node:https";
import fs from "node:fs";

async function login(email, password) {
  const payload = {
    login: email,
    password: password,
    nameihm: "mycecurity",
    language: "fr-fr",
    attributs: {
      active_user: false,
      list_user: [],
      active_admin: false,
      list_admin: [],
    },
    emailActive: true,
    tosactivation: 1,
    hideUser: false,
  };
  const response = await fetch("https://mycecurity.com/node/v1/users/connect", {
    method: "POST",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return response.json();
}

async function listItem(token, safeId, folderId) {
  const response = await fetch(
    `https://mycecurity.com/node/v1/safes/${safeId}/nodes/${folderId}/mycecurity?pageSize=50&pageIndex=0&orderBy=descrip&orderAsc=true&revision=on`,
    {
      cache: "no-cache",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.json();
}

async function listRootFolder(token, safeId) {
  const response = await fetch(
    `https://mycecurity.com/node/v1/safes/${safeId}/mycecurity/fr-fr/select?pageSize=50&isUploadedCrypted=false&revision=on&orderBy=descrip&orderAsc=true`,
    {
      cache: "no-cache",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.json();
}

function downloadPayslip(token, id, output) {
  return new Promise((resolve) => {
    let file = fs.createWriteStream(output);
    https.get(
      `https://mycecurity.com/node/v1/safes/146184/downloads/${id}/mycecurity?token=${token}&type=org`,
      (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close(resolve);
        });
      }
    );
  });
}

function formatPayslipName(name) {
  return name.replace(
    /^(\d{4})\-?(\d{2}).+/,
    (_, p1, p2) => `Paie_${p1}-${p2}.pdf`
  );
}

export default async function fetchPayslip(email, password, { last }) {
  const { token, safes } = await login(email, password);

  let files = [];
  for (let safe of safes) {
    const { id } = safe;
    const { nodes } = await listRootFolder(token, id);

    async function iterate(nodes) {
      if (!nodes.items) {
        return;
      }
      for (let item of nodes.items) {
        const { cfecNodeId, fileData } = item;
        if (fileData) {
          files.push(item);
        } else {
          const items = await listItem(token, id, cfecNodeId);
          await iterate(items.nodes);
        }
      }
    }

    await iterate(nodes);
  }

  files.sort((fileA, fileB) => {
    const dateA = new Date(fileA.uploadDate).getTime();
    const dateB = new Date(fileB.uploadDate).getTime();

    return dateA - dateB ? 1 : -1;
  });

  const filesToDownload = files.slice(0, last);
  for (let { id, name } of filesToDownload) {
    const output = formatPayslipName(name);
    await downloadPayslip(token, id, output);
    console.log(`Downloaded ${output}`);
  }
}
