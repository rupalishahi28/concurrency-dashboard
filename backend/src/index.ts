import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();

app.use(cors({
  origin: 'http://localhost:3000'
}));

const delay = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

app.get('/user', async (req: Request, res: Response) => {
    await delay(1000);
    res.json({id: 1, name: 'John Doe'});
});

app.get('/metrics', async (req: Request, res: Response) => {
    await delay(2000);
    // res.json({risk: 42, score: 88});
    throw new Error('metrics failed!');
});

app.get('/notifications', async (req: Request, res: Response) => {
    await delay(1500);
    res.json({id: 1, msg: 'Alert!'});
});

app.get('/dashboard', async (req: Request, res: Response) => {
    console.time('dashboard');

    const [userResult, metricsResult, notificationsResult] = await Promise.allSettled([fetch('http://localhost:3001/user')
        .then(r => r.json()), fetch('http://localhost:3001/metrics')
        .then(r => r.json()), fetch('http://localhost:3001/notifications')
        .then(r => r.json())])

    // const user = await fetch('http://localhost:3001/user')
    //     .then(r => r.json());

    // const metrics = await fetch('http://localhost:3001/metrics')
    //     .then(r => r.json());

    // const notifications = await fetch('http://localhost:3001/notifications')
    //     .then(r => r.json());

    const user = userResult.status === 'fulfilled' ? userResult.value : null;
    const metrics = metricsResult.status === 'fulfilled' ? metricsResult.value : null;
    const notifications = notificationsResult.status === 'fulfilled' ? notificationsResult.value : null;

    console.timeEnd('dashboard');

    res.json({ user, metrics, notifications });
});

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});