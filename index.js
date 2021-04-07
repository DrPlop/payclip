#!/usr/bin/env node

const program = require("commander");

const download = require("./src/download");

program
  .requiredOption("-e, --email <email>")
  .requiredOption("-p, --password <password>")
  .option("-l, --last <n>", "Download last N payslips", 1)
  .description("Download latest Payslip");

program.parse(process.argv);

const { email, password, last } = program.opts();
download(email, password, { last });
