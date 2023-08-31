#!/usr/bin/env node

import { Command } from "commander";
import download from "./src/download.js";

const program = new Command();
program
  .requiredOption("-e, --email <email>")
  .requiredOption("-p, --password <password>")
  .option("-l, --last <n>", "Download last N payslips", 1)
  .description("Download latest Payslip");

program.parse(process.argv);

const { email, password, last } = program.opts();
download(email, password, { last });
