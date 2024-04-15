import { NextFunction, Request, Response } from 'express';
import { Container } from 'typedi';
import { exportSVGService } from '@/services/exportSVG.service';

export class ExportSVGController {
  public exportService = Container.get(exportSVGService);

  public exportSVG = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload: { data: string } = req.body;
      const result: string = await this.exportService.exportSvg(payload);

      res.status(200).json({ data: result, message: 'created' });
    } catch (error) {
      next(error);
    }
  };
}
