import { App } from '@/app';
import { AuthRoute } from '@routes/auth.route';
import { UserRoute } from '@routes/users.route';
import { ValidateEnv } from '@utils/validateEnv';
import { ExportSVGRoute } from './routes/exportSVG.route';

ValidateEnv();

const app = new App([new UserRoute(), new AuthRoute(), new ExportSVGRoute()]);

app.listen();
