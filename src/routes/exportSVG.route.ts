import { Router } from 'express';
import { ExportSVGController } from '@/controllers/exportSVG.controller';
import { Routes } from '@interfaces/routes.interface';

export class ExportSVGRoute implements Routes {
  public path = '/export-svg';
  public router = Router();
  public exportSvg = new ExportSVGController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}`, this.exportSvg.exportSVG);
  }
}
