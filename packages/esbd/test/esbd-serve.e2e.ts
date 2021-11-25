import fsp from 'fs/promises';

import test from './serve-test';

test('serves content from entry point', async ({ page, port, startServer }) => {
  await startServer({
    config: { jsxRuntime: 'automatic' },
    files: [
      // 0
      {
        'src/index.html': `
          <!DOCTYPE html>
          <html>
            <head>
              <script defer type="module" src="./entry.tsx"></script>
            </head>
            <body><div id='root'></div></body>
          </html>
        `,
        'src/entry.tsx': `
          import ReactDOM from 'react-dom';
          import { App } from './app';
          ReactDOM.render(<App />, document.getElementById('root'));
        `,
        'src/app.tsx': `
          export function App() {
            return <div>Hello world</div>;
          }
        `,
      },
    ],
  });

  await page.goto(`http://127.0.0.1:${port}/will-rewrite-to-index`);
  await test.expect(page).toHaveURL(`http://127.0.0.1:${port}/will-rewrite-to-index`);

  await test.expect(page.locator('body')).toContainText('Hello world');
});

test('can disable index rewriting', async ({ page, port, startServer }) => {
  await startServer({
    disableRewrite: true,
    config: { jsxRuntime: 'automatic' },
    files: [
      // 0
      {
        'src/index.html': `
          <!DOCTYPE html>
          <html>
            <head>
              <script defer type="module" src="./entry.tsx"></script>
            </head>
            <body><div id='root'></div></body>
          </html>
        `,
        'src/entry.tsx': `
          import ReactDOM from 'react-dom';
          import { App } from './app';
          ReactDOM.render(<App />, document.getElementById('root'));
        `,
        'src/app.tsx': `
          export function App() {
            return <div>Hello world</div>;
          }
        `,
      },
    ],
  });

  await page.goto(`http://127.0.0.1:${port}/`);
  await test.expect(page).toHaveURL(`http://127.0.0.1:${port}/`);

  const response = await page.goto(`http://127.0.0.1:${port}/wont-rewrite-to-index`);
  test.expect(response.status()).toBe(404);
});

test('reloads page on file update if livereload enabled', async ({ page, port, startServer }) => {
  const { write } = await startServer({
    livereload: true,
    config: { jsxRuntime: 'automatic' },
    files: [
      // 0
      {
        'src/index.html': `
          <!DOCTYPE html>
          <html>
            <head>
              <script defer type="module" src="./entry.tsx"></script>
            </head>
            <body><div id='root'></div></body>
          </html>
        `,
        'src/entry.tsx': `
          import ReactDOM from 'react-dom';
          import { App } from './app';
          ReactDOM.render(<App />, document.getElementById('root'));
        `,
        'src/app.tsx': `
          export function App() {
            return <div>Hello world</div>;
          }
        `,
      },
      // 1
      {
        'src/app.tsx': `
          export function App() {
            return <div>Goodbye, cruel world</div>;
          }
        `,
      },
    ],
  });

  await page.goto(`http://127.0.0.1:${port}/`);

  await test.expect(page.locator('body')).toContainText('Hello world');

  await write(1);

  const msg = await page.waitForEvent('console');
  test.expect(msg.text()).toBe('esbuild-plugin-livereload: reloading...');

  await test.expect(page.locator('body')).toContainText('Goodbye, cruel world');
});

test('can serve from publicPath', async ({ page, port, startServer }) => {
  await startServer({
    config: {
      loader: { '.png': 'file' },
      jsxRuntime: 'automatic',
      publicPath: '/public',
    },
    files: [
      // 0
      {
        'src/index.html': `
          <!DOCTYPE html>
          <html>
            <head>
              <script defer type="module" src="./entry.tsx"></script>
            </head>
            <body><div id='root'></div></body>
          </html>
        `,
        'src/entry.tsx': `
          import ReactDOM from 'react-dom';
          import { App } from './app';
          ReactDOM.render(<App />, document.getElementById('root'));
        `,
        'src/app.tsx': `
          import cat from '../img/cat.png';
          export function App() {
            return <div>Hello world <img src={cat} /></div>;
          }
        `,
        'img/cat.png': await fsp.readFile(require.resolve('./fixture/cat.png')),
      },
    ],
  });

  await page.goto(`http://127.0.0.1:${port}/public/will-rewrite-to-index`);
  await test.expect(page).toHaveURL(`http://127.0.0.1:${port}/public/will-rewrite-to-index`);

  await page.waitForSelector('text=Hello world');
  test.expect(await page.screenshot()).toMatchSnapshot('publicPath-cat.png');

  await test.expect(page.locator('body')).toContainText('Hello world');
});

test('can disable index rewriting with publicPath', async ({ page, port, startServer }) => {
  await startServer({
    disableRewrite: true,
    config: {
      loader: { '.png': 'file' },
      jsxRuntime: 'automatic',
      publicPath: '/public',
    },
    files: [
      // 0
      {
        'src/index.html': `
          <!DOCTYPE html>
          <html>
            <head>
              <script defer type="module" src="./entry.tsx"></script>
            </head>
            <body><div id='root'></div></body>
          </html>
        `,
        'src/entry.tsx': `
          import ReactDOM from 'react-dom';
          import { App } from './app';
          ReactDOM.render(<App />, document.getElementById('root'));
        `,
        'src/app.tsx': `
          import cat from '../img/cat.png';
          export function App() {
            return <div>Hello world <img src={cat} /></div>;
          }
        `,
        'img/cat.png': await fsp.readFile(require.resolve('./fixture/cat.png')),
      },
    ],
  });

  await page.goto(`http://127.0.0.1:${port}/public`);
  await test.expect(page).toHaveURL(`http://127.0.0.1:${port}/public`);

  await page.waitForSelector('text=Hello world');
  test.expect(await page.screenshot()).toMatchSnapshot('publicPath-noRewrite-cat.png');

  const response = await page.goto(`http://127.0.0.1:${port}/public/wont-rewrite-to-index`);
  test.expect(response.status()).toBe(404);
});

test('can serve static files from a given directory', async ({ page, port, startServer }) => {
  await startServer({
    serveDir: __dirname + '/fixture',
    config: {
      loader: { '.png': 'file' },
      jsxRuntime: 'automatic',
      publicPath: '/public',
    },
    files: [
      // 0
      {
        'src/index.html': `
          <!DOCTYPE html>
          <html>
            <head>
              <script defer type="module" src="./entry.tsx"></script>
            </head>
            <body><div id='root'></div></body>
          </html>
        `,
        'src/entry.tsx': `
          import ReactDOM from 'react-dom';
          import { App } from './app';
          ReactDOM.render(<App />, document.getElementById('root'));
        `,
        'src/app.tsx': `
          export function App() {
            return <div>Hello world <img src='/public/cat.png' /></div>;
          }
        `,
      },
    ],
  });

  await page.goto(`http://127.0.0.1:${port}/public/will-rewrite-to-index`);
  await test.expect(page).toHaveURL(`http://127.0.0.1:${port}/public/will-rewrite-to-index`);

  await page.waitForSelector('text=Hello world');
  test.expect(await page.screenshot()).toMatchSnapshot('publicPath-serveDir-cat.png');

  await test.expect(page.locator('body')).toContainText('Hello world');
});
