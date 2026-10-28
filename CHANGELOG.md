# Changelog

## 0.4.3
- One stacking ladder (`--uidy-z-rail/bar/menu/flyout/tooltip`) instead of z-index literals spread over CSS and JS; the cluster lift now measures the shell's own menu strip (`readHostMenuZ() - 10`) so it can never paint over 应用/编辑 again.
- Boot smoke test shipped in `smoke/smoke-boot.mjs`: loads `client.js` with a stub DOM, runs `apply()`, and asserts the three seats register. CI runs it, so a change that would stop the plugin activating fails before it reaches the shell.

## 0.4.2
- One versioned state record (`dsh-ui-tidy.state.v3`) replaces six separate localStorage keys; the old keys are still read once for migration and left untouched so a downgrade keeps working.
- One selector registry with hash + structural candidates per hook (panel rows, account trigger, task chip, view-options panel, model menu); a missed candidate degrades that feature instead of breaking silently.
- Read-only diagnostics block in Settings → 顶栏界面: hook coverage, discovered pages, current order, copyable snapshot.

## 0.4.1
- Long-lived pages (no sidebar row of their own, e.g. 账单) are only rendered while their plugin is present in `__DSH_BOOT__.entries`; a click that does not switch panels records the page as dead and drops the button.

## 0.4.0
- Removed the temporary diagnostic and command-channel effects.

## 0.3.9
- The view-options panel is docked from a live popup rect on `pointerdown` as well, so the first frame is already in place.

## 0.3.8
- The flyout dock never re-anchors shell chrome (anything with a shadow root, or the app menu host); moved nodes are restored with their original inline styles.

## 0.3.7
- The view-options panel is docked in the frame it appears (MutationObserver, before paint) and stays docked after the popup closes.

## 0.3.6
- Clicking a provider name folds only that provider's models: `pointerdown` / `mousedown` are swallowed in the capture phase so the host popover no longer closes.

## 0.3.5
- A provider heading click schedules the re-decoration pass; before that the arrow flipped while the rows stayed put.

## 0.3.4
- `pressElement()` re-entry cap stops the stack overflow that took the whole plugin entry down on reload.
- The shell is masked from the first module line until the frame is dressed (4s safety release), so the shipped UI no longer flashes.

## 0.3.x
- Session popup and the shell's sort/display panel coexist side by side; the plugin's own duplicate opener was removed.
- Hover names for every title-bar button; background-task chip shortened with its full text kept in the tooltip.

## 0.2.0
- First packaged release: icon title bar discovered from the live UI, settings page, folded model picker.

## 0.4.4

- One tooltip per button: the cluster dropped its native `title`, keeping the
  styled bubble on `data-name` (no more OS tooltip after the CSS one).
- The bubble now leans left or right on the outermost buttons so it cannot run
  off the window edge.
- Popup placement moved into `popoverLeft(anchor, width)`, one function that
  both right-aligns under its button and clamps to the window.

## 0.4.5

- Settings gained 备份与恢复: export the whole state record to the clipboard,
  paste it back to restore, or reset to defaults. Code rollback stays in git;
  this is the settings half of one.

## 0.4.6

- CI 配方从 `.github/workflows/ci.yml` 移到 `ci/github-actions.yml`：当前访问码没有 workflow 权限，放在 workflows 目录会让 push 被 GitHub 拒收。README 说明了启用方式。
