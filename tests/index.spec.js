const { test, expect } = require('@playwright/test');

const PAGE = 'index.html';

test.beforeEach(async ({ page, context }) => {
  await context.clearCookies();
  await page.goto(PAGE);
  // Clear localStorage to ensure clean state.
  await page.evaluate(() => localStorage.clear());
  await page.goto(PAGE);
});

// ---------------------------------------------------------------------------
// Page load.
// ---------------------------------------------------------------------------

test.describe('page load', () => {
  test('renders title and subtitle', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Lagoon Command Generator');
    await expect(page.locator('.subtitle')).toBeVisible();
  });

  test('renders all tag filter buttons', async ({ page }) => {
    const tags = ['auth', 'setup', 'variables', 'deploy', 'ssh', 'data', 'users'];
    for (const tag of tags) {
      await expect(page.locator(`.tag-filter-btn[data-tag="${tag}"]`)).toBeVisible();
    }
  });

  test('renders command groups', async ({ page }) => {
    const groups = ['auth', 'setup', 'variables', 'deploy', 'ssh', 'data', 'users'];
    for (const group of groups) {
      await expect(page.locator(`.cmd-group[data-group="${group}"]`)).toBeVisible();
    }
  });

  test('shows correct total command count', async ({ page }) => {
    const countText = await page.locator('#count-bar').textContent();
    expect(countText).toMatch(/Showing all \d+ commands/);
  });

  test('displays version in footer', async ({ page }) => {
    const version = page.locator('#app-version');
    await expect(version).toBeVisible();
    await expect(version).toHaveText('development');
  });
});

// ---------------------------------------------------------------------------
// Settings panel.
// ---------------------------------------------------------------------------

test.describe('settings panel', () => {
  test('settings are always visible', async ({ page }) => {
    await expect(page.locator('#s-project')).toBeVisible();
    await expect(page.locator('#s-github-repo')).toBeVisible();
    await expect(page.locator('#s-prod-branch')).toBeVisible();
  });

  test('updates commands when project name is set', async ({ page }) => {

    await page.locator('#s-project').fill('acme');
    // Check a command card contains the project name.
    const cmdWithProject = page.locator('.cmd-code', { hasText: 'acme' }).first();
    await expect(cmdWithProject).toContainText('acme');
  });

  test('updates SSH key preview when pattern changes', async ({ page }) => {

    await page.locator('#s-project').fill('test-proj');
    await page.locator('#s-custom-ssh').check();
    await page.locator('#s-ssh-pattern').fill('/keys/{PROJECT}_key');
    await expect(page.locator('#s-ssh-preview')).toContainText('/keys/test-proj_key');
  });

  test('PR prefix field exists and defaults to pr-', async ({ page }) => {

    const input = page.locator('#s-pr-prefix');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'pr-');
  });
});

// ---------------------------------------------------------------------------
// Settings persistence via localStorage.
// ---------------------------------------------------------------------------

test.describe('localStorage persistence', () => {
  test('persists project name across reloads after save', async ({ page }) => {

    await page.locator('#s-project').fill('persisted');
    await page.locator('#save-settings-btn').click();
    await page.goto(PAGE);

    await expect(page.locator('#s-project')).toHaveValue('persisted');
  });

  test('persists prod branch across reloads after save', async ({ page }) => {

    await page.locator('#s-project').fill('test');
    await page.locator('#s-prod-branch').fill('production');
    await page.locator('#save-settings-btn').click();
    await page.goto(PAGE);

    await expect(page.locator('#s-prod-branch')).toHaveValue('production');
  });
});

// ---------------------------------------------------------------------------
// Reset to defaults.
// ---------------------------------------------------------------------------

test.describe('reset to defaults', () => {
  test('clears all settings when confirmed', async ({ page }) => {

    await page.locator('#s-project').fill('will-be-cleared');
    await page.locator('#s-prod-branch').fill('release');
    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('#reset-defaults-btn').click();
    await expect(page.locator('#s-project')).toHaveValue('');
    await expect(page.locator('#s-prod-branch')).toHaveValue('');
  });

  test('keeps settings when dismissed', async ({ page }) => {

    await page.locator('#s-project').fill('keep-me');
    page.on('dialog', (dialog) => dialog.dismiss());
    await page.locator('#reset-defaults-btn').click();
    await expect(page.locator('#s-project')).toHaveValue('keep-me');
  });
});

// ---------------------------------------------------------------------------
// URL query parameters.
// ---------------------------------------------------------------------------

test.describe('URL query parameters', () => {
  test('pre-fills project from URL', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto(PAGE + '?project=url-proj');
    await expect(page.locator('#s-project')).toHaveValue('url-proj');
  });

  test('pre-fills multiple settings from URL', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto(PAGE + '?project=mp&prod_branch=live&dev_branch=staging&github_repo=org/mp');
    await expect(page.locator('#s-project')).toHaveValue('mp');
    await expect(page.locator('#s-prod-branch')).toHaveValue('live');
    await expect(page.locator('#s-dev-branch')).toHaveValue('staging');
    await expect(page.locator('#s-github-repo')).toHaveValue('org/mp');
  });

  test('pre-filters by tag from URL', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto(PAGE + '?tag=ssh');
    await expect(page.locator('.tag-filter-btn[data-tag="ssh"]')).toHaveClass(/active/);
    const countText = await page.locator('#count-bar').textContent();
    expect(countText).not.toContain('all');
  });

  test('pre-fills search from URL', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto(PAGE + '?search=deploy');
    await expect(page.locator('#search')).toHaveValue('deploy');
  });
});

// ---------------------------------------------------------------------------
// Search filtering.
// ---------------------------------------------------------------------------

test.describe('search filtering', () => {
  test('filters commands by text', async ({ page }) => {
    await page.locator('#search').fill('login');
    const countText = await page.locator('#count-bar').textContent();
    expect(countText).toMatch(/Showing \d+ of \d+ commands/);
    // At least one card should be visible.
    const visible = await page.locator('.cmd-card:not(.hidden)').count();
    expect(visible).toBeGreaterThan(0);
  });

  test('shows no results for garbage query', async ({ page }) => {
    await page.locator('#search').fill('xyznonexistent999');
    await expect(page.locator('#no-results')).not.toHaveClass(/hidden/);
  });

  test('clear button resets search', async ({ page }) => {
    await page.locator('#search').fill('login');
    await page.locator('#search-clear').click();
    await expect(page.locator('#search')).toHaveValue('');
    const countText = await page.locator('#count-bar').textContent();
    expect(countText).toContain('all');
  });
});

// ---------------------------------------------------------------------------
// Tag filtering.
// ---------------------------------------------------------------------------

test.describe('tag filtering', () => {
  test('clicking a tag filter activates it', async ({ page }) => {
    const btn = page.locator('.tag-filter-btn[data-tag="auth"]');
    await btn.click();
    await expect(btn).toHaveClass(/active/);
    // Only auth commands should be visible.
    const visible = page.locator('.cmd-card:not(.hidden)');
    const count = await visible.count();
    expect(count).toBeGreaterThan(0);
    // All visible cards should have the auth tag.
    for (let i = 0; i < count; i++) {
      await expect(visible.nth(i).locator('.tag-pill[data-tag="auth"]')).toBeVisible();
    }
  });

  test('clicking the same tag filter deactivates it', async ({ page }) => {
    const btn = page.locator('.tag-filter-btn[data-tag="auth"]');
    await btn.click();
    await btn.click();
    await expect(btn).not.toHaveClass(/active/);
    const countText = await page.locator('#count-bar').textContent();
    expect(countText).toContain('all');
  });

  test('clicking a tag pill on a card activates that filter', async ({ page }) => {
    const pill = page.locator('.tag-pill[data-tag="ssh"]').first();
    await pill.click();
    await expect(page.locator('.tag-filter-btn[data-tag="ssh"]')).toHaveClass(/active/);
  });
});

// ---------------------------------------------------------------------------
// Export variables block.
// ---------------------------------------------------------------------------
// Copy button.
// ---------------------------------------------------------------------------

test.describe('copy button', () => {
  test('shows "Copied!" feedback on click', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const btn = page.locator('.cmd-code-wrap .copy-btn').first();
    await btn.click();
    await expect(btn).toContainText('Copied!');
    await expect(btn).toHaveClass(/copied/);
  });
});

// ---------------------------------------------------------------------------
// Share link.
// ---------------------------------------------------------------------------

test.describe('share link', () => {
  test('copies a URL to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.locator('#s-project').fill('share-test');
    await page.locator('#share-link-btn').click();
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('project=share-test');
  });
});

// ---------------------------------------------------------------------------
// Deploy environment selector.
// ---------------------------------------------------------------------------

test.describe('deploy environment selector', () => {
  test('defaults to production branch', async ({ page }) => {

    await page.locator('#s-project').fill('proj');
    await page.locator('#s-prod-branch').fill('main');
    await page.locator('.tag-filter-btn[data-tag="deploy"]').click();
    const firstDeployCode = page.locator('.cmd-group[data-group="deploy"] .cmd-code').first();
    const text = await firstDeployCode.textContent();
    expect(text).toContain('main');
  });

  test('switches to dev branch', async ({ page }) => {

    await page.locator('#s-project').fill('proj');
    await page.locator('#s-dev-branch').fill('develop');
    await page.locator('.tag-filter-btn[data-tag="deploy"]').click();
    const deployGroup = page.locator('.cmd-group[data-group="deploy"]');
    const firstCard = deployGroup.locator('.cmd-card').first();
    await firstCard.locator('.env-btn', { hasText: 'Development' }).click();
    const code = await firstCard.locator('.cmd-code').textContent();
    expect(code).toContain('develop');
  });

  test('switches to custom branch', async ({ page }) => {
    await page.locator('.tag-filter-btn[data-tag="deploy"]').click();
    const deployGroup = page.locator('.cmd-group[data-group="deploy"]');
    const firstCard = deployGroup.locator('.cmd-card').first();
    await firstCard.locator('.env-btn', { hasText: 'Custom' }).click();
    await firstCard.locator('.env-custom-input').fill('release/1.0');
    const code = await firstCard.locator('.cmd-code').textContent();
    expect(code).toContain('release/1.0');
  });

  test('custom input is disabled when not selected', async ({ page }) => {
    await page.locator('.tag-filter-btn[data-tag="deploy"]').click();
    const deployGroup = page.locator('.cmd-group[data-group="deploy"]');
    const firstCard = deployGroup.locator('.cmd-card').first();
    await expect(firstCard.locator('.env-custom-input')).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// DB override checkbox.
// ---------------------------------------------------------------------------

test.describe('DB override checkbox', () => {
  test('changes command to override variant', async ({ page }) => {
    await page.locator('.tag-filter-btn[data-tag="deploy"]').click();
    const deployGroup = page.locator('.cmd-group[data-group="deploy"]');
    // "Deploy branch" card has the DB override checkbox.
    const deployCard = deployGroup.locator('.cmd-card').first();
    const codeBefore = await deployCard.locator('.cmd-code').textContent();
    expect(codeBefore).toContain('lagoon deploy branch');
    await deployCard.locator('input[type="checkbox"][id^="db-override-"]').check();
    const codeAfter = await deployCard.locator('.cmd-code').textContent();
    expect(codeAfter).toContain('VORTEX_PROVISION_OVERRIDE_DB');
    expect(codeAfter).toContain('lagoon deploy branch');
  });

  test('unchecking reverts to normal command', async ({ page }) => {
    await page.locator('.tag-filter-btn[data-tag="deploy"]').click();
    const deployGroup = page.locator('.cmd-group[data-group="deploy"]');
    const deployCard = deployGroup.locator('.cmd-card').first();
    const cb = deployCard.locator('input[type="checkbox"][id^="db-override-"]');
    await cb.check();
    await cb.uncheck();
    const code = await deployCard.locator('.cmd-code').textContent();
    expect(code).toContain('lagoon deploy branch');
  });
});

// ---------------------------------------------------------------------------
// SSH environment selector with PR option.
// ---------------------------------------------------------------------------

test.describe('SSH environment selector', () => {
  test('shows both Lagoon CLI and direct SSH commands', async ({ page }) => {

    await page.locator('#s-project').fill('proj');
    await page.locator('#s-prod-branch').fill('main');
    await page.locator('.tag-filter-btn[data-tag="ssh"]').click();
    const sshCard = page.locator('.cmd-group[data-group="ssh"] .cmd-card').first();
    const lagoonCode = await sshCard.locator('.cmd-code').first().textContent();
    expect(lagoonCode).toContain('lagoon ssh -p proj -e main');
    const directCode = await sshCard.locator('.cmd-code-alt').textContent();
    expect(directCode).toContain('proj-main@ssh.lagoon');
  });

  test('switches to PR with number input', async ({ page }) => {

    await page.locator('#s-project').fill('proj');
    await page.locator('.tag-filter-btn[data-tag="ssh"]').click();
    const sshCard = page.locator('.cmd-group[data-group="ssh"] .cmd-card').first();
    await sshCard.locator('.env-btn:text-is("PR")').click();
    await sshCard.locator('.env-custom-input:not([disabled])').fill('55');
    const lagoonCode = await sshCard.locator('.cmd-code').first().textContent();
    expect(lagoonCode).toContain('lagoon ssh -p proj -e pr-55');
    const directCode = await sshCard.locator('.cmd-code-alt').textContent();
    expect(directCode).toContain('pr-55@ssh.lagoon');
  });

  test('uses custom PR prefix from settings', async ({ page }) => {

    await page.locator('#s-pr-prefix').fill('pull-');
    await page.locator('#s-project').fill('proj');
    await page.locator('.tag-filter-btn[data-tag="ssh"]').click();
    const sshCard = page.locator('.cmd-group[data-group="ssh"] .cmd-card').first();
    await sshCard.locator('.env-btn:text-is("PR")').click();
    await sshCard.locator('.env-custom-input:not([disabled])').fill('10');
    const directCode = await sshCard.locator('.cmd-code-alt').textContent();
    expect(directCode).toContain('pull-10@ssh.lagoon');
  });
});

// ---------------------------------------------------------------------------
// Setup commands inline controls.
// ---------------------------------------------------------------------------

test.describe('setup inline controls', () => {
  test('branch checkboxes update the regex command', async ({ page }) => {
    await page.locator('.tag-filter-btn[data-tag="setup"]').click();
    const branchCard = page.locator('.cmd-card', { hasText: 'Set deployable branches' });
    const code = branchCard.locator('.cmd-code');
    // Default has main checked - verify it appears in the regex.
    const text = await code.textContent();
    expect(text).toContain('main');
  });

  test('env limit control updates the command', async ({ page }) => {
    await page.locator('.tag-filter-btn[data-tag="setup"]').click();
    const limitCard = page.locator('.cmd-card', { hasText: 'Set environment limit' });
    const code = limitCard.locator('.cmd-code');
    // Default is 4.
    await expect(code).toContainText('-L 4');
    await limitCard.locator('.inline-number').fill('8');
    await expect(code).toContainText('-L 8');
  });

  test('PR deploy toggle updates the command', async ({ page }) => {
    await page.locator('.tag-filter-btn[data-tag="setup"]').click();
    const prCard = page.locator('.cmd-card', { hasText: 'Set PR deployments' });
    const code = prCard.locator('.cmd-code');
    // Default is true.
    await expect(code).toContainText('-m true');
    await prCard.locator('input[type="checkbox"]').uncheck();
    await expect(code).toContainText('-m false');
  });

  test('auto-idle toggle updates the command', async ({ page }) => {
    await page.locator('.tag-filter-btn[data-tag="setup"]').click();
    const idleCard = page.locator('.cmd-card', { hasText: 'Set auto-idle' });
    const code = idleCard.locator('.cmd-code');
    // Default is 1 (enabled).
    await expect(code).toContainText('--autoIdle 1');
    await idleCard.locator('input[type="checkbox"]').uncheck();
    await expect(code).toContainText('--autoIdle 0');
  });
});

// ---------------------------------------------------------------------------
// Group visibility.
// ---------------------------------------------------------------------------

test.describe('group visibility', () => {
  test('hides empty groups when filtering', async ({ page }) => {
    await page.locator('.tag-filter-btn[data-tag="auth"]').click();
    // Non-auth groups should be hidden.
    await expect(page.locator('.cmd-group[data-group="deploy"]')).toHaveClass(/hidden/);
    await expect(page.locator('.cmd-group[data-group="auth"]')).not.toHaveClass(/hidden/);
  });
});

// ---------------------------------------------------------------------------
// Project autocomplete.
// ---------------------------------------------------------------------------

test.describe('project autocomplete', () => {
  test('saves project and shows it in autocomplete after clicking Save', async ({ page }) => {
    await page.locator('#s-project').fill('saved-proj');
    await page.locator('#s-prod-branch').fill('release');
    await page.locator('#save-settings-btn').click();
    await page.locator('#s-project').fill('');
    await page.locator('#s-project').focus();
    await expect(page.locator('#project-dropdown')).toHaveClass(/open/);
    await expect(page.locator('.project-item')).toContainText('saved-proj');
  });

  test('selecting a project loads its settings', async ({ page }) => {
    await page.locator('#s-project').fill('autocomplete-test');
    await page.locator('#s-prod-branch').fill('production');
    await page.locator('#s-dev-branch').fill('staging');
    await page.locator('#s-github-repo').fill('org/test');
    await page.locator('#save-settings-btn').click();
    await page.locator('#s-project').fill('');
    await page.locator('#s-project').focus();
    await page.locator('.project-item', { hasText: 'autocomplete-test' }).click();
    await expect(page.locator('#s-project')).toHaveValue('autocomplete-test');
    await expect(page.locator('#s-prod-branch')).toHaveValue('production');
    await expect(page.locator('#s-dev-branch')).toHaveValue('staging');
    await expect(page.locator('#s-github-repo')).toHaveValue('org/test');
  });

  test('filters autocomplete by typed text', async ({ page }) => {
    await page.locator('#s-project').fill('alpha');
    await page.locator('#save-settings-btn').click();
    await page.locator('#s-project').fill('beta');
    await page.locator('#save-settings-btn').click();
    await page.locator('#s-project').fill('al');
    await expect(page.locator('#project-dropdown')).toHaveClass(/open/);
    await expect(page.locator('.project-item')).toHaveCount(1);
    await expect(page.locator('.project-item')).toContainText('alpha');
  });

  test('remove button deletes a saved project', async ({ page }) => {
    await page.locator('#s-project').fill('to-remove');
    await page.locator('#save-settings-btn').click();
    await page.locator('#s-project').fill('');
    await page.locator('#s-project').focus();
    await page.locator('.project-item', { hasText: 'to-remove' }).locator('.project-item-remove').click();
    const items = page.locator('.project-item', { hasText: 'to-remove' });
    await expect(items).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Global settings dialog.
// ---------------------------------------------------------------------------

test.describe('global settings dialog', () => {
  test('opens and closes with cog button', async ({ page }) => {
    await page.locator('#global-settings-btn').click();
    await expect(page.locator('#global-settings-modal')).toHaveClass(/open/);
    await page.locator('#global-close-btn').click();
    await expect(page.locator('#global-settings-modal')).not.toHaveClass(/open/);
  });

  test('closes with cancel button', async ({ page }) => {
    await page.locator('#global-settings-btn').click();
    await page.locator('#global-cancel-btn').click();
    await expect(page.locator('#global-settings-modal')).not.toHaveClass(/open/);
  });

  test('closes with escape key', async ({ page }) => {
    await page.locator('#global-settings-btn').click();
    await expect(page.locator('#global-settings-modal')).toHaveClass(/open/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#global-settings-modal')).not.toHaveClass(/open/);
  });

  test('closes when clicking overlay', async ({ page }) => {
    await page.locator('#global-settings-btn').click();
    await page.locator('#global-settings-modal').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('#global-settings-modal')).not.toHaveClass(/open/);
  });

  test('pre-fills default values', async ({ page }) => {
    await page.locator('#global-settings-btn').click();
    await expect(page.locator('#g-prod-branch')).toHaveValue('main');
    await expect(page.locator('#g-dev-branch')).toHaveValue('develop');
    await expect(page.locator('#g-pr-prefix')).toHaveValue('pr-');
  });

  test('saves global defaults and updates project placeholders', async ({ page }) => {
    await page.locator('#global-settings-btn').click();
    await page.locator('#g-prod-branch').fill('release');
    await page.locator('#g-dev-branch').fill('staging');
    await page.locator('#global-save-btn').click();
    await expect(page.locator('#s-prod-branch')).toHaveAttribute('placeholder', 'release');
    await expect(page.locator('#s-dev-branch')).toHaveAttribute('placeholder', 'staging');
  });
});

// ---------------------------------------------------------------------------
// Custom SSH key toggle.
// ---------------------------------------------------------------------------

test.describe('custom SSH key', () => {
  test('SSH key fields hidden by default', async ({ page }) => {
    await expect(page.locator('#ssh-custom-block')).not.toBeVisible();
  });

  test('checking toggle shows SSH key fields', async ({ page }) => {
    await page.locator('#s-custom-ssh').check();
    await expect(page.locator('#ssh-custom-block')).toBeVisible();
    await expect(page.locator('#s-ssh-pattern')).toBeVisible();
  });

  test('unchecking hides SSH key fields again', async ({ page }) => {
    await page.locator('#s-custom-ssh').check();
    await page.locator('#s-custom-ssh').uncheck();
    await expect(page.locator('#ssh-custom-block')).not.toBeVisible();
  });

  test('login command omits SSH key when custom SSH is disabled', async ({ page }) => {
    const loginCode = page.locator('.cmd-card', { hasText: 'Login to Lagoon' }).locator('.cmd-code');
    await expect(loginCode).toContainText('lagoon login');
    await expect(loginCode).not.toContainText('-i');
  });

  test('login command includes SSH key when custom SSH is enabled', async ({ page }) => {
    await page.locator('#s-custom-ssh').check();
    await page.locator('#s-project').fill('test');
    const loginCode = page.locator('.cmd-card', { hasText: 'Login to Lagoon' }).locator('.cmd-code');
    await expect(loginCode).toContainText('-i');
  });

  test('SSH key pattern input shows default value instead of being empty', async ({ page }) => {
    await page.locator('#s-custom-ssh').check();
    const patternInput = page.locator('#s-ssh-pattern');
    await expect(patternInput).toHaveValue(/deploy_plus_\{PROJECT\}_lagoon_at_acme_com/);
  });

  test('ssh-keygen command reflects the SSH key pattern', async ({ page }) => {
    await page.locator('#s-custom-ssh').check();
    await page.locator('#s-project').fill('my-proj');
    await page.locator('#ssh-custom-block .collapsible-toggle').click();
    const keygen = page.locator('#ssh-keygen-code');
    await expect(keygen).toContainText('deploy_plus_my-proj_lagoon_at_acme_com');
  });

  test('ssh-keygen command updates when SSH key pattern changes', async ({ page }) => {
    await page.locator('#s-custom-ssh').check();
    await page.locator('#s-project').fill('my-proj');
    await page.locator('#s-ssh-pattern').fill('/custom/{PROJECT}_key');
    await page.locator('#ssh-custom-block .collapsible-toggle').click();
    const keygen = page.locator('#ssh-keygen-code');
    await expect(keygen).toContainText('-f "/custom/my-proj_key"');
    await expect(keygen).toContainText('-C "my-proj_key"');
  });
});

// ---------------------------------------------------------------------------
// Collapsible toggle.
// ---------------------------------------------------------------------------

test.describe('collapsible toggle', () => {
  test('SSH keygen collapsible opens and closes', async ({ page }) => {
    await page.locator('#s-custom-ssh').check();
    const toggle = page.locator('#ssh-custom-block .collapsible-toggle');
    const body = page.locator('#ssh-custom-block .collapsible-body');
    await expect(body).not.toBeVisible();
    await toggle.click();
    await expect(body).toBeVisible();
    await toggle.click();
    await expect(body).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Save button.
// ---------------------------------------------------------------------------

test.describe('save button', () => {
  test('shows Saved! feedback', async ({ page }) => {
    await page.locator('#s-project').fill('feedback-test');
    await page.locator('#save-settings-btn').click();
    await expect(page.locator('#save-settings-btn')).toContainText('Saved!');
  });

  test('does not save when project name is empty', async ({ page }) => {
    await page.locator('#s-prod-branch').fill('custom-branch');
    await page.locator('#save-settings-btn').click();
    await page.goto(PAGE);
    // Should revert to global default, not 'custom-branch'.
    await expect(page.locator('#s-prod-branch')).not.toHaveValue('custom-branch');
  });
});

// ---------------------------------------------------------------------------
// Custom command.
// ---------------------------------------------------------------------------

test.describe('custom command', () => {
  test('renders with project placeholder', async ({ page }) => {
    const card = page.locator('.cmd-card', { hasText: 'Custom command' });
    await expect(card).toBeVisible();
    await expect(card.locator('.cmd-code')).toContainText('lagoon');
  });

  test('updates command when typing custom command', async ({ page }) => {
    await page.locator('#s-project').fill('myproj');
    const card = page.locator('.cmd-card', { hasText: 'Custom command' });
    await card.locator('input[placeholder="list environments"]').fill('list deployments');
    await expect(card.locator('.cmd-code')).toContainText('lagoon list deployments -p myproj');
  });
});

// ---------------------------------------------------------------------------
// Auto-idle environment selector (no production option).
// ---------------------------------------------------------------------------

test.describe('auto-idle environment selector', () => {
  test('does not show production button', async ({ page }) => {
    await page.locator('.tag-filter-btn[data-tag="setup"]').click();
    const card = page.locator('.cmd-card', { hasText: 'Set auto-idle' });
    await expect(card.locator('.env-btn', { hasText: 'Production' })).toHaveCount(0);
  });

  test('defaults to development', async ({ page }) => {
    await page.locator('#s-project').fill('proj');
    await page.locator('#s-dev-branch').fill('dev');
    await page.locator('.tag-filter-btn[data-tag="setup"]').click();
    const card = page.locator('.cmd-card', { hasText: 'Set auto-idle' });
    await expect(card.locator('.cmd-code')).toContainText('-e dev');
  });
});

// ---------------------------------------------------------------------------
// Data commands environment selector.
// ---------------------------------------------------------------------------

test.describe('data commands', () => {
  test('Copy DB from environment has env selector with PR option', async ({ page }) => {
    await page.locator('.tag-filter-btn[data-tag="data"]').click();
    const card = page.locator('.cmd-card', { hasText: 'Copy DB from environment' });
    await expect(card.locator('.env-btn', { hasText: 'Production' })).toBeVisible();
    await expect(card.locator('.env-btn:text-is("PR")')).toBeVisible();
  });

  test('switching to dev updates rsync command', async ({ page }) => {
    await page.locator('#s-project').fill('proj');
    await page.locator('#s-dev-branch').fill('dev');
    await page.locator('.tag-filter-btn[data-tag="data"]').click();
    const card = page.locator('.cmd-card', { hasText: 'Copy DB from environment' });
    await card.locator('.env-btn', { hasText: 'Development' }).click();
    await expect(card.locator('.cmd-code')).toContainText('proj-dev@ssh.lagoon');
  });
});

// ---------------------------------------------------------------------------
// DB override with variable set/remove.
// ---------------------------------------------------------------------------

test.describe('DB override variable commands', () => {
  test('includes add and delete variable commands', async ({ page }) => {
    await page.locator('#s-project').fill('proj');
    await page.locator('.tag-filter-btn[data-tag="deploy"]').click();
    const card = page.locator('.cmd-card', { hasText: 'Deploy branch' });
    await card.locator('input[type="checkbox"][id^="db-override-"]').check();
    const code = await card.locator('.cmd-code').textContent();
    expect(code).toContain('lagoon add variable');
    expect(code).toContain('VORTEX_PROVISION_OVERRIDE_DB');
    expect(code).toContain('lagoon delete variable');
    expect(code).toContain('lagoon deploy branch');
  });
});

// ---------------------------------------------------------------------------
// Config import/export.
// ---------------------------------------------------------------------------

test.describe('config import/export', () => {
  test('export contains saved project data', async ({ page }) => {
    await page.locator('#s-project').fill('export-test');
    await page.locator('#save-settings-btn').click();
    await page.locator('#global-settings-btn').click();
    // Open the import/export collapsible.
    await page.locator('.collapsible-toggle', { hasText: 'Import / Export' }).click();
    const exportText = await page.locator('#config-export').textContent();
    expect(exportText).toContain('export-test');
  });

  test('import restores settings', async ({ page, context }) => {
    const config = JSON.stringify({
      project: 'imported-proj',
      prodBranch: 'live',
      devBranch: 'stage',
      projects: { 'imported-proj': { prodBranch: 'live', devBranch: 'stage' } }
    });
    await page.locator('#global-settings-btn').click();
    await page.locator('.collapsible-toggle', { hasText: 'Import / Export' }).click();
    await page.locator('#config-import').fill(config);
    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('#config-import-btn').click();
    // Page reloads after import.
    await page.waitForLoadState('load');
    await expect(page.locator('#s-project')).toHaveValue('imported-proj');
    await expect(page.locator('#s-prod-branch')).toHaveValue('live');
  });
});

// ---------------------------------------------------------------------------
// Clear all data.
// ---------------------------------------------------------------------------

test.describe('clear all data', () => {
  test('wipe button disabled until checkbox checked', async ({ page }) => {
    await page.locator('#global-settings-btn').click();
    await page.locator('.collapsible-toggle', { hasText: 'Clear All Data' }).click();
    await expect(page.locator('#global-wipe-btn')).toBeDisabled();
    await page.locator('#g-wipe-confirm').check();
    await expect(page.locator('#global-wipe-btn')).not.toBeDisabled();
  });

  test('wipe clears all data and reloads', async ({ page }) => {
    await page.locator('#s-project').fill('wipe-test');
    await page.locator('#save-settings-btn').click();
    await page.locator('#global-settings-btn').click();
    await page.locator('.collapsible-toggle', { hasText: 'Clear All Data' }).click();
    await page.locator('#g-wipe-confirm').check();
    await page.locator('#global-wipe-btn').click();
    await page.waitForLoadState('load');
    await expect(page.locator('#s-project')).toHaveValue('');
  });
});

// ---------------------------------------------------------------------------
// Global settings SSH preview refresh.
// ---------------------------------------------------------------------------

test.describe('global settings refresh', () => {
  test('saving global SSH pattern updates resolved SSH preview', async ({ page }) => {
    await page.locator('#s-custom-ssh').check();
    await page.locator('#s-project').fill('my-proj');
    await expect(page.locator('#s-ssh-preview')).toContainText('my-proj');
    await page.locator('#global-settings-btn').click();
    await page.locator('#g-ssh-pattern').fill('/custom/path/{PROJECT}_key');
    await page.locator('#global-save-btn').click();
    await expect(page.locator('#s-ssh-preview')).toContainText('/custom/path/my-proj_key');
  });

  test('saving global prod branch updates placeholder', async ({ page }) => {
    await page.locator('#global-settings-btn').click();
    await page.locator('#g-prod-branch').fill('production');
    await page.locator('#global-save-btn').click();
    await expect(page.locator('#s-prod-branch')).toHaveAttribute('placeholder', 'production');
  });

  test('SSH preview copy icon visible when project is set', async ({ page }) => {
    await page.locator('#s-custom-ssh').check();
    await expect(page.locator('#ssh-preview-copy-icon')).not.toBeVisible();
    await page.locator('#s-project').fill('test-proj');
    await expect(page.locator('#ssh-preview-copy-icon')).toBeVisible();
  });
});
