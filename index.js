import express from "express"
const app = express();
const port = 3000;
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import {exec} from "node:child_process";
import {promisify} from "node:util";
import axios from 'axios'
import fs from 'node:fs';
import path from 'node:path';
const __dirname = import.meta.dirname;

app.get("/imagine", async (req,res) => {
  const {prompt} = req.query;
  if(!prompt) return res.status(400).json({error: 'Missing prompt query.'})
  let browser = null;
  if(process.env['NODE_ENV'] === "development1") {
    const {stdout: chPath} = await promisify(exec)("which chromium");

    browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: chPath.trim()
    })
  } else {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
        executablePath: await chromium.executablePath()
    })
  }
  try {
  const page = await browser.newPage();
  await page.setViewport({
    width: 380,
    height:800
  })
  await page.goto("https://magicstudio.com/ai-art-generator/", {
    waitUntil: "networkidle2"
  })
  const input = await page.$('textarea[id="description"]');
    await input.click({count: 3});
    await input.type(prompt)
  

  const btn = await page.$(`div#prompt-box > div button`)
  await btn.click()
  
await page.waitForSelector('img[alt="generated image"]')
  const imgEl = await page.evaluate(`document.querySelector('img[alt="generated image"]').getAttribute('src')`);
  
  await browser.close();
  const {data: imageBuffer} = await axios.get(imgEl, {responseType: 'arraybuffer'});

  const _64 = Buffer.from(imageBuffer).toString('base64');

  const iPath = path.join(__dirname, `cache/${Date.now()}.jpg`);

  fs.writeFileSync(iPath, _64, 'base64');

  res.set('Content-Type', 'image/jpeg');
  res.sendFile(iPath, ()=> {
    fs.unlinkSync(iPath)
  })
  } catch(e) {
    console.error(e)
  }
});

app.listen(port, () => console.log("Running"))