# Changelog

## 0.4.18

- **The session popup no longer adds its own display-settings control.** The shell already
  prints a 视图选项 button on the tree's own header; the plugin keeps that one untouched and
  only docks the panel it opens beside the popup. The second button and the click hijack added
  in 0.4.17 are gone.
- **Switching sessions stopped stalling.** The popup's mutation observer used to run a
  document-wide query on every DOM mutation while it was open, and switching sessions
  re-renders the host's list in a burst of childList changes. It now inspects only the nodes
  that were added, and the dock itself is throttled to one pass per frame and reuses the
  panel and flyouts it has already moved.
- Smoke grows two contracts: the tree is dressed with the new-session button only, and the
  shell's own view-options control is left alone. 29 checks.## 0.4.17
- The session popup no longer carries a search box of its own. It queried the host for message history and showed hits that could not be opened from inside the popup, which read as a dead entry point next to the tree's real search. The tree keeps the host's own search box; the plugin's second one is gone from the popup, the left dock, the CSS and the copy.
- New session is a small button dressed onto the relocated tree's own header row, beside the host's search box, instead of a full-width row above it. Session display settings is the same kind of button next to it. Both are re-inserted whenever the host re-renders its list, and the tree's own 视图选项 trigger is intercepted so it opens the plugin's panel rather than the shell's.
- Session display settings is owned by the plugin. The shell's own panel is portal-anchored to a trigger parked in the hidden sidebar, so opening it put the panel back at the left edge of the window - the "original page" that kept appearing, including when only the archive filter was picked. The plugin opens the shell's menu briefly, reads the chosen item, clicks it there and lets the shell close its own menu, then shows its own panel; while it is open the shell's panel is hidden by attribute, so nothing of the shell's is left on screen while the filter still applies to the shell's list.
- Smoke contract: 29 checks. Three new contracts cover the removed search box, the dressed tree buttons and the hidden shell panel.

## 0.4.16
- The bar is placed again when the window resizes. Centre and right mode measure the row and write `left` inline, but that effect only re-ran when the number of carried buttons changed, so resizing the window left the row where it was. It now also listens for `resize` (16 ms debounce) and re-places on every width change.
- The model-picker takeover is gone, because another plugin now owns that popup. Removed with it: the four provider switches, the decoration pass (`applyModelMenus` / `syncModelOptions` / `providerKey` / `modelGroups`), the capture-phase `pointerdown` press interception and click swallowing, `MODEL_CSS`, the `.uidy-opts-*` rows drawn inside the picker, the `menuId === "model"` popup section, the settings-page section, and the three `modelMenu` / `modelHeading` / `modelRow` selector-registry entries. The picker is left exactly as the host renders it.
- Smoke contract: 26 checks. "click swallowing is scoped to decorated providers" is replaced by "the model picker is left to its owner" (no decoration, no swallowed presses, no settings rows) and "the bar is placed again when the window resizes".

## 0.4.15
- Each of the three seats (top bar, overlay, settings page) now renders inside its own error boundary. `apply` was guarded, but that only covered registration: a throw during render used to propagate into the host slot and could blank the title bar, which a user can only escape by resetting the profile. A failed seat now logs one line and renders nothing.
- Rules that reach into other plugins' own classes (`.dsh-sam-*`, `.mneme-*`) are gated on `html[data-uidy-on]`, which is set when the plugin applies and removed when it unloads. They used to compete at `!important` weight for as long as the page lived, even after this plugin was gone.
- The defensive base class in the boundary also keeps the module loadable under the smoke harness, which stubs React without `Component`.
- Smoke contract: 25 checks, adding "every seat renders inside an error boundary" and "rules touching other plugins are gated on our own attribute".

## 0.4.14
- Folding a provider is cheap now. One press used to rewrite `data-uidy-hidden` on every row of the whole list (about forty display-affecting attributes), persist the record with `JSON.stringify` + `localStorage.setItem` inside the handler, and notify our own subscribers. Now:
  - the fold is a single attribute on the group (`[data-uidy-group][data-uidy-collapsed="true"]` hides its rows), so the browser does one style pass instead of forty;
  - only the pressed provider is decorated (`applyModelMenus(onlyKey)`);
  - the write is deferred ~400 ms and flushed on `pagehide` / `beforeunload` / tab hide, so closing the window still keeps the last click;
  - `prefsStore.bump()` is no longer called from the press path: nothing in our own UI shows a provider's fold state;
  - a menu whose switches and group count did not change is skipped outright (`data-uidy-dsig`), which reduces the observer's wake-ups during streaming output to a string comparison.

## 0.4.13
- The selected row is finally the same colour as the rest of the shell. It used `--dsw-alias-interactive-bg-selected`, which this host theme does not define, so every "highlighted" row silently rendered as a hard-coded blue while the theme's brand is near-white. It now uses `--dsw-alias-interactive-bg-active` (measured `rgba(255,255,255,0.14)`).
- The model picker's option rows follow the same rule: no `✓`, the row itself is highlighted (`.uidy-opts-row-on`).
- The custom list is 288px *outside* now. It was content-box, so the panel actually measured 297.3px and every row sat 9px past it.
- Panels borrow the host's menu material (`--dsw-menu-surface-fill`, `--dsw-menu-backdrop-filter`, `--dsw-radius-*`, `--dsh-glass-drop`) instead of a hand-written border, background and shadow.
- Keyboard: `:focus-visible` rings on menu rows, 打开 buttons, settings rows and model options; before this only two controls had any focus feedback.
- Unload actually restores the host: the frame-track observer is disconnected, `--uidy-rb-track` and the three `<html>` variables are removed, hidden right panes are revealed, the docked view-options panel is released with `releaseViewOptions()`, and the sheet injected into the shell's shadow root is removed along with its marker.
- `uninstall.ps1` also undoes the profile-wide hmr override now (`-KeepHmr` opts out) and prints the one-line localStorage cleanup.
- Click swallowing only applies inside a decorated provider group, so a foreign `_heading` element no longer loses its click.
- Smoke contract: 23 checks, including "selection uses a token that exists" and "unload restores everything the plugin took over".

## 0.4.11
- Reverting my own overreach: the 对话 tab is back. The strip switches the VIEW inside the conversation panel, while the title bar 对话 button switches the PANEL - two different controls. Hiding the tab meant anyone who opened 轨迹 had no way back to the chat view.
- No view tab is pruned or hidden any more; the strip is plain visible and scrollable. The smoke contract now fails if any rule targets a view tab again.

## 0.4.10
- The bar no longer keeps buttons for plugins you removed. Panel liveness compared package names by substring, so "billion-context" counted as proof that the removed usage panel (`bill`) was still installed. It now compares whole name segments (`dsh-bill` ends with `-bill`), so an uninstalled plugin takes its button with it.
- The conversation view strip is back: 轨迹 / 上下文 / 画廊 / 账本 were unreachable because the strip was hidden as a whole to remove the duplicate 对话 tab. Only that one tab is tagged and hidden now; the rest stays clickable.
- Two regression checks in the boot smoke guard both: the strip must never be hidden wholesale again, and liveness must not fall back to substring matching. 18 checks total.

## 0.4.9
- Hot reload, for real this time. `@deepseek-ai/dsh-hmr` is installed in the desktop profile and the `hmr` entry supplied by the base bundle is overridden by id in `cordis.patch.yml` (`disabled: false`, `root: [".", "<workspace>/dsh-plugins"]`). Editing `client.js` reloads in about two seconds; only assembly changes (package name, `dsh.profile.bundles`) still need a restart.
- `scripts/enable-hmr.ps1`: idempotent helper that writes that override between markers, backs up the patch file first, and can undo (`-Disable`) or preview (`-DryRun`). It refuses to run when the `dsh-hmr` package is missing and prints the exact install command instead.
- README and ROADMAP no longer say a restart is always required; both separate code edits (hot) from assembly edits (restart).
- Published file list now includes `scripts/`, `docs/`, `smoke/` and this changelog — an npm install previously shipped no install script at all.

## 0.4.8
- Safe mode. `?uidy=off` (or `localStorage["dsh-ui-tidy.safeMode"]="off"`) stops the plugin completely and leaves the shipped UI untouched; `?uidy=minimal` keeps the top bar but leaves the shipped sidebar in place; `?uidy=on` clears both flags and retries.
- Consecutive failures no longer look like a broken shell. Activation is counted; after two failures the plugin drops its own takeover (minimal mode) and says so in the console with the exact command to retry. A clean activation resets the counter.
- `install.ps1` verifies before writing: `node --check` plus the boot smoke must pass, otherwise nothing is registered (`-SkipVerify` to bypass). The smoke suite grew to 16 checks, including safe-mode behaviour.
- README documents how to get back to a working UI when the top bar does not appear, without editing any JSON.
- `scripts/restore.ps1` lists the profile backups taken by install/uninstall and rolls one back (`-Latest`, `-Name`, `-DryRun`); the current file is copied aside first, so the rollback is itself reversible.

## 0.4.7
- `scripts/install.ps1` / `scripts/uninstall.ps1`: register or remove the plugin by touching exactly two fields (`dependencies` and `dsh.profile.bundles`), with a `package.json` backup first and `-DryRun` to preview. Nothing else is modified.
- Activation is wrapped in a try/catch: a seat that throws now logs `[ui-tidy] activation failed` and leaves the shell running instead of taking the whole entry down.
- README gets a three-command quick start and an honest note that editing `client.js` needs a host restart (the old text promised a reload, which cannot work because the bundle URL carries a boot-time revision).
- `docs/ROADMAP.md`: what actually keeps other people out (install, restart, silent breakage, jargon) and what we deliberately will not build.

## 0.4.6
- Publishing: the CI recipe lives in `ci/github-actions.yml` instead of `.github/workflows/ci.yml`, because the release token has no `workflow` scope and one such file rejects the whole push. README documents how to enable it.

## 0.4.5
- Settings → 顶栏界面 gains 备份与恢复: export every setting to the clipboard, paste one back, or reset to defaults. Code-level rollback stays with git.

## 0.4.4
- One tooltip: buttons no longer carry both a native `title` and a custom bubble. The bubble flips inward at the window edges instead of being clipped.
- One popover positioner (`popoverLeft(anchor, width)`) shared by the menu and the hover bubble, so right-alignment plus clamping is computed once.
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
