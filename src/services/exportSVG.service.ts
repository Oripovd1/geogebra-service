import { Service } from 'typedi';
import { HttpException } from '@exceptions/httpException';
import * as path from 'path';
const GGBPlotter = require(path.resolve(__dirname, '../geogebra')).GGBPlotter;

@Service()
export class exportSVGService {
  public async exportSvg(data: { data: string }): Promise<string> {
    if (!data.data) throw new HttpException(400, 'Invalid data provided');

    const plotter = new GGBPlotter({ ggb: 'local' });

    await plotter.setGGB64(data);
    await plotter.exportSVG();
    const svg64 = await plotter.exportSVG64();
    await plotter.release();

    return svg64;
  }
}
