import * as puppeteer from 'puppeteer';
import { EventEmitter } from 'events';
import { GGBOptions } from './GGBOptions';
import * as path from 'path';

let window: any;
const DEBUG = true;

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export class GGBPlotter {
  releasedEmitter: EventEmitter;
  id: string | number;
  poolOpts: GGBOptions;
  pagePromise: Promise<puppeteer.Page>;
  browser: puppeteer.Browser;

  constructor(id?: number | GGBOptions, page?: puppeteer.Page, releasedEmitter?: EventEmitter) {
    if (id) {
      if (typeof id == 'number') {
        this.id = id;
      } else {
        this.poolOpts = { plotters: 3, ggb: 'local', ...id };
        this.id = Math.random().toString(32).substring(2);
      }
    } else {
      this.poolOpts = { plotters: 3, ggb: 'local' };
      this.id = Math.random().toString(32).substring(2);
    }
    this.pagePromise = this.createPage(page);
    this.releasedEmitter = releasedEmitter;
  }
  private async createPage(page: puppeteer.Page): Promise<puppeteer.Page> {
    if (page) {
      return page;
    } else {
      this.browser = await puppeteer.launch({
        dumpio: true,
        devtools: false,
      });
      const newPage = await this.browser.newPage();
      newPage.on('console', msg => console.log('PAGE LOG:', msg.text()));
      let url;
      if (this.poolOpts.ggb === 'local') {
        const dir = path.resolve(__dirname, '../../public/geogebra-math-apps-bundle/Geogebra/HTML5/5.0/GeoGebra.html');
        url = 'file://' + dir;
      } else {
        url = 'https://www.geogebra.org/classic';
      }
      await newPage.goto(url, { waitUntil: 'networkidle2' });
      DEBUG && console.log(url + ' has been loaded');
      await newPage.waitForFunction('window.ggbApplet!=null');
      DEBUG && console.log('ggbApplet is ready');
      // await newPage.evaluate('window.ggbApplet.evalCommand(\'SetPerspective("G")\\nShowGrid(false)\')');
      // DEBUG && console.log('SetPerspective->G, showGrid->false');
      return newPage;
    }
  }
  async ready() {
    return this.pagePromise;
  }
  async evalGGBScript(ggbScript: string[], width?: number, height?: number) {
    const page = await this.pagePromise;
    // 53 px accounts for the toolbar which cannot be removed in geogebra app mode

    await page.setViewport({ width: width || 600, height: (height || 400) + 53 });

    if (ggbScript && ggbScript.length) {
      await page.evaluate(x => window.ggbApplet.evalCommand(x), ggbScript.join('\n'));
    }
  }
  async setGGB64(ggbData: string) {
    const page = await this.pagePromise;
    await page.evaluate(x => {
      window.ggbApplet.setBase64(x);
    }, ggbData);
  }
  async exportPNG(alpha?: boolean, dpi?: number): Promise<Buffer> {
    const pdf64 = await this.exportPNG64(alpha, dpi);
    const raw = pdf64.replace('data:image/png;base64,', '');
    return Buffer.from(raw, 'base64');
  }
  async exportPNG64(alpha?: boolean, dpi?: number): Promise<string> {
    const page = await this.pagePromise;
    const out = await page.evaluate((alpha, dpi) => window.ggbApplet.getPNGBase64(1, alpha, dpi || 300), alpha, dpi);
    return 'data:image/png;base64,' + out;
  }
  async exportSVG(): Promise<string> {
    const page = await this.pagePromise;
    const bodyHandle = await page.$('body');
    await page.evaluate(body => {
      const app = window.ggbApplet;
      app.setSize(1150, 500);
      app.setAxesVisible(false, false);
      app.setGridVisible(false);
      app.exportSVG(svg => {
        const div = body.querySelector('#svg_renderer');
        div.innerHTML = svg;
      });
    }, bodyHandle);
    return new Promise(resolve => setTimeout(() => resolve('SVG has been exported'), 100));
  }
  async exportSVG64(): Promise<string> {
    const page = await this.pagePromise;
    const bodyHandle = await page.$('body');
    const svg = await this.exportSVG();
    return page.evaluate(body => {
      const div = body.querySelector('#svg_renderer');
      const svgElement = div.querySelector('svg');
      return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgElement.outerHTML);
    }, bodyHandle);
  }
  async exportPDF(): Promise<Buffer> {
    const pdf64 = await this.exportPDF64();
    const raw = pdf64.replace('data:application/pdf;base64,', '');
    return Buffer.from(raw, 'base64');
  }
  async exportPDF64(): Promise<string> {
    const page = await this.pagePromise;
    return page.evaluate(() => window.ggbApplet.exportPDF());
  }
  async exportGGB(): Promise<Buffer> {
    const raw = await this.exportGGB64();
    return Buffer.from(raw, 'base64');
  }
  async exportGGB64(): Promise<string> {
    const page = await this.pagePromise;
    return page.evaluate(() => window.ggbApplet.getBase64());
  }
  async export(format: string): Promise<string | Buffer> {
    switch (format) {
      case 'pngalpha':
        return this.exportPNG(true);
      case 'pdf':
        return this.exportPDF();
      case 'svg':
        return this.exportSVG();
      case 'ggb':
        return this.exportGGB();
      default:
        return this.exportPNG();
    }
  }
  async export64(format: string): Promise<string> {
    switch (format) {
      case 'pngalpha':
        return this.exportPNG64(true);
      case 'pdf':
        return this.exportPDF64();
      case 'svg':
        return this.exportSVG64();
      case 'ggb':
        return this.exportGGB64();
      default:
        return this.exportPNG64();
    }
  }
  async reset() {
    const page = await this.pagePromise;
    await page.evaluate(() => window.ggbApplet.reset());
  }
  async exec(ggbAppletProperty: string, args?: any[]) {
    const page = await this.pagePromise;
    await page.evaluate(
      (prop, argz) => {
        const property = window.ggbApplet[prop];
        if (typeof property === 'function') {
          return property.apply(window.ggbApplet, argz);
        } else {
          return property;
        }
      },
      ggbAppletProperty,
      args,
    );
  }
  async release() {
    const page = await this.pagePromise;
    await page.evaluate(() => window.ggbApplet.reset());
    if (this.releasedEmitter) {
      // notify to the cue that a worker has been released and must be returned to the pool
      this.releasedEmitter.emit('released', this);
    }
    if (this.browser) {
      await page.close();
      await this.browser.close();
    }
  }
}
