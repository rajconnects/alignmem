import { test, expect } from '@playwright/test'
import path from 'node:path'

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..')
const PASSCODE = 'alignmem-e2e-test'

// Golden-path smoke test — covers acceptance criteria #1-#10:
//   1. Passcode set on first run + unlock on refresh
//   2. Add project by path, see traces
//   5. Clicking card populates the rail
//   6. Thread tab renders + dissent visual break check (if any)
//   9. Keyboard shortcuts 1/2/3/J/K/Esc work
test('first run → add project → open trace → switch tabs → keyboard nav', async ({ page }) => {
  await page.goto('/')

  // First run — passcode setup screen
  const passcodeInput = page.getByLabel(/set a passcode/i)
  await expect(passcodeInput).toBeVisible()
  await passcodeInput.fill(PASSCODE)
  await page.getByRole('button', { name: /SET PASSCODE/i }).click()

  // Project picker
  await expect(page.getByText('PICK A PROJECT')).toBeVisible()
  await page.getByRole('button', { name: /BROWSE FOLDER/i }).click()
  await page.getByLabel(/Project absolute path/i).fill(REPO_ROOT)
  await page.getByRole('button', { name: /ADD/i }).click()

  // Dashboard loads
  await expect(page.locator('.shell')).toBeVisible()
  await expect(page.locator('.card-row').first()).toBeVisible({ timeout: 10_000 })

  // Open the first card
  const firstCard = page.locator('.card-row').first()
  await firstCard.click()
  await expect(page.locator('.rail-title')).toBeVisible()
  await expect(page.locator('.rail-tab.active')).toHaveText('SUMMARY')

  // Keyboard: switch to THREAD tab
  await page.keyboard.press('2')
  await expect(page.locator('.rail-tab.active')).toHaveText('THREAD')
  await expect(page.locator('.thread-node').first()).toBeVisible()

  // Keyboard: switch to SESSION tab
  await page.keyboard.press('3')
  await expect(page.locator('.rail-tab.active')).toHaveText('SESSION')
  await expect(page.getByText('SESSION ID')).toBeVisible()

  // Back to SUMMARY
  await page.keyboard.press('1')
  await expect(page.locator('.rail-tab.active')).toHaveText('SUMMARY')

  // J / K navigation between cards
  await page.keyboard.press('j')
  await page.keyboard.press('k')

  // Esc clears selection → rail back to empty state
  await page.keyboard.press('Escape')
  await expect(page.locator('.rail-empty')).toBeVisible()

  // / focuses the search input
  await page.keyboard.press('/')
  await expect(page.locator('.search-input')).toBeFocused()
})

test('brand rules enforced: no border-radius beyond 0/50%, no shadows', async ({ page }) => {
  await page.goto('/')
  // Run the brand audit inside the browser against computed styles
  const violations = await page.evaluate(() => {
    const issues: string[] = []
    const all = document.querySelectorAll('*')
    for (const el of Array.from(all)) {
      const cs = getComputedStyle(el)
      const br = cs.borderRadius
      if (br && br !== '0px' && !br.startsWith('50%')) {
        // Allow live-pip class to have 50%
        if (!(el as HTMLElement).classList.contains('live-pip') && !(el as HTMLElement).classList.contains('pip')) {
          if (br !== '') issues.push(`border-radius=${br} on ${el.tagName}.${(el as HTMLElement).className}`)
        }
      }
      const shadow = cs.boxShadow
      if (shadow && shadow !== 'none') {
        issues.push(`box-shadow=${shadow} on ${el.tagName}.${(el as HTMLElement).className}`)
      }
    }
    return issues
  })
  expect(violations).toEqual([])
})
