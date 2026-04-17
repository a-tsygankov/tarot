import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:3000/tarot/',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: [
        {
            command: 'npx wrangler dev --port 8787',
            cwd: '../workers/tarot-api',
            url: 'http://127.0.0.1:8787/api/meta/version',
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
        {
            command: 'npx wrangler dev --port 8788',
            cwd: '../workers/tts-assets',
            url: 'http://127.0.0.1:8788/piper/manifest.json',
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
        {
            command: 'npx vite --port 3000 --strictPort',
            cwd: '.',
            env: {
                PLAYWRIGHT: '1',
            },
            url: 'http://localhost:3000/tarot/',
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
    ],
});
