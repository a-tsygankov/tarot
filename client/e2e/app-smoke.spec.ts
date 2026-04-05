import { expect, test } from '@playwright/test';

test('home screen loads and can enter a spread', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Tarot Oracle/i);
    await expect(page.locator('tarot-app')).toBeVisible();
    await expect(page.locator('tarot-app .oracle-title')).toContainText('Tarot Oracle');
    await expect(page.locator('tarot-app .spread-choice')).toHaveCount(3);

    await page.locator('tarot-app .spread-choice').first().click();

    await expect(page.locator('card-spread')).toBeVisible();
    await expect(page.locator('card-spread .display-text')).toContainText('1-Card Spread');
    await expect(page.locator('card-spread .dim-text')).toContainText('Tap a card to draw');

    await page.locator('card-spread .card-slot').click();

    await expect(page.locator('card-spread .btn.btn-primary')).toContainText('Get Reading');
});

test('single-card reading completes and shows follow-up actions', async ({ page }) => {
    await page.goto('/');

    await page.locator('tarot-app .spread-choice').first().click();
    await expect(page.locator('card-spread')).toBeVisible();

    await page.locator('card-spread .card-slot').click();
    await page.locator('card-spread .topic-chip', { hasText: 'Love' }).click();
    await page.locator('card-spread .btn.btn-primary', { hasText: 'Get Reading' }).click();

    await expect(page.locator('reading-display')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('reading-display .card-reading')).toHaveCount(1, { timeout: 60_000 });
    await expect(page.locator('reading-display .overall-title')).toContainText('Overall Reading');
    await expect(page.locator('reading-display .overall-text')).not.toBeEmpty();
    await expect(page.locator('reading-display .btn.btn-primary')).toContainText('Ask Follow-up');
    await expect(page.locator('reading-display .btn', { hasText: 'Listen' })).toBeVisible();
});

test('changing language or tone refreshes the reading in place', async ({ page }) => {
    let readingRequestCount = 0;

    await page.route('**/api/reading', async route => {
        readingRequestCount += 1;
        const body = readingRequestCount === 1
            ? {
                reading: {
                    cards: [{ position: 'Insight', name: 'The Fool', reading: 'First description in English.' }],
                    overall: 'First overall prediction.',
                },
                contextUpdate: 'digest-1',
                userContextDelta: { name: null, gender: null, birthdate: null, location: null, traits: {} },
                provider: 'mock',
                model: 'mock-1',
            }
            : {
                reading: {
                    cards: [{ position: 'Insight', name: 'The Fool', reading: 'Updated description after settings change.' }],
                    overall: 'Updated overall prediction.',
                },
                contextUpdate: 'digest-2',
                userContextDelta: { name: null, gender: null, birthdate: null, location: null, traits: {} },
                provider: 'mock',
                model: 'mock-2',
            };

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(body),
        });
    });

    await page.goto('/');
    await page.locator('tarot-app .spread-choice').first().click();
    await page.locator('card-spread .card-slot').click();
    await page.locator('card-spread .btn.btn-primary', { hasText: 'Get Reading' }).click();

    await expect(page.locator('reading-display .overall-text')).toContainText('First overall prediction.');
    await expect(page.locator('reading-display .card-reading-text')).toContainText('First description in English.');

    await page.locator('tarot-app .bottom-bar .btn.btn-ghost', { hasText: '⚙' }).click();
    await page.locator('settings-panel .option-btn', { hasText: 'Русский' }).click();
    await page.locator('settings-panel .option-btn', { hasText: 'Gentle' }).click();

    await expect(page.locator('reading-display .overall-text')).toContainText('Updated overall prediction.');
    await expect(page.locator('reading-display .card-reading-text')).toContainText('Updated description after settings change.');
    await expect.poll(() => readingRequestCount).toBe(3);
});
