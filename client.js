/**
 * Client half of dsh-ui-tidy.
 *
 * The shell already paints a Windows-style menu bar inside the page: an OPEN
 * shadow root on `<div data-windows-menu>` holding `<div role="menubar">` with
 * the 应用 and 编辑 buttons. That bar is plain DOM, so this plugin appends ONE
 * more top-level button (「视图」) to it and owns its popup — nothing new is
 * stacked on top of the window. The popup carries what a collapsed sidebar used
 * to hide: New session, the registered `main` panels, and the sidebar toggle.
 *
 *   <div data-windows-menu> ...... the appended 「视图」 button (shell chrome)
 *   shell.overlay ................ sidebar order CSS + the action popup, mounted
 *                                 once in the always-present frame layer
 *   conversation.header.leading .. fallback strip, rendered only when the shell
 *                                 menu host never shows up (other platforms)
 *
 * The shadow-root append is the one place this plugin writes DOM it does not
 * own; it is guarded and reversible (`bootstrapMenuButton`), and if it ever
 * fails the header strip takes over.
 */
window.__ModuleLoader__.load({
	id: "dsh-ui-tidy",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const react = require("react");
		const h = react.createElement;

		/* ---------------------------------------------------------------- *
		 * i18n
		 * ---------------------------------------------------------------- */

		const NS = "ui-tidy";
		const DICT = {
			zh: {
				"menu.view": "视图",
				"menu.panels": "面板",
				"menu.model": "模型",
				"menu.panelsTitle": "切换主面板",
				"menu.viewTitle": "会话与窗口视图",
				"menu.modelTitle": "模型列表显示方式",
				"item.newSession": "新会话",
				"item.toggleSidebar": "显示 / 隐藏侧栏",
				"group.panels": "面板",
				"panel.conversation": "对话",
				"panel.plugins": "插件",
				"panel.schedules": "自动化任务",
				"panel.novelWriter": "写作助手",
				"panel.skillExplorer": "技能中心",
				"panel.bill": "账单",
				"item.searchSessions": "搜索会话",
				"item.searchPlaceholder": "搜索历史消息（至少 2 个字）",
				"item.searchEmpty": "没有匹配的会话",
				"item.searchUnavailable": "搜索服务不可用",
				"item.rightbarOpen": "打开右侧栏",
				"item.rightbarClose": "关闭右侧栏",
				"item.pluginSettings": "插件 / 扩展设置",
				"item.addWorkspace": "添加工作区",
				"dock.close": "关闭会话列表",
				"dock.toggle": "会话列表",
				"group.sessions": "会话",
				"group.sidebarRows": "侧栏工具",
				"group.modelList": "模型列表",
				"model.collapse": "按供应商折叠",
				"model.merge": "合并同名供应商",
				"model.dedupe": "去掉重复模型",
				"model.collapseAll": "默认折叠全部供应商",
				"group.modelOptions": "显示选项",
				"menu.account": "账号",
				"menu.accountTitle": "账号与全局设置",
				"item.accountMenu": "账号菜单",
				"item.viewOptions": "会话视图选项",
				"group.sessionViews": "会话视图",
				"view.groupByWorkspace": "按工作区分组",
				"view.hideArchived": "隐藏已归档",
				"view.showPinnedFirst": "置顶会话排在前面",
				"view.compactRows": "紧凑行高",
				"group.maintenance": "维护",
				"item.reloadUi": "重新载入界面",
				"item.hideSidebar": "隐藏侧栏（本插件已接管）",
				"item.morePanels": "更多面板",
				"cluster.pages": "功能页面",
				"cluster.more": "更多页面",
				"row.active": "当前页面"
			},
			en: {
				"menu.view": "View",
				"menu.panels": "Panels",
				"menu.model": "Models",
				"menu.panelsTitle": "Switch main panel",
				"menu.viewTitle": "Session and window view",
				"menu.modelTitle": "Model list display",
				"item.newSession": "New session",
				"item.toggleSidebar": "Show / hide sidebar",
				"group.panels": "Panels",
				"panel.conversation": "Conversation",
				"panel.plugins": "Plugins",
				"panel.schedules": "Scheduled tasks",
				"panel.novelWriter": "Writing assistant",
				"panel.skillExplorer": "Skill center",
				"panel.bill": "Usage",
				"item.searchSessions": "Search sessions",
				"item.searchPlaceholder": "Search message history (2+ characters)",
				"item.searchEmpty": "No matching session",
				"item.searchUnavailable": "Search service unavailable",
				"item.rightbarOpen": "Open right sidebar",
				"item.rightbarClose": "Close right sidebar",
				"item.pluginSettings": "Plugin / extension settings",
				"item.addWorkspace": "Add workspace",
				"dock.close": "Close the session list",
				"dock.toggle": "Sessions",
				"group.sessions": "Sessions",
				"group.sidebarRows": "Sidebar tools",
				"group.modelList": "Model list",
				"model.collapse": "Collapse by provider",
				"model.merge": "Merge same-name providers",
				"model.dedupe": "Drop duplicate models",
				"model.collapseAll": "Fold every provider by default",
				"group.modelOptions": "Display options",
				"menu.account": "Account",
				"menu.accountTitle": "Account and global settings",
				"item.accountMenu": "Account menu",
				"item.viewOptions": "Session view options",
				"group.sessionViews": "Session view",
				"view.groupByWorkspace": "Group by workspace",
				"view.hideArchived": "Hide archived",
				"view.showPinnedFirst": "Pinned first",
				"view.compactRows": "Compact rows",
				"group.maintenance": "Maintenance",
				"item.reloadUi": "Reload interface",
				"item.hideSidebar": "Hide sidebar (handled by this plugin)",
				"item.morePanels": "More panels",
				"cluster.pages": "Pages",
				"cluster.more": "More pages",
				"row.active": "Current page"
			}
		};

		let boundTranslate = null;
		let fallbackDictionary = DICT.zh;

		/**
		 * Translate a UI-tidy key, falling back to the bundled dictionary.
		 * @param key - dictionary key.
		 * @returns the localized string.
		 */
		function tt(key) {
			if (boundTranslate) {
				try {
					const value = boundTranslate(key);
					if (value !== undefined && value !== null && value !== "" && value !== key) return value;
				} catch {
					/* fall through to the bundled dictionary */
				}
			}
			const value = fallbackDictionary[key];
			return value === undefined ? key : value;
		}

		/* ---------------------------------------------------------------- *
		 * context + services
		 * ---------------------------------------------------------------- */

		let rootCtx = null;

		/**
		 * Read an optional client service face.
		 * @param name - service key.
		 * @returns the face, or null when it is not mounted.
		 */
		function getService(name) {
			try {
				if (rootCtx !== null && typeof rootCtx.get === "function") return rootCtx.get(name) ?? null;
			} catch {
				/* absent: callers degrade */
			}
			return null;
		}

		/* ---------------------------------------------------------------- *
		 * tiny store shared by the shell button, the popup and the fallback strip
		 * ---------------------------------------------------------------- */

		/**
		 * Create a minimal observable store.
		 * @param initial - initial state.
		 * @returns `{ get, set, subscribe }`.
		 */
		function createStore(initial) {
			let state = initial;
			const listeners = new Set();
			return {
				get: () => state,
				set(patch) {
					state = { ...state, ...patch };
					for (const listener of [...listeners]) {
						try {
							listener();
						} catch (error) {
							console.warn("[ui-tidy] store listener failed:", error);
						}
					}
				},
				subscribe(listener) {
					listeners.add(listener);
					return () => listeners.delete(listener);
				}
			};
		}

		const store = createStore({ menu: null, anchor: null, fallback: false, toolRows: [], sessions: [], sessionsDock: false });

		/**
		 * Subscribe a component to the store.
		 * @returns the current state.
		 */
		function useStore() {
			const [, bump] = react.useReducer((n) => n + 1, 0);
			react.useEffect(() => store.subscribe(bump), []);
			return store.get();
		}

		/* ---------------------------------------------------------------- *
		 * actions
		 * ---------------------------------------------------------------- */

		const PANELS = [
			{ id: null, key: "panel.conversation" },
			{ id: "plugins", key: "panel.plugins" },
			{ id: "schedules", key: "panel.schedules" },
			{ id: "dsh-novel-writer", key: "panel.novelWriter" },
			{ id: "skill-explorer", key: "panel.skillExplorer" },
			{ id: "bill", key: "panel.bill" }
		];

		/**
		 * Start a new session.
		 * @returns {void}
		 */
		function startSession() {
			const workspace = getService("uiWorkspace");
			if (workspace === null || typeof workspace.startSession !== "function") return;
			try {
				workspace.startSession();
			} catch (error) {
				console.warn("[ui-tidy] startSession failed:", error);
			}
		}

		/**
		 * Toggle the sidebar.
		 * @returns {void}
		 */
		function toggleSidebar() {
			const layout = getService("layout");
			if (layout === null || typeof layout.toggleSidebar !== "function") return;
			try {
				layout.toggleSidebar();
			} catch (error) {
				console.warn("[ui-tidy] toggleSidebar failed:", error);
			}
		}

		/**
		 * Select a main panel.
		 * @param panelId - panel key, or null for the Conversation.
		 * @returns {void}
		 */
		function selectPanel(panelId) {
			const layout = getService("layout");
			if (layout === null || typeof layout.selectPanel !== "function") return;
			try {
				layout.selectPanel(panelId);
			} catch (error) {
				console.warn("[ui-tidy] selectPanel failed:", error);
			}
		}

		/**
		 * Read the active main-panel id.
		 * @returns the id, or null.
		 */
		function readActivePanelId() {
			const layout = getService("layout");
			const face = layout === null ? null : layout.panelInfo;
			if (face === null || face === undefined || typeof face.getSnapshot !== "function") return null;
			try {
				const snapshot = face.getSnapshot();
				if (snapshot === null || typeof snapshot !== "object") return null;
				return snapshot.activePanelId ?? snapshot.activeMainPanelId ?? null;
			} catch {
				return null;
			}
		}

		/**
		 * Track the active main-panel id.
		 * @returns the id, or null.
		 */
		function useActivePanelId() {
			const [value, setValue] = react.useState(readActivePanelId);
			react.useEffect(() => {
				const layout = getService("layout");
				const face = layout === null ? null : layout.panelInfo;
				if (face === null || face === undefined || typeof face.subscribe !== "function") return undefined;
				const sync = () => setValue(readActivePanelId());
				sync();
				const unsubscribe = face.subscribe(sync);
				return typeof unsubscribe === "function" ? unsubscribe : undefined;
			}, []);
			return value;
		}

		/**
		 * Open one session by id.
		 * @param sessionId - target session.
		 * @returns {void}
		 */
		function openSessionById(sessionId) {
			const workspace = getService("uiWorkspace");
			if (workspace === null || typeof workspace.openSession !== "function") return;
			try {
				workspace.openSession(sessionId);
			} catch (error) {
				console.warn("[ui-tidy] openSession failed:", error);
			}
		}

		/**
		 * Activate a sidebar row by its label.
		 *
		 * The rows belong to the host and to other plugins, so the menu does not
		 * reproduce their behaviour: it clicks the real row. That keeps whatever the
		 * row does — including another plugin's own handler — exactly as shipped.
		 * @param label - the row's text.
		 * @returns {void}
		 */

		/**
		 * The label a sidebar row is known by.
		 *
		 * `textContent` is the obvious source, but some rows carry a badge inside
		 * the button itself (mneme renders its entry count there), which turns
		 * "记忆" into "记忆1". Strip that trailing counter so the label, the menu
		 * and the lookup all agree.
		 * @param row - the row element.
		 * @returns the trimmed label.
		 */
		function readRowLabel(row) {
			const text = (row.textContent || "").trim().replace(/[ 0-9０-９]+$/u, "");
			if (text !== "") return text;
			const aria = (row.getAttribute("aria-label") || "").trim();
			if (aria !== "") return aria;
			return (row.getAttribute("title") || "").trim();
		}
		function clickToolRow(label) {
			const rows = [...document.querySelectorAll(TOOL_ROW_SELECTOR + ',[data-mneme-overlay-opener],[data-dsh-novelforge-entry]')];
			const row = rows.find((candidate) => readRowLabel(candidate) === label);
			if (row === undefined) return;
			try {
				row.click();
			} catch (error) {
				console.warn("[ui-tidy] row click failed:", error);
			}
		}

		/**
		 * The panel a live sidebar row belongs to.
		 *
		 * The rows carry no data attribute, but the React fiber above one holds
		 * the props of the component that rendered it, and those props include
		 * the panel key the row selects. Reading it there is what lets a newly
		 * installed plugin appear in the title bar without this file naming it.
		 * @param row - the row element.
		 * @returns the panel id, or null.
		 */
		function readRowPanelId(row) {
			const attribute = row.getAttribute("data-panel-id");
			if (attribute !== null && attribute !== "") return attribute;
			const key = Object.keys(row).find((name) => name.startsWith("__reactFiber$") || name.startsWith("__reactInternalInstance$"));
			if (key === undefined) return null;
			let fiber = row[key];
			for (let depth = 0; depth < 14 && fiber !== null && fiber !== undefined; depth += 1) {
				const props = fiber.memoizedProps;
				if (props !== null && typeof props === "object" && typeof props.id === "string" && typeof props.label === "string") return props.id;
				fiber = fiber.return;
			}
			return null;
		}

		/**
		 * The account the host is signed in as.
		 * @returns `{ avatar, name }`.
		 */
		function readAccountProfile() {
			const trigger = document.querySelector(ACCOUNT_TRIGGER_SELECTOR);
			if (trigger === null) return { avatar: null, name: tt("menu.account") };
			const image = trigger.querySelector("img");
			const label = trigger.querySelector('[class*="_label"]');
			const name = label === null ? "" : (label.textContent || "").trim();
			return { avatar: image === null ? null : image.getAttribute("src"), name: name === "" ? tt("menu.account") : name };
		}

		/* The host owns the account menu; these are its items, flattened. */
		const HOST_ACCOUNT_ITEMS = ["设置", "意见反馈", "退出登录"];

		/**
		 * Run one host account item by its own label.
		 *
		 * The item lives in the shell menu, which hangs off the sidebar footer this
		 * plugin takes off screen. The menu is opened for real and the item itself
		 * is clicked, so the shell keeps its own behaviour.
		 * @param label - the item label.
		 * @returns {void}
		 */
		function runHostAccountItem(label) {
			const trigger = document.querySelector(ACCOUNT_TRIGGER_SELECTOR);
			if (trigger === null) return;
			try {
				trigger.click();
			} catch (error) {
				return;
			}
			setTimeout(() => {
				const items = [...document.querySelectorAll('[role="menu"]:not(.uidy-menu) [role="menuitem"]')];
				const target = items.find((node) => (node.textContent || "").includes(label));
				if (target === undefined) return;
				try {
					target.click();
				} catch (error) {
					console.warn("[ui-tidy] account item failed:", error);
				}
			}, 150);
		}

		/**
		 * Add a workspace through the host directory picker.
		 *
		 * This is the shipped "add workspace" action: pick a directory, then register
		 * it as a workspace. Cancelling the picker does nothing.
		 * @returns {void}
		 */
		async function addWorkspace() {
			const workspaceUi = getService("uiWorkspace");
			const workspaces = getService("workspaces");
			if (workspaceUi === null || typeof workspaceUi.pickDirectory !== "function") return;
			try {
				const path = await workspaceUi.pickDirectory();
				if (path === null || path === undefined || path === "") return;
				if (workspaces !== null && typeof workspaces.create === "function") await workspaces.create({ path });
			} catch (error) {
				console.warn("[ui-tidy] addWorkspace failed:", error);
			}
		}

		/**
		 * Open the shipped account menu.
		 *
		 * The footer trigger is kept mounted (parked off-screen) so its own popup
		 * still works; clicking it is what opens the menu with all of the shell's
		 * own items and their handlers intact.
		 * @returns {void}
		 */
		function clickAccountTrigger() {
			const trigger = document.querySelector(ACCOUNT_TRIGGER_SELECTOR);
			if (trigger === null) {
				console.warn("[ui-tidy] account trigger not found");
				return;
			}
			try {
				trigger.click();
			} catch (error) {
				console.warn("[ui-tidy] account trigger click failed:", error);
			}
		}

		/**
		 * Open the right sidebar.
		 *
		 * The panel is never hidden: the installed plugins dock their own panes
		 * into the shipped `sidebar.right.pane.tab` seat, so this only opens it.
		 * @returns {void}
		 */
		function openRightbar() {
			const layout = getService("layout");
			if (layout === null || typeof layout.openRightbar !== "function") return;
			try {
				layout.openRightbar(true, false);
			} catch (error) {
				console.warn("[ui-tidy] openRightbar failed:", error);
			}
		}

		/* ---------------------------------------------------------------- *
		 * preferences (localStorage; the 视图 menu toggles them)
		 * ---------------------------------------------------------------- */

		const PREFS_KEY = "dsh-ui-tidy.prefs.v2";

		const MODEL_TOGGLES = [
			{ key: "collapse", label: "model.collapse" },
			{ key: "merge", label: "model.merge" },
			{ key: "dedupe", label: "model.dedupe" },
			{ key: "collapseAll", label: "model.collapseAll" }
		];

		/**
		 * Read the persisted preferences, tolerating absent or damaged storage.
		 * @returns the live preference object.
		 */
		function loadPrefs() {
			const base = { collapse: true, merge: true, dedupe: true, collapseAll: true, collapsed: {}, expanded: {} };
			try {
				const raw = window.localStorage.getItem(PREFS_KEY);
				if (raw === null) return base;
				const parsed = JSON.parse(raw);
				if (parsed === null || typeof parsed !== "object") return base;
				base.collapse = parsed.collapse !== false;
				base.merge = parsed.merge !== false;
				base.dedupe = parsed.dedupe !== false;
				base.collapseAll = parsed.collapseAll !== false;
				base.collapsed = parsed.collapsed !== null && typeof parsed.collapsed === "object" ? parsed.collapsed : {};
				base.expanded = parsed.expanded !== null && typeof parsed.expanded === "object" ? parsed.expanded : {};
			} catch (error) {
				console.warn("[ui-tidy] preferences unreadable:", error);
			}
			return base;
		}

		const prefs = loadPrefs();
		const prefsStore = createStore({ revision: 0 });

		/**
		 * Persist the preferences, then re-apply the model-menu decoration.
		 * @returns {void}
		 */
		function commitPrefs() {
			try {
				window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
			} catch (error) {
				console.warn("[ui-tidy] preferences not persisted:", error);
			}
			prefsStore.set({ revision: prefsStore.get().revision + 1 });
			applyModelMenus();
		}

		/**
		 * Re-render a component when a preference changes.
		 * @returns the current revision.
		 */
		function usePrefs() {
			const [revision, setRevision] = react.useState(prefsStore.get().revision);
			react.useEffect(() => prefsStore.subscribe(() => setRevision(prefsStore.get().revision)), []);
			return revision;
		}

		/* ---------------------------------------------------------------- *
		 * model-list enhancer: collapse per provider + merge duplicate groups
		 *
		 * The host renders the provider groups; this only sets attributes on the
		 * host's own nodes (never inserts or moves them) and lets CSS do the
		 * hiding, so a host re-render simply re-decorates.
		 * ---------------------------------------------------------------- */

		const MODEL_MENU_SELECTOR = '[role="menu"][class*="_groups"]';
		const MODEL_GROUP_ATTR = "data-uidy-group";
		const MODEL_HEADING_SELECTOR = '[class*="_heading"]';
		const MODEL_ROW_SELECTOR = '[class*="_modelOption"]';

		/**
		 * Reduce a provider heading to its merge key ("DeepSeek 账号" → "deepseek").
		 * @param title - heading text.
		 * @returns the key.
		 */
		function providerKey(title) {
			const compact = String(title).replace(/[\s·:：]+/g, "");
			const stripped = compact.replace(/(账号|帐号|官方|账户|account|official)$/i, "");
			return (stripped === "" ? compact : stripped).toLowerCase();
		}

		/**
		 * List the direct group children of an open model menu.
		 * @param menu - the menu element.
		 * @returns the group elements.
		 */
		function modelGroups(menu) {
			return Array.prototype.slice.call(menu.children).filter((child) => child.querySelector(MODEL_HEADING_SELECTOR) !== null);
		}

		/**
		 * Decorate every open model list in place.
		 * @returns the number of menus that were decorated.
		 */
function syncModelOptions(menu, firstGroup) {
	const container = firstGroup.parentElement;
	if (container === null) return;
	let box = container.querySelector("[data-uidy-opts]");
	if (box === null) {
		box = document.createElement("div");
		box.setAttribute("data-uidy-opts", "");
		container.insertBefore(box, container.firstChild);
	}
	box.textContent = "";
	const title = document.createElement("div");
	title.className = "uidy-opts-title";
	title.textContent = tt("group.modelOptions");
	box.appendChild(title);
	for (const toggle of MODEL_TOGGLES) {
		const on = prefs[toggle.key] === true;
		const row = document.createElement("button");
		row.type = "button";
		row.className = "uidy-opts-row";
		row.setAttribute("role", "menuitemcheckbox");
		row.setAttribute("aria-checked", on ? "true" : "false");
		const mark = document.createElement("span");
		mark.className = "uidy-opts-check";
		mark.textContent = on ? "✓" : "";
		const text = document.createElement("span");
		text.textContent = tt(toggle.label);
		row.appendChild(mark);
		row.appendChild(text);
		row.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			prefs[toggle.key] = prefs[toggle.key] !== true;
			commitPrefs();
		});
		box.appendChild(row);
	}
}

		function applyModelMenus() {
			let menus = [];
			try {
				menus = Array.prototype.slice.call(document.querySelectorAll(MODEL_MENU_SELECTOR));
			} catch {
				return 0;
			}
			let touched = 0;
			for (const menu of menus) {
				const groups = modelGroups(menu);
				if (groups.length === 0) continue;
				touched += 1;
				syncModelOptions(menu, groups[0]);
				const ownerByKey = new Map();
				const seenLabels = new Set();
				/*
				 * Read every group first: a merged provider has to follow the group
				 * that owns it, so the fold state of the owner is known before the
				 * rows of the merged group are shown or hidden.
				 */
				const records = groups.map((group) => {
					const heading = group.querySelector(MODEL_HEADING_SELECTOR);
					const title = String(heading.textContent || "").trim();
					const key = providerKey(title);
					const rows = Array.prototype.slice.call(group.querySelectorAll(MODEL_ROW_SELECTOR));
					const labels = new Set();
					for (const row of rows) {
						const label = String(row.textContent || "").replace(/\s+/g, " ").trim();
						if (label !== "") labels.add(label);
					}
					return { group: group, heading: heading, title: title, key: key, rows: rows, labels: labels, owner: null };
				});
				for (const record of records) {
					const merged = prefs.merge && ownerByKey.has(record.key);
					if (prefs.merge && !merged) ownerByKey.set(record.key, record);
					else if (merged) record.owner = ownerByKey.get(record.key);
					record.group.setAttribute(MODEL_GROUP_ATTR, record.key);
					if (merged) record.group.setAttribute("data-uidy-merged", "true");
					else record.group.removeAttribute("data-uidy-merged");
				}
				for (const record of records) {
					/*
					 * With `collapseAll` on, every provider starts folded so the list
					 * reads as one line per provider; a group the user opened is
					 * remembered in `expanded`, so the fold survives a re-open.
					 * Otherwise the older per-key `collapsed` map decides.
					 */
					const source = record.owner === null ? record : record.owner;
					const collapsed = prefs.collapse
						? prefs.collapseAll
							? prefs.expanded[source.key] !== true
							: prefs.collapsed[source.key] === true
						: false;
					record.collapsed = collapsed;
					record.heading.setAttribute("data-uidy-arrow", collapsed ? "▸" : "▾");
					record.heading.setAttribute("data-uidy-count", String(record.rows.length));
					record.group.setAttribute("data-uidy-collapsed", collapsed ? "true" : "false");
				}
				for (const record of records) {
					const source = record.owner === null ? record : record.owner;
					for (const row of record.rows) {
						if (record.owner !== null) row.setAttribute("data-uidy-src", record.title);
						else row.removeAttribute("data-uidy-src");
						const label = String(row.textContent || "").replace(/\s+/g, " ").trim();
						/*
						 * A model the owning provider already lists would show up twice
						 * once the two groups are merged, so the repeat goes.
						 */
						const repeat = record.owner !== null && label !== "" && source.labels.has(label);
						const duplicate = prefs.dedupe && label !== "" && seenLabels.has(label);
						if (label !== "" && !duplicate) seenLabels.add(label);
						row.setAttribute("data-uidy-hidden", source.collapsed || repeat || duplicate ? "true" : "false");
					}
				}
			}
			return touched;
		}

		/**
		 * Watch for open model lists, keep them decorated, and toggle a group when
		 * its heading is clicked.
		 * @returns a disposer.
		 */
		function installModelMenuEnhancer() {
			let frame = 0;
			/*
			 * Decoration has to land even when no frame is being drawn: a window
			 * that is occluded or minimised stops requestAnimationFrame, and the
			 * list would then stay undecorated until the user restores it. A
			 * timer has no such condition.
			 */
			const schedule = () => {
				if (frame !== 0) return;
				frame = setTimeout(() => {
					frame = 0;
					try {
						applyModelMenus();
					} catch (error) {
						console.warn("[ui-tidy] model menu decoration failed:", error);
					}
				}, 16);
			};

			const observer = new MutationObserver(schedule);
			observer.observe(document.body, { childList: true, subtree: true });

			const onClickCapture = (event) => {
				const target = event.target;
				if (target === null || typeof target.closest !== "function") return;
				const heading = target.closest(MODEL_HEADING_SELECTOR);
				if (heading === null) return;
				const group = heading.closest(`[${MODEL_GROUP_ATTR}]`);
				if (group === null) return;
				if (!prefs.collapse) return;
				event.preventDefault();
				event.stopPropagation();
				const key = group.getAttribute(MODEL_GROUP_ATTR);
				if (key === null || key === "") return;
				if (prefs.collapseAll) {
					if (prefs.expanded[key] === true) delete prefs.expanded[key];
					else prefs.expanded[key] = true;
				} else if (prefs.collapsed[key] === true) delete prefs.collapsed[key];
				else prefs.collapsed[key] = true;
				commitPrefs();
			};

			document.addEventListener("click", onClickCapture, true);
			schedule();
			return () => {
				observer.disconnect();
				document.removeEventListener("click", onClickCapture, true);
				if (frame !== 0) clearTimeout(frame);
			};
		}

		/* ---------------------------------------------------------------- *
		 * popup open / close
		 * ---------------------------------------------------------------- */

		/**
		 * Close the popup.
		 * @returns {void}
		 */
		function closeMenu() {
			if (store.get().menu !== null) store.set({ menu: null, anchor: null });
		}

		/**
		 * Open one of the three menus under an element, or close it when the same
		 * one is already open. Passing a different id switches menus in place.
		 * @param element - the button the popup hangs from.
		 * @param menuId - `panels` | `view` | `model`.
		 * @returns {void}
		 */
		function toggleMenuAt(element, menuId) {
			if (store.get().menu === menuId) {
				closeMenu();
				return;
			}
			let rect = null;
			try {
				rect = element.getBoundingClientRect();
			} catch {
				rect = null;
			}
			store.set({
				menu: menuId,
				anchor:
					rect === null
						? { left: 48, top: 40 }
						: { left: rect.left, top: rect.bottom + 6, right: rect.right, width: rect.width }
			});
		}

		/* ---------------------------------------------------------------- *
		 * icons
		 * ---------------------------------------------------------------- */

		const ICON_PATHS = {
			plus: ["M8 3.6v8.8", "M3.6 8h8.8"],
			menu: ["M2.8 4.6h10.4", "M2.8 8h10.4", "M2.8 11.4h10.4"],
			panel: ["M2.8 3.6h10.4v8.8H2.8z", "M6.6 3.6v8.8"],
			check: ["M3.4 8.4 6.3 11.3 12.6 4.6"],
			user: ["M8 8.2a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2", "M3.2 13.4c0-2.3 2.2-3.6 4.8-3.6s4.8 1.3 4.8 3.6"],
			refresh: ["M13.2 8a5.2 5.2 0 1 1-1.6-3.8", "M13.4 2.8v2.6h-2.6"],
			chat: ["M2.8 3.4h10.4v7.2H7.4L4.2 13.2v-2.6H2.8z"],
			chart: ["M3 13V8.4", "M8 13V3.4", "M13 13V6.2"],
			list: ["M5.6 4.4h7.8", "M5.6 8h7.8", "M5.6 11.6h7.8", "M2.8 4.4h.01", "M2.8 8h.01", "M2.8 11.6h.01"],
		/* One glyph per function: two different features never share one. */
			plug: ["M6.4 2.8v3.4", "M9.6 2.8v3.4", "M4.6 6.2h6.8v2.2a3.4 3.4 0 0 1-3.4 3.4 3.4 3.4 0 0 1-3.4-3.4z", "M8 11.8v1.4"],
			clock: ["M8 3.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6", "M8 5.6V8.2l1.9 1.3"],
			book: ["M3.2 3.2h4.2a1.8 1.8 0 0 1 1.8 1.8v7.6a1.6 1.6 0 0 0-1.6-1.6H3.2z", "M12.8 3.2H8.6a1.8 1.8 0 0 0-1.8 1.8v7.6a1.6 1.6 0 0 1 1.6-1.6h4.4z"],
			star: ["M8 2.8l1.7 3.5 3.8.5-2.8 2.7.7 3.8L8 11.5l-3.4 1.8.7-3.8L2.5 6.8l3.8-.5z"],
			/* A branching node graph: the workflow runner. */
			flow: ["M4 4.4h2.4v2.4H4z", "M9.6 9.2H12v2.4H9.6z", "M4 9.2h2.4v2.4H4z", "M6.4 6.8v2.4", "M5.2 7.6h5.6v1.6", "M12 11.6v1.2a1.2 1.2 0 0 1-1.2 1.2H6.4a1.2 1.2 0 0 1-1.2-1.2v-1.2"],
			/* A pair of figures: the sub-agent roster. */
			agents: ["M6.4 7.6a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6", "M2.4 13.2c0-2 1.8-3.1 4-3.1s4 1.1 4 3.1", "M10.6 5.2a1.9 1.9 0 1 1 0 3.8", "M11.2 10.3c1.5.2 2.6 1.2 2.6 2.9"]
		};

		/**
		 * Render one stroked glyph.
		 * @param props - `{ name }`.
		 * @returns the svg element.
		 */
		function Icon(props) {
			const paths = ICON_PATHS[props.name] ?? [];
			return h(
				"svg",
				{
					width: 14,
					height: 14,
					viewBox: "0 0 16 16",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: 1.6,
					strokeLinecap: "round",
					strokeLinejoin: "round",
					"aria-hidden": "true",
					style: { display: "block", flex: "0 0 auto" }
				},
				paths.map((d, index) => h("path", { key: index, d }))
			);
		}

		/**
		 * Serialize an icon so it can be injected as raw markup.
		 *
		 * The live sidebar rows carry the host's (or another plugin's) own svg, so
		 * the button shows the real glyph instead of a substitute drawn here.
		 * @param name - a key of `ICON_PATHS`.
		 * @returns the svg markup.
		 */
		function iconMarkup(name) {
			const paths = ICON_PATHS[name] ?? [];
			const body = paths.map((d) => `<path d="${d}"/>`).join("");
			return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
		}

		/* ---------------------------------------------------------------- *
		 * stylesheets
		 * ---------------------------------------------------------------- */

		/*
		 * Sidebar tidy-up. Host class names are CSS-module hashes, so selectors match
		 * the readable suffix with `[class*=...]` and every rule is anchored with
		 * `:has()` on a direct child so it cannot reach another flex column. The
		 * sidebar root and the tool group are both flex columns, which is what makes
		 * `order` sufficient. Novel Forge and mneme inject their entries into the
		 * sidebar shell instead of registering with the `sidebar.panellist` slot, so
		 * CSS is the only lever for their position.
		 */
		/*
		 * The shipped left sidebar is removed, not collapsed: its column is taken
		 * down to zero width so the centre column reclaims the space, and the frame
		 * is marked `data-uidy-nosb` so the CSS below can reach the pieces.
		 *
		 * Two things are deliberately NOT hidden, because third-party plugins dock
		 * into them:
		 *   - `[data-slot="sidebar.panellist"]` holds the four rows the plugin
		 *     panels register into;
		 *   - `[data-slot="sidebar.workspaces"]` holds the whole session tree.
		 * `preserveSeats()` only MARKS those seat hosts; it does not move them. The
		 * column is kept mounted at zero width, so React still owns the hosts and
		 * every plugin pane docked into them stays registered. Moving them out (an
		 * earlier revision) is what crashed the overlay with `removeChild`.
		 */
		const SIDEBAR_CSS = `
/*
 * The frame is a CSS GRID, and the host writes the track sizes inline:
 *   style="--dsh-windows-sidebar-width:280px;grid-template-columns:280px minmax(0px,1fr) minmax(0px,0px)"
 * An inline declaration outranks any stylesheet rule, so zeroing the column
 * alone leaves a 280px dead track behind. The grid template has to be
 * overridden — and only then does the centre column actually move left.
 * The custom property --dsh-windows-sidebar-width is overridden too: the host
 * reads it back when it re-renders the template (e.g. on resize), so without
 * this the track reappears on the next recompute.
 */
/*
 * Only the FIRST track is zeroed. The third track belongs to the shipped RIGHT
 * sidebar: the host rewrites it whenever that sidebar opens or closes, and
 * pinning the whole template (an earlier revision did) froze it at zero, so the
 * pane had no column of its own and simply drew over the conversation instead of
 * splitting the view. --uidy-rb-track carries the live third track and is kept
 * in step with the host by syncFrameTracks().
 */
[data-uidy-nosb]{--dsh-windows-sidebar-width:0px !important;
  grid-template-columns:0px minmax(0px,1fr) var(--uidy-rb-track,minmax(0px,0px)) !important}
/*
 * A docked right-sidebar pane is 576px wide even while the host has the column
 * collapsed, and it is painted over the conversation with pointer-events:none.
 * That is the docking plugin not following the host, but the result is a dead
 * pane covering half the session, so it is hidden until the column carries
 * width. :has() keeps the rule from touching anything else.
 */
[data-uidy-nosb]:has(> [class*="rightbarCol"] > [class*="_panel"]) [class*="rightbarCol"] > [class*="_panel"][style*="--dsh-sidebar-width"]{
  visibility:hidden !important}
[data-uidy-nosb]:has(> [class*="rightbarCol"] > [class*="_panel"]) > [class*="centerCol"]{z-index:auto !important}
[data-uidy-nosb] [class*="sidebarCol"]{width:0 !important;min-width:0 !important;flex:0 0 0 !important;overflow:hidden !important}
/*
 * The shipped sidebar rail must be hidden, and the descendant combinator is
 * load-bearing: the host nests the rail as
 *   sidebarCol > [data-slot=sidebar] > .wtg9ga_root
 * so a direct-child chain (which an earlier revision used) matches nothing at
 * all and the rail stays mounted.
 */
[data-uidy-nosb] [class*="sidebarCol"] [class*="wtg9ga_root"]{display:none !important}
/*
 * The rail's buttons are position:FIXED (top:6px, left:12px/48px, z-index:30),
 * so they are anchored to the viewport and are NOT clipped by the zero-width
 * column or by its overflow:hidden — zeroing the column alone left the toggle,
 * the new-session button and the mneme entry floating over the title bar.
 * Hiding the rail itself is what actually removes them; these child rules are
 * the belt-and-braces guard for a rail rendered outside the column.
 */
[data-uidy-nosb] [class*="wtg9ga_railIn"],
[data-uidy-nosb] [class*="wtg9ga_toggle"],
[data-uidy-nosb] [class*="wtg9ga_newSession"],
[data-uidy-nosb] [class*="mneme-topentry"]{display:none !important}
[data-uidy-nosb] [class*="handle"]:has(+ div[class*="sidebarCol"]){display:none !important}
/*
 * Marked seat hosts live in the zero-width column, which already clips them
 * visually. Clipping plus overflow:hidden takes them out of the text flow too,
 * because the column's own overflow:hidden alone still leaves their text
 * readable via select-all and innerText.
 */
[data-uidy-sbseat]{position:absolute !important;left:0;top:0;width:1px !important;height:1px !important;
  overflow:hidden !important;clip-path:inset(50%) !important;pointer-events:none !important;opacity:0 !important}
/* Belt-and-braces for a page upgraded from a revision that parked them outside. */
#uidy-seats{position:absolute !important;left:0;top:0;width:1px !important;height:1px !important;
  overflow:hidden !important;clip-path:inset(50%) !important;pointer-events:none !important;opacity:0 !important}
`;

/*
 * The conversation header ships as a two-row CSS grid (30.1667px + 35.1667px):
 * row one holds the breadcrumb, the mode chip and the workflow trigger, row two
 * holds the view tabs (对话 / 轨迹 / 上下文 / 画廊 / 压缩账本). The user asked for
 * one row instead, so both are folded onto a single line.
 *
 * That cannot be done by shrinking the row heights - the second row would still
 * exist and still be empty. The grid is replaced with a flex row, which turns the
 * two rows into two flex items sitting side by side. The middle wrapper the shell
 * nests them in is display:contents, so its children already take part in the
 * parent layout directly.
 *
 * Matching is done on the readable class-name suffix and on the header element
 * itself, never on the hashed prefix: the prefix is regenerated by every official
 * build. Every rule is guarded by a :has() so it can only reach the one header
 * that actually contains the title row.
 */
const DOCK_CSS = `
/* ---- the session browser, docked to the conversation page ---- */
.uidy-dock{position:fixed;left:0;top:var(--uidy-dock-top,44px);width:280px;max-height:calc(100vh - 172px);
  z-index:900;display:flex;flex-direction:column;gap:6px;padding:8px 8px 10px;box-sizing:border-box;overflow:hidden;
  pointer-events:auto;
  border-right:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28));border-bottom:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28));
  border-bottom-right-radius:10px;background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-overlay,#14161c));
  box-shadow:12px 10px 28px rgba(0,0,0,.28)}
.uidy-dock-head{display:flex;align-items:center;gap:2px;flex:0 0 auto}
.uidy-dock-new{flex:1 1 auto;min-width:0;display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 10px;border:1px solid transparent;
  border-radius:7px;background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14));color:var(--dsw-alias-label-primary,inherit);
  font:inherit;font-size:13px;font-weight:500;line-height:1;cursor:pointer;overflow:hidden;white-space:nowrap}
.uidy-dock-new:hover{background:var(--dsw-alias-interactive-bg-active,rgba(127,127,127,.24))}
.uidy-dock-act{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border:0;
  border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,inherit);cursor:pointer;font:inherit;line-height:1}
.uidy-dock-act:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.18));color:var(--dsw-alias-label-primary,inherit)}
.uidy-dock .uidy-searchbox{flex:0 0 auto}
.uidy-dock .uidy-sessions{flex:1 1 auto;min-height:120px;max-height:none;overflow-y:auto}
`;

const HEADER_CSS = `
/*
 * The conversation header ships as a two-row grid: a title row (breadcrumbs, the
 * mode and workflow chips, the utility buttons) and a second row holding the view
 * tabs. The user asked for a single row, so the header becomes one flex line and
 * the title row is dissolved with display:contents, promoting its children to
 * items of the header itself.
 *
 * The line has to survive the right sidebar taking half the window. Only the tab
 * strip and the breadcrumb cluster may shrink (both scroll or truncate); the
 * utility buttons and the corner keep their intrinsic size, which is what stops
 * them being pushed outside the window. When the sidebar is open the header used
 * to overflow by the pane's width, leaving the right-sidebar toggle at x=1822 and
 * the bottom-panel toggle at y=830 - i.e. off-screen, which read as "the button
 * does nothing".
 */
header:has([class*="_titleRow"]){
  display:flex !important;flex-direction:row !important;align-items:center !important;flex-wrap:nowrap !important;
  gap:10px !important;height:auto !important;min-height:44px !important;
  grid-template-rows:none !important;grid-template-columns:none !important;
  padding-top:6px !important;padding-bottom:4px !important;
}
header:has([class*="_titleRow"]) > [class*="_headerLeading"]{flex:0 0 auto !important}
header:has([class*="_titleRow"]) [class*="_titleRow"]{display:contents !important}
header:has([class*="_titleRow"]) [class*="_titleCluster"]{
  min-width:0 !important;flex:0 1 auto !important;order:1 !important;overflow:hidden !important;
}
/*
 * The current conversation's name is the one piece of the header that may grow.
 * Letting it keep its natural width keeps a long session title readable; the
 * minimum of zero lets it give way when the window is narrow, so the utility
 * buttons are pushed out of the window rather than the title.
 */
header:has([class*="_titleRow"]) [class*="_crumbCurrent"]{min-width:0 !important;flex:0 1 auto !important;max-width:420px !important}
/*
 * A plugin that hands an object to the width/height attributes of an icon leaves
 * the attribute as the text "[object Object]", and the browser then refuses to
 * draw the glyph. The host's own icons are 16px, so the broken ones are given
 * the same size back.
 */
svg[width="[object Object]"],svg[height="[object Object]"]{
  width:16px !important;height:16px !important;
}
/*
 * Order matters: the tabs sit next to the breadcrumbs, then the utility buttons
 * are pushed right by their own margin-left:auto, then the corner closes the row.
 * flex-basis 0 with shrink allowed is what lets the strip give up width first.
 */
header:has([class*="_titleRow"]) [class*="_tabs"]:not([class*="_viewTabs"]){
  flex:0 1 auto !important;min-width:0 !important;width:auto !important;padding-left:0 !important;
  align-items:center !important;align-self:center !important;order:2 !important;
  overflow-x:auto !important;overflow-y:hidden !important;scrollbar-width:none !important;
}
header:has([class*="_titleRow"]) [class*="_tabs"]:not([class*="_viewTabs"])::-webkit-scrollbar{
  width:0 !important;height:0 !important;
}
header:has([class*="_titleRow"]) [class*="_headerUtilities"]{
  flex:0 0 auto !important;order:3 !important;margin-left:auto !important;
}
header:has([class*="_titleRow"]) [class*="_headerCorner"]{
  flex:0 0 auto !important;order:4 !important;display:flex !important;
  align-items:center !important;gap:4px !important;margin-left:0 !important;padding-left:6px !important;border-left:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28)) !important;
}
/*
 * The tab strip carries its own overflow anchor, which is the second ellipsis in
 * this header. The user counted two and wants one; the strip now scrolls, so the
 * anchor has nothing left to do.
 */
/*
 * The conversation view strip holds a single tab, 对话, which is the same
 * destination as the 对话 page button in the title bar. One tab is not a strip;
 * it is a duplicate that also costs a row of header height.
 */
header:has([class*="_titleRow"]) [class*="_viewTabs"]{display:none !important}
header:has([class*="_titleRow"]) [aria-label*="会话视图"],
header:has([class*="_titleRow"]) [aria-label*="View tabs"]{display:none !important}
/*
 * Three header chips used to be the only way into things that the title bar now
 * carries: the workflow runner and the sub-agent roster both have a title bar
 * entry of their own, so a second copy in the header is a duplicate. They are
 * hidden rather than removed - the title bar button still drives them, because a
 * hidden button can still be clicked programmatically.
 */
header:has([class*="_titleRow"]) .mneme-pipe-trigger{display:none !important}
/*
 * The subagent plugin's own counter stays: it is the only view of the
 * current session's subagents, and the session row is where the user
 * looks for it. It only needs the cluster's height and hover.
 */
header:has([class*="_titleRow"]) .dsh-sam-trigger{display:inline-flex !important;align-items:center !important;gap:4px !important;
  height:24px !important;padding:0 8px !important;border-radius:6px !important;font-size:12px !important;line-height:1 !important;
  border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28)) !important;background:transparent !important;
  color:var(--dsw-alias-label-secondary,inherit) !important}
header:has([class*="_titleRow"]) .dsh-sam-trigger:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.16)) !important;
  color:var(--dsw-alias-label-primary,inherit) !important}
header:has([class*="_titleRow"]) .dsh-sam-trigger .dsh-sam-icon{font-size:12px !important}
/*
 * The background-task chip keeps its spinner and its count, but the sentence
 * around it ("1 个后台任务运行中") is wider than the room it leaves in the
 * header. The script shortens the label to the number alone.
 */
header:has([class*="_titleRow"]) .Ag-ohG_trigger > svg:last-child{display:none !important}
/*
 * The chip's own label is replaced with the task count by syncTaskChip; the
 * rule below is the belt to that braces, in case the host re-renders the chip
 * between the observer's passes.
 */
header:has([class*="_titleRow"]) .Ag-ohG_count{max-width:78px !important;overflow:hidden !important;text-overflow:clip !important}
/*
 * The "open with" control is a split button: a wide default action and a narrow
 * chevron that opens the list of other programs. Together they cost 41px of the
 * header, which is more than the rest of the utility group. The chevron is
 * folded into the main button, so one control opens the list - the default
 * program is the first entry in it - and the pair becomes one button wide.
 */
header:has([class*="_titleRow"]) .mOxcpG_chevron{display:none !important}
header:has([class*="_titleRow"]) .mOxcpG_split{width:23px !important}
`;

/*
 * The shipped right sidebar is left alone. It is not just a shell surface: the
 * installed plugins dock their own panes into the `sidebar.right.pane.tab` seat
 * (`dsh-better-sidebar`, `dsh-image-gen` and `dsh-mneme` all register there), so
 * hiding the host would hide their panes too. Only the shipped left sidebar is
 * relocated, and that is done by the menus above rather than by hiding anything.
 */
const RIGHTBAR_CSS = "";

		const POPUP_CSS = `
.uidy-menu{display:flex;flex-direction:column;gap:1px;min-width:236px;max-height:min(72vh,600px);overflow-y:auto;padding:4px;border-radius:10px;position:relative;
  border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28));
  background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-bg-overlay,#ffffff));
  box-shadow:0 8px 28px rgba(0,0,0,.18);font-size:13px}
.uidy-menu-fixed{position:fixed;z-index:1200}
/* the session browser needs room for the tree, not just for a command list */
.uidy-menu-sessions{width:320px}
.uidy-menu-sessions .uidy-sessions{max-height:min(46vh,380px)}
.uidy-resize{position:absolute;top:0;right:0;bottom:0;width:6px;cursor:ew-resize;touch-action:none}
.uidy-resize:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.18))}
/*
 * Every popup child is a fixed-height control. Without this they are flex items
 * in a column with max-height, so when the content is TALLER than that cap the
 * browser shrinks each row instead of scrolling: the rows measured 17.33px
 * instead of 30px while scrollHeight === clientHeight (i.e. no overflow was even
 * reported). flex:0 0 auto keeps every row at its declared height so the
 * container scrolls the way it was meant to.
 */
.uidy-menu > *{flex:0 0 auto}
.uidy-item{display:flex;align-items:center;gap:8px;width:100%;height:30px;padding:0 8px;border:0;border-radius:6px;
  flex:0 0 auto;
  background:transparent;color:var(--dsw-alias-label-primary,inherit);font:inherit;font-size:13px;text-align:left;cursor:pointer}
.uidy-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14))}
.uidy-item[data-active="true"]{color:var(--dsw-alias-brand-primary,#4d6bfe)}
.uidy-item-ico{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;flex:0 0 14px}
.uidy-item-accel{margin-left:auto;color:var(--dsw-alias-label-tertiary,inherit);font-size:12px}
.uidy-divider{height:1px;margin:3px 4px;background:var(--dsw-alias-border-l2,rgba(127,127,127,.24))}
.uidy-group{padding:5px 8px 2px;color:var(--dsw-alias-label-tertiary,inherit);font-size:11px}
.uidy-bar{display:inline-flex;align-items:center;gap:2px;margin-right:4px}
.uidy-btn{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 8px;border:0;border-radius:6px;
  background:transparent;color:var(--dsw-alias-label-secondary,inherit);font:inherit;font-size:13px;line-height:1;
  cursor:pointer;white-space:nowrap;transition:background .12s ease,color .12s ease}
.uidy-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14));
  color:var(--dsw-alias-label-primary,inherit)}
.uidy-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4d6bfe);outline-offset:1px}
.uidy-wraptrue{position:relative;display:inline-flex}
/*
 * The page cluster sits at the RIGHT end of the title bar, after a fixed gap
 * reserved for the OS caption buttons. Its metrics are copied verbatim from the
 * shadow stylesheet the shell ships for 应用/编辑 (height 28, padding 0 10,
 * radius 6, transparent, label-secondary, font 14), so a page button and a shell
 * menu read as the same class of control.
 *
 * The container itself is pointer-events:none and only the buttons take the
 * pointer, so a narrow window can never make the cluster swallow clicks meant
 * for the shell menus underneath it.
 */
.uidy-pages{position:fixed;top:0;left:var(--uidy-cluster-limit,158px);height:var(--dsh-windows-titlebar-height,40px);
  display:flex;align-items:center;gap:2px;z-index:1100;pointer-events:none;-webkit-app-region:no-drag}
.uidy-page{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;height:28px;padding:0 10px;border:0;border-radius:6px;
  background:transparent;color:var(--dsw-alias-label-secondary,inherit);font:inherit;font-size:14px;line-height:1;
  white-space:nowrap;cursor:default;pointer-events:auto}
.uidy-page:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.16));
  color:var(--dsw-alias-label-primary,inherit)}
.uidy-page[data-active="true"]{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.16));
  color:var(--dsw-alias-label-primary,inherit)}
.uidy-page > svg{display:block;flex:0 0 auto}
/*
 * The page buttons are reorderable by dragging one onto another. The cursor is
 * the only affordance the title bar has room for, so it carries the hint.
 */
.uidy-page{cursor:grab}
.uidy-page:active{cursor:grabbing}
.uidy-page[data-drop="true"]{box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary,#4d6bfe)}
.uidy-page-sep{width:1px;height:16px;flex:0 0 auto;background:var(--dsw-alias-border-l2,rgba(127,127,127,.3))}
/*
 * The ghost row is a measurement copy of the cluster. It is laid out for real
 * (so widths are honest) but parked off-screen and made inert, because a hidden
 * element has no layout and would report zero widths.
 */
.uidy-pages-ghost{position:fixed;top:-200px;left:0;display:flex;align-items:center;gap:2px;
  visibility:hidden;pointer-events:none;z-index:-1}
.uidy-pages-more{position:relative;flex:0 0 auto;pointer-events:auto}
.uidy-pages-pop{position:absolute;top:32px;right:0;display:flex;flex-direction:column;gap:1px;min-width:180px;padding:4px;
  border-radius:10px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28));
  background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-bg-overlay,#ffffff));box-shadow:0 8px 28px rgba(0,0,0,.18);z-index:1200}
/*
 * Inside the popup a page is a row, so it takes the full column width and shares
 * the popup's edges instead of sizing to its own label.
 */
.uidy-pages-pop .uidy-page{display:flex;width:100%;height:30px;padding:0 8px;border-radius:6px;box-sizing:border-box}
.uidy-pages-pop .uidy-page[data-active="true"]{background:transparent}
.uidy-pages-pop .uidy-page[data-active="true"] > svg{color:var(--dsw-alias-brand-primary,currentColor)}
.uidy-searchbox{display:flex;flex-direction:column;gap:1px;padding:2px 0 3px}
.uidy-search{width:100%;height:28px;padding:0 8px;border-radius:6px;box-sizing:border-box;
  border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.3));
  background:var(--dsw-alias-bg-layer-2,transparent);color:var(--dsw-alias-label-primary,inherit);
  font:inherit;font-size:12px}
.uidy-search:focus{outline:2px solid var(--dsw-alias-brand-primary,#4d6bfe);outline-offset:0}
.uidy-note{padding:3px 8px;color:var(--dsw-alias-label-tertiary,inherit);font-size:11px}
.uidy-hit{display:block;width:100%;height:26px;padding:0 8px;border:0;border-radius:6px;overflow:hidden;
  background:transparent;color:var(--dsw-alias-label-secondary,inherit);font:inherit;font-size:12px;
  text-align:left;white-space:nowrap;text-overflow:ellipsis;cursor:pointer}
.uidy-hit:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14));
  color:var(--dsw-alias-label-primary,inherit)}
/* the session list relocated from the sidebar: it scrolls, the row styling comes
   from the host, and only the box that frames it is ours */
.uidy-sessions{display:flex;flex-direction:column;min-width:0;max-height:min(56vh,460px);overflow-y:auto;padding:1px 0 2px}
.uidy-sessions > *{flex:0 0 auto}
.uidy-rows{display:flex;flex-direction:column;gap:1px;padding:1px 0}
.uidy-ws{padding:5px 8px 2px;color:var(--dsw-alias-label-tertiary,inherit);font-size:11px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.uidy-sub{margin-left:auto;color:var(--dsw-alias-label-tertiary,inherit);font-size:11px}
`;

/*
 * Model-list decoration. The host renders both the provider groups and their
 * rows, so every rule below only reacts to the attributes `applyModelMenus`
 * sets; no host class is restyled and no node is inserted.
 */
const MODEL_CSS = `
[data-uidy-group] > [class*="_heading"]{cursor:pointer;user-select:none}
[data-uidy-group] > [class*="_heading"]::before{content:attr(data-uidy-arrow);display:inline-block;width:10px;opacity:.7}
[data-uidy-group] > [class*="_heading"]::after{content:attr(data-uidy-count);margin-left:6px;opacity:.55;font-weight:400}
/*
 * A merged provider keeps its rows but loses its own heading, so the models
 * read as one list under the provider that owns them. Dissolving the group
 * box leaves the host's row nodes untouched.
 */
[data-uidy-merged="true"]{display:contents !important}
[data-uidy-merged="true"] > [class*="_heading"]{display:none}
[data-uidy-hidden="true"]{display:none !important}
[data-uidy-src]::after{content:"· " attr(data-uidy-src);margin-left:6px;font-size:11px;opacity:.6}
`;

		/* ---------------------------------------------------------------- *
		 * shipped sidebar removal + seat preservation
		 * ---------------------------------------------------------------- */

		const FRAME_MARK = "data-uidy-nosb";
		/*
		 * Carries the host's live third grid track, which is the right sidebar's
		 * width. SIDEBAR_CSS reads it back, which is how the right sidebar keeps
		 * its own column instead of being pinned away with the left one.
		 */
		const RB_TRACK_VAR = "--uidy-rb-track";
		/* Watches the frame's inline style so the published template stays current. */
		let frameTrackObserver = null;
		let frameTrackTarget = null;
		const SEAT_MARK = "data-uidy-sbseat";
		const PANELLIST_SEAT = 'sidebar.panellist';
		const WORKSPACES_SEAT = 'sidebar.workspaces';
		const TOOL_ROW_SELECTOR = '[class*="panelList"] > button[class*="panelRow"]';

		/*
		 * Seat hosts that third-party plugins dock into. They must stay connected to
		 * the document or their panes unregister, so instead of being hidden with the
		 * sidebar they are parked in the always-present `shell.overlay` layer.
		 */
		const PRESERVED_SEATS = [PANELLIST_SEAT, WORKSPACES_SEAT, 'sidebar.settings', 'sidebar.footer.action', 'sidebar.brand.mark', 'sidebar.brand.name'];

		/* Where the session tree came from, so it can be handed back on dispose. */
		let sessionOrigin = null;

		/*
		 * Where each parked seat host came from, so `restoreShippedSidebar()` can put
		 * it back. Several seats live under the same sidebar parent, so the original
		 * next-sibling is recorded to preserve their relative order.
		 */
		const seatOrigins = [];

		/**
		 * Find the frame element that owns the three columns.
		 * @returns the frame, or null before the shell paints.
		 */
		function frameElement() {
			const columns = document.querySelector('[class*="sidebarCol"]');
			if (columns === null) return null;
			const frame = columns.parentElement;
			return frame === null || frame === undefined ? null : frame;
		}

		/**
		 * Mark the seat hosts that must stay readable, WITHOUT moving them.
		 *
		 * An earlier revision physically moved these hosts into a `#uidy-seats`
		 * container on `document.body`. That breaks React: the hosts are owned by
		 * the sidebar's React tree, so on the next render React calls
		 * `parentNode.removeChild(child)` against a parent it no longer has, and the
		 * whole `shell.overlay` subtree dies with `NotFoundError`. The panic was
		 * disguised because the crash surfaces as a blank overlay, not as an error
		 * in the plugin.
		 *
		 * The hosts do not actually need moving. They only need to stay CONNECTED,
		 * and the sidebar column is kept mounted (taken to zero width with
		 * `overflow:hidden`) rather than unmounted — so React keeps them alive on
		 * its own and the plugin panes docked into them stay registered. This marks
		 * them so the stylesheet can clip them out of the visual and text flow.
		 * @returns the number of seats marked.
		 */
		function preserveSeats() {
			if (rootCtx === null) return 0;
			let marked = 0;
			for (const seat of PRESERVED_SEATS) {
				for (const node of document.querySelectorAll('[data-slot="' + seat + '"]')) {
					if (node.hasAttribute(SEAT_MARK)) continue;
					node.setAttribute(SEAT_MARK, seat);
					marked += 1;
				}
			}
			return marked;
		}

		/**
		 * Collect the sidebar tool rows so the menus can mirror them.
		 *
		 * The rows belong to the host and to other plugins, so the menu only copies
		 * their label and icon and clicks the real row when one is chosen
		 * (`clickToolRow`). Reading them off the live DOM is what lets a newly
		 * installed plugin appear without this list changing.
		 * @returns {void}
		 */
		function syncToolRows() {
			const rows = [...document.querySelectorAll(TOOL_ROW_SELECTOR)].map((row) => {
				const svg = row.querySelector('svg');
				return {
					label: readRowLabel(row),
					icon: svg === null ? null : svg.outerHTML,
					panelId: readRowPanelId(row),
				};
			});
			const extra = [...document.querySelectorAll('[data-mneme-overlay-opener],[data-dsh-novelforge-entry]')].map((row) => {
				const svg = row.querySelector('svg');
				return { label: readRowLabel(row), icon: svg === null ? null : svg.outerHTML, panelId: null };
			});
			store.set({ toolRows: [...rows, ...extra] });
		}

		/**
		 * Move the session tree into `host`, remembering where it came from.
		 *
		 * The tree is the host's entire `sidebar.workspaces` filler (headings, rows,
		 * drag behaviour). It is moved rather than copied, so no state is duplicated
		 * and the host keeps owning it.
		 *
		 * This is the one place a React-owned node is legitimately relocated: the
		 * popup is mounted from the same React root and the tree's original parent
		 * stays mounted, so React can still reconcile both ends. It is also put back
		 * before the popup unmounts (see `restoreSessions`), because unmounting while
		 * the node is parked elsewhere is what triggers React's
		 * `removeChild` NotFoundError.
		 * @param host - the container to move it into.
		 * @returns the moved node, or null when it is not mounted yet.
		 */
		function relocateSessions(host) {
			const existing = host.querySelector('[class*="workspacesRoot"],[class*="treeRoot"],[role="tree"]');
			if (existing !== null) return existing;
			const seat = document.querySelector('[data-slot="' + WORKSPACES_SEAT + '"]');
			const tree = seat === null ? null : seat.firstElementChild;
			if (tree === null || tree === undefined) return null;
			sessionOrigin = { node: tree, parent: tree.parentElement, next: tree.nextElementSibling };
			host.appendChild(tree);
			return tree;
		}

		/**
		 * Put the session tree back where the shell had it.
		 *
		 * When the original parent is gone the tree is left where it is rather than
		 * removed: it is React's node, and deleting it here would leave React with a
		 * stale child pointer and surface later as a `removeChild` NotFoundError.
		 * @param node - the moved tree.
		 * @returns {void}
		 */
		function restoreSessions(node) {
			const origin = sessionOrigin;
			sessionOrigin = null;
			if (origin === null || origin.node !== node) return;
			const parent = origin.parent;
			if (parent !== null && parent.isConnected) {
				if (origin.next !== null && origin.next.parentElement === parent) parent.insertBefore(node, origin.next);
				else parent.appendChild(node);
			}
		}

		/**
		 * Remove the shipped sidebar, reproducing its rows in the menus.
		 *
		 * This is the whole point of the plugin: the shipped left sidebar is taken
		 * away and everything it used to offer — new session, the tool rows, the
		 * session tree, the workspace picker and the account menu — is reachable
		 * from the top bar.
		 * @returns {void}
		 */
		/**
		 * Split a grid-template-columns value into its top-level tracks.
		 *
		 * A naive split on whitespace is wrong: function tracks such as
		 * minmax(0px, 1fr) contain a space after the comma and would be cut in
		 * half, which silently corrupts the template.
		 * @param {string} value the template.
		 * @returns {string[]} the tracks.
		 */
		function splitGridTracks(value) {
			const tracks = [];
			let depth = 0;
			let current = "";
			for (const character of value) {
				if (character === "(") depth += 1;
				else if (character === ")") depth -= 1;
				if (depth === 0 && (character === " " || character === "\t")) {
					if (current !== "") {
						tracks.push(current);
						current = "";
					}
					continue;
				}
				current += character;
			}
			if (current !== "") tracks.push(current);
			return tracks;
		}

		/**
		 * Width the shipped right sidebar wants, read off a docked pane.
		 *
		 * The pane carries its width in an inline custom property, which is the
		 * only place that number survives the host's own CSS-module hashing.
		 * @returns the width in CSS pixels, or 0 when no pane is docked.
		 */
		function readRightbarWidth() {
			const column = document.querySelector('[class*="rightbarCol"]');
			if (column === null) return 0;
			for (const node of column.querySelectorAll('[style*="--dsh-sidebar-width"]')) {
				const value = Number.parseFloat(node.style.getPropertyValue("--dsh-sidebar-width"));
				if (Number.isFinite(value) && value > 0) return value;
			}
			/*
			 * The inline width is not always published. When the host draws the open
			 * pane as a positioned overlay it keeps the grid track at zero and no inline
			 * custom property exists anywhere, so a measured visible pane is the only
			 * honest number. Without it the pane gets no column of its own and paints
			 * across the conversation instead of beside it.
			 */
			for (const node of column.querySelectorAll('[class*="_panel"]')) {
				if (!(node instanceof HTMLElement)) continue;
				const style = getComputedStyle(node);
				if (style.display === "none" || style.visibility === "hidden") continue;
				const measured = Math.round(node.getBoundingClientRect().width);
				if (measured > 0) return measured;
			}
			return 0;
		}

		/**
		 * Publish the right sidebar's live grid track.
		 *
		 * Only the third track is derived here, never a whole hard-coded template:
		 * the host owns that track and rewrites it whenever the right sidebar opens
		 * or closes.
		 *
		 * The reading cannot simply be "whatever the inline template says". The
		 * host sometimes publishes no template at all, and a docked pane can be
		 * present while the host still has the column collapsed - in both cases
		 * falling back to zero is wrong, because the pane then has no column and
		 * draws over the conversation. So: if the track reads as zero while nothing
		 * says the sidebar is collapsed and a pane reports a width, that width wins.
		 * @param {Element} frame the shell frame element.
		 * @returns {void}
		 */
		/**
		 * Hide a right pane the host has left mounted while its column is closed.
		 *
		 * The host keeps the pane in the DOM when the sidebar is closed, so a closed
		 * sidebar still paints (or still reserves its width). With no column it draws over
		 * the conversation; this takes it out of the visual and hit-test flow until the
		 * host reopens the sidebar and restores a column.
		 * @returns {void}
		 */
		function hideStaleRightPanes() {
			const column = document.querySelector('[class*="rightbarCol"]');
			if (column === null) return;
			for (const node of column.querySelectorAll("[class*=\"_panel\"]")) {
				if (!(node instanceof HTMLElement)) continue;
				if (node.getAttribute(HIDDEN_PANE_ATTR) === "") continue;
				node.setAttribute(HIDDEN_PANE_ATTR, "");
				node.style.display = "none";
			}
		}
		
		/**
		 * Undo hideStaleRightPanes once the host gives the sidebar a column again.
		 * @returns {void}
		 */
		function revealRightPanes() {
			for (const node of document.querySelectorAll("[" + HIDDEN_PANE_ATTR + "]")) {
				node.removeAttribute(HIDDEN_PANE_ATTR);
				if (node instanceof HTMLElement) node.style.display = "";
			}
		}
		
		const HIDDEN_PANE_ATTR = "data-uidy-rb-pane-hidden";
		
		function syncFrameTracks(frame) {
			if (!(frame instanceof HTMLElement)) return;
			let track = "";
			const template = frame.style.getPropertyValue("grid-template-columns");
			if (template !== "") {
				const tracks = splitGridTracks(template);
				if (tracks.length >= 3) track = tracks[2];
			}
			/*
			 * The host can leave data-rightbar-collapsed on the frame while the pane is
			 * still mounted and painted at full width, so that attribute is not a reliable
			 * answer to "is the pane open". The pane itself is: an open one reports its
			 * column width, a closed one is hidden and reports nothing.
			 */
			const zeroed = track === "" || track === "0px" || /minmax\(\s*0px\s*,\s*0px\s*\)/.test(track);
			/*
			 * The host template is the only authority on whether the right sidebar owns a
			 * column. Deriving one from a measured pane is what left the conversation
			 * narrow after the sidebar was closed: a pane still mounted at 576px measured as
			 * "open", so the third track stayed 576px and the right half of the window went
			 * blank while the composer still spanned the full width.
			 */
			if (zeroed) hideStaleRightPanes();
			else revealRightPanes();
			if (track === "") track = "minmax(0px,0px)";
			if (frame.style.getPropertyValue(RB_TRACK_VAR) !== track) frame.style.setProperty(RB_TRACK_VAR, track);
		}

		function removeShippedSidebar() {
			preserveSeats();
			const frame = frameElement();
			if (frame === null) return;
			frame.setAttribute(FRAME_MARK, '');
			syncFrameTracks(frame);
			/*
			 * The host rewrites the inline template when the right sidebar is
			 * opened or closed, so the published template has to follow it or the
			 * right sidebar keeps the stale (zero) track.
			 */
			if (frameTrackTarget !== frame) {
				if (frameTrackObserver !== null) frameTrackObserver.disconnect();
				frameTrackObserver = new MutationObserver(() => syncFrameTracks(frame));
				frameTrackObserver.observe(frame, {
					attributes: true,
					attributeFilter: ['style', 'data-rightbar-collapsed', 'data-rightbar-fullscreen']
				});
				frameTrackTarget = frame;
			}
			/*
			 * The toolbar rows are cloned into the menus rather than moved, so the
			 * clones carry the row's own icon and label.
			 */
			syncToolRows();
			syncTaskChip();
		}

		/**
		 * Shorten the background-task chip.
		 *
		 * The chip spells out "1 个后台任务运行中" and takes 137px of the header for
		 * a single spinner. The count alone says the same thing, so the sentence is
		 * replaced by the number and the chevron that follows it is dropped - the
		 * chip still opens the task list on click.
		 * @returns {void}
		 */
		function syncTaskChip() {
			/* The settings page can switch the shortening off again. */
			if (loadUi().taskChip === "full") return;
			for (const count of document.querySelectorAll(".Ag-ohG_count")) {
				const text = (count.textContent || "").trim();
				const match = /(\d+)/.exec(text);
				if (match === null) continue;
				const number = match[1];
				/*
				 * The guard compares the visible text as well: React rewrites this
				 * node's text on every status re-render while leaving our marker
				 * attribute in place, so trusting the marker alone let the long
				 * sentence come back.
				 */
				const short = `${number} 个任务`;
				const trigger = count.closest("[class*='_trigger']");
				if (trigger !== null) {
					trigger.setAttribute("title", `${number} 个后台任务运行中`);
					trigger.setAttribute("aria-label", `${number} 个后台任务运行中`);
				}
				if (count.getAttribute("data-uidy-count") === number && text === short) continue;
				count.setAttribute("data-uidy-count", number);
				count.textContent = short;
			}
		}

		/**
		 * Undo `syncTaskChip`: put the sentence back when the preference is off.
		 *
		 * The host re-renders this node on every status change, so the restored
		 * text only has to survive until the next one; writing the long form
		 * now keeps the header readable in the meantime.
		 * @returns {void}
		 */
		function restoreTaskChip() {
			if (loadUi().taskChip !== "full") return;
			for (const count of document.querySelectorAll(".Ag-ohG_count")) {
				const number = count.getAttribute("data-uidy-count");
				if (number === null) continue;
				const text = (count.textContent || "").trim();
				if (text !== number) continue;
				count.textContent = number + " 个后台任务运行中";
			}
		}

		/**
		 * Undo `removeShippedSidebar`, used when the plugin is disposed.
		 *
		 * Since the seats are no longer moved, this only drops the marks; the nodes
		 * are where React always had them. Any parked seats left over from an
		 * earlier revision are handed back first so an upgrading page does not keep
		 * them stranded in the `#uidy-seats` container.
		 * @returns {void}
		 */
		function restoreShippedSidebar() {
			for (const frame of document.querySelectorAll('[' + FRAME_MARK + ']')) frame.removeAttribute(FRAME_MARK);
			for (let i = seatOrigins.length - 1; i >= 0; i -= 1) {
				const origin = seatOrigins[i];
				const node = origin.node;
				const parent = origin.parent;
				if (parent !== null && parent.isConnected && node.isConnected && node.parentElement !== parent) {
					if (origin.next !== null && origin.next.parentElement === parent) parent.insertBefore(node, origin.next);
					else parent.appendChild(node);
				}
			}
			seatOrigins.length = 0;
			for (const node of document.querySelectorAll('[' + SEAT_MARK + ']')) node.removeAttribute(SEAT_MARK);
			const park = document.getElementById('uidy-seats');
			if (park !== null) park.remove();
		}

		/* ---------------------------------------------------------------- *
		 * shell menu button injection
		 * ---------------------------------------------------------------- */

		const MENU_HOST_SELECTOR = "[data-windows-menu]";
		const MENU_BUTTON_ATTR = "data-dsh-ui-tidy-menu";
		const MENUBAR_SELECTOR = '[role="menubar"]';
		const FALLBACK_GRACE_MS = 2500;

		/*
		 * The shell menu bar is wide enough for four short menus, so the work is
		 * split by subject instead of stacked into one long list: panels, view
		 * actions, model-list switches, and the account/global items that used to
		 * live in the sidebar footer.
		 */
		/*
		 * The shell menu bar carries only the SUBJECT menus. The pages themselves
		 * are NOT a menu any more: each page is its own button in the title bar's
		 * right-hand cluster (`PageCluster`), which is what removes the duplicate
		 * entries — the same page used to appear once in the 面板 menu and again in
		 * the live sidebar rows mirrored beneath it.
		 */
const MENUS = [];
/*
 * The provider-list settings used to hang off a 模型 entry in the shell menu
 * bar. That button sat among the shell's own 应用 / 编辑 and read as a shell
 * menu while only tuning the model picker, so its toggles moved into the
 * picker itself (syncModelOptions) and the bar keeps the shell's own entries.
 */

		/*
		 * The page cluster is a fixed overlay in the title bar, right-aligned after
		 * a reserve for the OS caption buttons. The reserve is measured at runtime
		 * into this custom property; the fallback covers the first paint.
		 */
		const CAPTION_RESERVE_VAR = "--uidy-caption-reserve";
		const CLUSTER_LIMIT_VAR = "--uidy-cluster-limit";

		/*
		 * One glyph per shipped page, so the cluster reads at a glance. Pages that
		 * are not listed (another plugin's own entry) fall back to the generic
		 * panel glyph rather than showing a substitute glyph invented here.
		 */
		const PANEL_ICONS = {
			"panel.conversation": "chat",
			"panel.plugins": "plug",
			"panel.schedules": "clock",
			"panel.novelWriter": "book",
			"panel.skillExplorer": "star",
			"panel.bill": "chart"
		};

		/*
		 * The footer account trigger lives in the shipped sidebar footer, which is
		 * taken off-screen but kept mounted. Its popup is anchored to that trigger,
		 * so it is opened by clicking the real control rather than reproduced.
		 */
		const ACCOUNT_TRIGGER_SELECTOR = '[data-slot="sidebar.footer.action"] ~ * button, [class*="_5Qcc8a_trigger"]';

		/*
		 * User-resizable menu widths, kept per menu id in px and applied as an
		 * inline style on the shell button, which the shell does not rewrite.
		 * A width handed over this way is never escalated to `!important`.
		 */
		const MENU_WIDTH_KEY = "uidy:menuWidths";

		/**
		 * Read the stored per-menu widths.
		 * @returns a plain map of menu id to pixel width.
		 */
		function readMenuWidths() {
			try {
				const raw = window.localStorage.getItem(MENU_WIDTH_KEY);
				if (raw === null || raw === "") return {};
				const parsed = JSON.parse(raw);
				return parsed !== null && typeof parsed === "object" ? parsed : {};
			} catch {
				return {};
			}
		}

		/**
		 * Persist the per-menu widths.
		 * @param widths - the map to store.
		 * @returns {void}
		 */
		function writeMenuWidths(widths) {
			try {
				window.localStorage.setItem(MENU_WIDTH_KEY, JSON.stringify(widths));
			} catch {
				/* storage is optional: the width still applies for this page */
			}
		}

		/**
		 * Force the popup of one menu to a width.
		 * @param id - menu id.
		 * @param px - width in pixels (already clamped by the caller).
		 * @returns {void}
		 */
		function rememberMenuWidth(id, px) {
			const widths = readMenuWidths();
			widths[id] = Math.round(px);
			writeMenuWidths(widths);
			if (popup !== null) {
				popup.style.width = `${Math.round(px)}px`;
				popup.style.minWidth = `${Math.round(px)}px`;
				popup.style.maxWidth = `${Math.round(px)}px`;
			}
		}

		/**
		 * Create (once) the three menu bar buttons and keep them in sync.
		 * @returns true when the buttons sit in the shell menu bar.
		 */
function styleMenuBar(bar, shadow) {
	if (shadow !== null && shadow.querySelector("style[data-uidy-menubar-style]") === null) {
		const style = document.createElement("style");
		style.setAttribute("data-uidy-menubar-style", "");
		/*
		 * 应用 / 编辑 are the shell's own menus and they were drawn in a different
		 * weight and padding from the rest of the title bar. Inside this shadow
		 * root they are one row of flat controls, so they get one look: the same
		 * height, radius and hover the page buttons use.
		 */
		style.textContent = [
			`${MENUBAR_SELECTOR} button{height:28px;min-width:0;padding:0 10px;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:14px;line-height:1;cursor:pointer}`,
			`${MENUBAR_SELECTOR} button:hover{background:rgba(127,127,127,0.16)}`,
			`${MENUBAR_SELECTOR} button[aria-expanded="true"]{background:rgba(127,127,127,0.16)}`
		].join("\n");
		shadow.appendChild(style);
	}
	for (const node of [...bar.querySelectorAll("button")]) {
		if (node.getAttribute("data-uidy-menubar-btn") === null) node.setAttribute("data-uidy-menubar-btn", "true");
	}
}

		function syncMenuButton() {
			const host = document.querySelector(MENU_HOST_SELECTOR);
			const shadow = host === null ? null : host.shadowRoot;
			const bar = shadow === null ? null : shadow.querySelector(MENUBAR_SELECTOR);
			if (bar === null) return false;

			styleMenuBar(bar, shadow);
			const ids = new Set(MENUS.map((entry) => entry.id));
			for (const stale of [...bar.querySelectorAll(`[${MENU_BUTTON_ATTR}]`)]) {
				if (!ids.has(stale.getAttribute(MENU_BUTTON_ATTR))) stale.remove();
			}

			for (const entry of MENUS) {
				let button = bar.querySelector(`[${MENU_BUTTON_ATTR}="${entry.id}"]`);
				if (button === null) {
					button = document.createElement("button");
					button.type = "button";
					button.setAttribute(MENU_BUTTON_ATTR, entry.id);
					button.setAttribute("aria-haspopup", "menu");
					button.addEventListener("click", (event) => {
						event.stopPropagation();
						toggleMenuAt(button, entry.id);
					});
					button.addEventListener("keydown", (event) => {
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							toggleMenuAt(button, entry.id);
						}
					});
					bar.appendChild(button);
				}
				const label = tt(entry.labelKey);
				if (button.textContent !== label) button.textContent = label;
				if (button.title !== tt(entry.titleKey)) button.title = tt(entry.titleKey);
				const stored = readMenuWidths()[entry.id];
				if (typeof stored === "number" && Number.isFinite(stored) && stored >= 120) {
					const px = `${Math.round(stored)}px`;
					if (button.style.width !== px) button.style.width = px;
				}
				button.setAttribute("aria-expanded", store.get().menu === entry.id ? "true" : "false");
			}
			return true;
		}

		/**
		 * Append the button into the shell menu bar and keep it there.
		 *
		 * The shell owns that shadow root and re-renders it, so this observes the
		 * root and re-appends after the shell drops the node, and reports
		 * `fallback` once it is clear the host will never appear.
		 *
		 * @returns a disposer.
		 */
		function bootstrapMenuButton() {
			let shadowObserver = null;
			let documentObserver = null;
			let timer = null;

			const watchHost = () => {
				const host = document.querySelector(MENU_HOST_SELECTOR);
				const shadow = host === null ? null : host.shadowRoot;
				if (shadow === null || shadowObserver !== null) return;
				shadowObserver = new MutationObserver(() => {
					try {
						syncMenuButton();
					} catch (error) {
						console.warn("[ui-tidy] menu button re-append failed:", error);
					}
				});
				shadowObserver.observe(shadow, { childList: true });
			};

			const attempt = () => {
				try {
					watchHost();
					if (syncMenuButton()) {
						if (store.get().fallback) store.set({ fallback: false });
						return true;
					}
				} catch (error) {
					console.warn("[ui-tidy] shell menu injection failed:", error);
				}
				return false;
			};

			const dispose = () => {
				if (documentObserver !== null) documentObserver.disconnect();
				if (shadowObserver !== null) shadowObserver.disconnect();
				if (timer !== null) clearTimeout(timer);
				const host = document.querySelector(MENU_HOST_SELECTOR);
				const shadow = host === null ? null : host.shadowRoot;
				if (shadow === null) return;
				for (const button of shadow.querySelectorAll(`[${MENU_BUTTON_ATTR}]`)) button.remove();
			};

			if (attempt()) return dispose;

			documentObserver = new MutationObserver(() => {
				if (attempt() && documentObserver !== null) {
					documentObserver.disconnect();
					documentObserver = null;
				}
			});
			documentObserver.observe(document.documentElement, { childList: true, subtree: true });
			timer = setTimeout(() => {
				if (!syncMenuButton()) store.set({ fallback: true });
				if (documentObserver !== null) {
					documentObserver.disconnect();
					documentObserver = null;
				}
			}, FALLBACK_GRACE_MS);

			return dispose;
		}

		/* ---------------------------------------------------------------- *
		 * the popup, shared by the shell menu button and the fallback strip
		 * ---------------------------------------------------------------- */

		/**
		 * Live session search: debounced host query, results open the session.
		 * @param props - `{ onPick }`.
		 * @returns the search block.
		 */
		function SessionSearch(props) {
			const [query, setQuery] = react.useState("");
			const [outcome, setOutcome] = react.useState({ status: "idle", items: [] });

			react.useEffect(() => {
				const text = query.trim();
				if (text.length < 2) {
					setOutcome({ status: "idle", items: [] });
					return undefined;
				}
				const sessions = getService("sessions");
				if (sessions === null || typeof sessions.search !== "function") {
					setOutcome({ status: "unavailable", items: [] });
					return undefined;
				}
				const controller = typeof AbortController === "function" ? new AbortController() : null;
				let cancelled = false;
				const timer = setTimeout(() => {
					Promise.resolve(sessions.search(text, controller === null ? undefined : controller.signal))
						.then((result) => {
							if (cancelled) return;
							const ok = result !== null && typeof result === "object" && result.ok === true;
							const payload = ok ? result.value : null;
							const items = payload !== null && typeof payload === "object" && Array.isArray(payload.items) ? payload.items : [];
							setOutcome({ status: ok ? "done" : "error", items: items.slice(0, 8) });
						})
						.catch(() => {
							if (!cancelled) setOutcome({ status: "error", items: [] });
						});
				}, 220);
				return () => {
					cancelled = true;
					clearTimeout(timer);
					if (controller !== null) {
						try {
							controller.abort();
						} catch {
							/* already settled */
						}
					}
				};
			}, [query]);

			const body = [
				h("input", {
					key: "input",
					className: "uidy-search",
					type: "search",
					value: query,
					placeholder: tt("item.searchPlaceholder"),
					onChange: (event) => setQuery(event.target.value)
				})
			];
			if (outcome.status === "unavailable") body.push(h("div", { key: "na", className: "uidy-note" }, tt("item.searchUnavailable")));
			if (outcome.status === "done" && outcome.items.length === 0) {
				body.push(h("div", { key: "empty", className: "uidy-note" }, tt("item.searchEmpty")));
			}
			for (const item of outcome.items) {
				const snippet = String(item.snippet || "").replace(/\s+/g, " ").trim();
				body.push(
					h(
						"button",
						{
							key: `hit:${String(item.sessionId)}`,
							type: "button",
							role: "menuitem",
							className: "uidy-hit",
							title: snippet,
							onClick: () => props.onPick(String(item.sessionId))
						},
						snippet.slice(0, 58)
					)
				);
			}
			return h("div", { className: "uidy-searchbox" }, body);
		}

		/**
		 * The relocated session tree, rendered inside a menu.
		 *
		 * The tree is the host's own node, moved here by `relocateSessions()`; this
		 * component only holds the box it scrolls in. Rendering it (rather than a
		 * rebuilt list) keeps every host affordance — drag to reorder, per-row
		 * archive / pin, the workspace headings — exactly as shipped.
		 * @returns the container element.
		 */
		function SessionPanel() {
			const ref = react.useRef(null);
			react.useEffect(() => {
				const host = ref.current;
				if (host === null) return undefined;
				const moved = relocateSessions(host);
				return () => {
					if (moved !== null && moved.parentElement === host) restoreSessions(moved);
				};
			}, []);
			return h("div", { ref, className: "uidy-sessions", "data-uidy-sessionbox": "" });
		}

		/**
		 * The session browser, docked on the left of the conversation page.
		 *
		 * The session tree below is the host's own node, moved in by `SessionPanel`,
		 * so dragging, pinning, archiving and the workspace headings keep working.
		 * The search box is a live host query, and the two header buttons are the
		 * shipped new-session and add-workspace actions.
		 * @returns the dock element, or null while closed.
		 */
		function SessionsDock() {
			const state = useStore();
			if (state.sessionsDock !== true) return null;
			const close = () => store.set({ sessionsDock: false });
			return h(
				"div",
				{ className: "uidy-dock", "data-uidy-dock": "", role: "complementary" },
				h(
					"div",
					{ className: "uidy-dock-head" },
					h(
						"button",
						{
							type: "button",
							className: "uidy-dock-new",
							title: tt("item.newSession"),
							onClick: () => {
								close();
								startSession();
							}
						},
						h(Icon, { name: "plus" }),
						h("span", null, tt("item.newSession"))
					),
					h(
						"button",
						{
							type: "button",
							className: "uidy-dock-act",
							title: tt("dock.close"),
							"aria-label": tt("dock.close"),
							onClick: close
						},
						h("span", { "aria-hidden": "true" }, "×")
					)
				),
				h(SessionSearch, {
					onPick: (sessionId) => {
						close();
						openSessionById(sessionId);
					}
				}),
				h(SessionPanel)
			);
		}

		/**
		 * The action popup: New session, session search, the main panels, the
		 * model-list switches, the right sidebar and the sidebar toggle.
		 * @returns the popup element, or null while closed.
		 */
		function ActionMenu() {
			const state = useStore();
			const activePanelId = useActivePanelId();
			usePrefs();
			const ref = react.useRef(null);
			const activeMenuId = state.menu;

			/*
			 * The popup is drag-resizable on its right edge. The width is applied
			 * inline and remembered per menu, so a wide model list is a one-time
			 * setup rather than a per-open drag. `pointercancel` ends the gesture
			 * too, otherwise a cancelled drag would keep following the cursor.
			 */
			const onResizeStart = (event) => {
				if (activeMenuId === null) return;
				const element = ref.current;
				if (element === null) return;
				event.preventDefault();
				event.stopPropagation();
				const startX = event.clientX;
				const startWidth = element.getBoundingClientRect().width;
				const onMove = (moveEvent) => {
					const next = Math.min(Math.max(startWidth + (moveEvent.clientX - startX), 220), Math.max(320, window.innerWidth - 80));
					element.style.width = `${Math.round(next)}px`;
					element.style.minWidth = `${Math.round(next)}px`;
					element.style.maxWidth = `${Math.round(next)}px`;
				};
				const onEnd = () => {
					window.removeEventListener("pointermove", onMove, true);
					window.removeEventListener("pointerup", onEnd, true);
					window.removeEventListener("pointercancel", onEnd, true);
					rememberMenuWidth(activeMenuId, element.getBoundingClientRect().width);
				};
				window.addEventListener("pointermove", onMove, true);
				window.addEventListener("pointerup", onEnd, true);
				window.addEventListener("pointercancel", onEnd, true);
			};

			react.useEffect(() => {
				if (state.menu === null) return undefined;
				const onPointerDown = (event) => {
					const path = typeof event.composedPath === "function" ? event.composedPath() : [];
					for (const node of path) {
						if (node === null || typeof node !== "object") continue;
						if (typeof node.hasAttribute === "function" && node.hasAttribute(MENU_BUTTON_ATTR)) return;
						if (node.classList !== null && typeof node.classList === "object" && node.classList.contains("uidy-btn")) return;
					}
					const element = ref.current;
					if (element !== null && !element.contains(event.target)) closeMenu();
				};
				const onKeyDown = (event) => {
					if (event.key === "Escape") closeMenu();
				};
				document.addEventListener("pointerdown", onPointerDown, true);
				document.addEventListener("keydown", onKeyDown, true);
				return () => {
					document.removeEventListener("pointerdown", onPointerDown, true);
					document.removeEventListener("keydown", onKeyDown, true);
				};
			}, [state.menu]);

			if (state.menu === null || state.anchor === null) return null;

			const menuId = state.menu;
			const isActive = (panelId) =>
				panelId === null ? activePanelId === null || activePanelId === "conversation" : activePanelId === panelId;

			const rows = [];

			/*
			 * There is deliberately no 面板 branch here any more. Pages used to be a
			 * menu AND a mirror of the live sidebar rows, which listed the same four
			 * panels twice. Each page is now one button in the title bar's right-hand
			 * cluster (`PageCluster`), so this menu has nothing to say about them.
			 */

			/*
			 * The session browser. The tree is the host's own list, moved into the
			 * popup, so selecting, dragging and the per-row actions behave exactly as
			 * they did in the sidebar this plugin replaced. The search box above it is a
			 * live host query. Adding a workspace is deliberately absent here: the tree
			 * renders its own button, and two of them would be one too many.
			 */
			if (menuId === "sessions") {
				rows.push(
					h(
						"button",
						{
							key: "new",
							type: "button",
							role: "menuitem",
							className: "uidy-item",
							onClick: () => {
								closeMenu();
								startSession();
							}
						},
						h("span", { className: "uidy-item-ico" }, h(Icon, { name: "plus" })),
						h("span", null, tt("item.newSession"))
					)
				);
				rows.push(h("div", { key: "d0", className: "uidy-divider" }));
				rows.push(
					h(SessionSearch, {
						key: "search",
						onPick: (sessionId) => {
							closeMenu();
							openSessionById(sessionId);
						}
					})
				);
				rows.push(h("div", { key: "d1", className: "uidy-divider" }));
				/* The session tree prints its own 会话 heading; a second one read as two stacked titles. */
				rows.push(h(SessionPanel, { key: "sessions" }));
			}
			if (menuId === "custom") {
				const custom = loadCustom();
				const pages = readPages();
				const pinned = loadPinned();
				rows.push(h("div", { key: "label-pages", className: "uidy-group" }, "顶栏页面"));
				for (const page of pages) {
					const on = !pinned.includes(page.key);
					rows.push(
						h(
							"div",
							{
								key: "page:" + page.key,
								role: "menuitemcheckbox",
								"aria-checked": on ? "true" : "false",
								className: on ? "uidy-item uidy-item-on" : "uidy-item",
								tabIndex: 0,
								onClick: () => {
									togglePinned(
										page.key,
										pages.map((entry) => entry.key)
									);
								},
							},
							h("span", { className: "uidy-item-ico" }, on ? h(Icon, { name: "check" }) : null),
							h("span", null, page.label),
							h(
								"button",
								{
									type: "button",
									className: "uidy-custom-run",
									onClick: (event) => {
										event.stopPropagation();
										closeMenu();
										dismissForeignOverlays(overlayKindOf(page.label));
										store.set({ sessionsDock: false });
										if (page.rowLabel === null) selectPanel(page.panelId);
										else clickToolRow(page.rowLabel);
									},
								},
								"打开"
							)
						)
					);
				}
				rows.push(h("div", { key: "label-custom", className: "uidy-group" }, "会话页工具"));
				for (const action of CUSTOM_ACTIONS) {
					const on = custom.includes(action.key);
					rows.push(
						h(
							"div",
							{
								key: "custom:" + action.key,
								role: "menuitemcheckbox",
								"aria-checked": on ? "true" : "false",
								className: on ? "uidy-item uidy-item-on" : "uidy-item",
								tabIndex: 0,
								onClick: () => {
									const next = on
										? custom.filter((key) => key !== action.key)
										: custom.concat(action.key);
									saveCustom(next);
									store.set({ custom: next });
								},
							},
							h("span", { className: "uidy-item-ico" }, on ? h(Icon, { name: "check" }) : null),
							h("span", null, action.label),
							h(
								"button",
								{
									type: "button",
									className: "uidy-custom-run",
									onClick: (event) => {
										event.stopPropagation();
										closeMenu();
										action.run();
									},
								},
								"打开"
							)
						)
					);
				}
				rows.push(h("div", { key: "custom-hint", className: "uidy-custom-hint" }, "勾选的会出现在顶栏右侧；未勾选的点「打开」直接使用。"));
			}
			if (menuId === "model") {
				rows.push(h("div", { key: "label-model", className: "uidy-group" }, tt("group.modelList")));
				for (const toggle of MODEL_TOGGLES) {
				const on = prefs[toggle.key] === true;
				rows.push(
					h(
						"button",
						{
							key: `toggle:${toggle.key}`,
							type: "button",
							role: "menuitemcheckbox",
							"aria-checked": on,
							className: "uidy-item",
							onClick: () => {
								prefs[toggle.key] = on !== true;
								commitPrefs();
							}
						},
						h("span", { className: "uidy-item-ico" }, on ? h(Icon, { name: "check" }) : null),
						h("span", null, tt(toggle.label))
					)
				);
			}
			}

			/*
			 * The account menu used to hang off the sidebar footer. Its popup is
			 * positioned relative to the trigger element, so the shell's own trigger
			 * is clicked instead of re-implementing the menu; the popup then appears
			 * where the shell would have put it.
			 */
			if (menuId === "account") {
				const profile = readAccountProfile();
				rows.push(
					h(
						"div",
						{ key: "account-head", className: "uidy-account-head" },
						profile.avatar === null
							? h("span", { className: "uidy-item-ico" }, h(Icon, { name: "user" }))
							: h("img", { className: "uidy-account-avatar", src: profile.avatar, alt: profile.name }),
						h("span", null, profile.name)
					)
				);
				rows.push(h("div", { key: "d-acct", className: "uidy-divider" }));
				for (const item of HOST_ACCOUNT_ITEMS) {
					rows.push(
						h(
							"button",
							{
								key: "account-item:" + item,
								type: "button",
								role: "menuitem",
								className: "uidy-item",
								onClick: () => {
									closeMenu();
									runHostAccountItem(item);
								},
							},
							h("span", { className: "uidy-item-ico" }, h(Icon, { name: "user" })),
							h("span", null, item)
						)
					);
				}
				rows.push(h("div", { key: "d-acct-2", className: "uidy-divider" }));
				rows.push(h("div", { key: "label-maint", className: "uidy-group" }, tt("group.maintenance")));
				rows.push(
					h(
						"button",
						{
							key: "reload",
							type: "button",
							role: "menuitem",
							className: "uidy-item",
							onClick: () => {
								closeMenu();
								window.location.reload();
							},
						},
						h("span", { className: "uidy-item-ico" }, h(Icon, { name: "refresh" })),
						h("span", null, tt("item.reloadUi"))
					)
				);
			}

			/*
			 * This block used to hold 插件 / 显示-隐藏侧栏 / 打开右侧栏. Each had a second
			 * home: 插件 is a page button, 打开右侧栏 is the header corner toggle, and
			 * 显示/隐藏侧栏 acted on a sidebar this plugin removes, so it was a dead row.
			 */

			const menuWidth = menuId === "sessions" ? 330 : 250;
			/*
			 * A popup anchored under a button near the window's right edge would
			 * hang off the screen, so it opens to the LEFT of that button: its own
			 * right edge lines up with the button's right edge.
			 */
			const anchorRight = state.anchor.right === undefined ? null : state.anchor.right;
			const wantedLeft =
				anchorRight === null ? state.anchor.left : anchorRight - menuWidth;
			return h(
				"div",
				{
					ref,
					role: "menu",
					className: menuId === "sessions" ? "uidy-menu uidy-menu-fixed uidy-menu-sessions" : "uidy-menu uidy-menu-fixed",
					style: {
						left: `${Math.round(clampAnchorLeft(wantedLeft, menuWidth))}px`,
						top: `${Math.round(state.anchor.top)}px`
					}
				},
				rows,
				h("div", {
					key: "resize",
					className: "uidy-resize",
					"aria-hidden": "true",
					onPointerDown: onResizeStart
				})
			);
		}

		/**
		 * Always-mounted overlay entry: the sidebar rules plus the popup.
		 * @returns the overlay element.
		 */
		/* ---------------------------------------------------------------- *
		 * page cluster — one button per page, at the title bar's right end
		 * ---------------------------------------------------------------- */

		/**
		 * The pages that get a button of their own.
		 *
		 * The shipped pages come from `PANELS`; anything another plugin injected
		 * beside them (小说工坊, 记忆) is appended from the live rows, minus the rows
		 * `PANELS` already names — that subtraction is what keeps a page from
		 * appearing twice.
		 * @returns an array of `{ key, label, icon, panelId, rowLabel }`.
		 */
		/*
		 * Two of the sidebar entries are not pages at all: novel-forge and mneme
		 * both open a surface that sits ON TOP of whatever page is selected. Left
		 * alone they trap the user - picking another page changes it underneath
		 * while the overlay keeps covering it, so the only way out is to click the
		 * same entry again. Every page switch therefore dismisses a foreign
		 * overlay first, which is what makes those two entries behave like the
		 * other pages from the top bar.
		 *
		 * The close paths are the plugins' own public entry points: novel-forge
		 * toggles off when its entry button is clicked, mneme has a labelled close
		 * button with an Escape fallback. Neither is a private hook.
		 */
		const NOVELFORGE_ACTIVE = "data-dsh-novelforge-active";

		/**
		 * Which kind of overlay, if any, a page opens.
		 * @param label the page label.
		 * @returns "novelforge" | "mneme" | null.
		 */
		function overlayKindOf(label) {
			for (const row of document.querySelectorAll("[data-dsh-novelforge-entry]")) {
				if ((row.textContent || "").trim() === label) return "novelforge";
			}
			for (const row of document.querySelectorAll("[data-mneme-overlay-opener]")) {
				if ((row.textContent || "").trim() === label) return "mneme";
			}
			return null;
		}

		function novelForgeOpen() {
			return document.documentElement.hasAttribute(NOVELFORGE_ACTIVE);
		}

		function mnemeOpen() {
			return document.querySelector(".mneme-overlay") !== null || document.querySelector(".mneme-backdrop") !== null;
		}

		/**
		 * Close whichever foreign overlay is showing, except the one being opened.
		 * @param keep the overlay kind that must stay open, or null.
		 * @returns {void}
		 */
		function dismissForeignOverlays(keep) {
			if (keep !== "novelforge" && novelForgeOpen()) {
				const entry = document.querySelector("[data-dsh-novelforge-entry]");
				if (entry instanceof HTMLElement) entry.click();
			}
			if (keep !== "mneme" && mnemeOpen()) {
				const close = document.querySelector('.mneme-footbtn[aria-label="关闭"]');
				if (close instanceof HTMLElement) close.click();
				else {
					window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
					/* The opener toggles the overlay, so clicking it again closes it. */
					if (mnemeOpen()) {
						const opener = document.querySelector("[data-mneme-overlay-opener]");
						if (opener instanceof HTMLElement) opener.click();
					}
				}
			}
		}

		const CUSTOM_KEY = "dsh-ui-tidy.custom";

/* The subagent plugin ships its own artwork; borrowing it keeps the two
 * entries recognisably the same feature. */
const SAM_ICON_MARKUP = '<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="21" width="12" height="12" rx="2.6" fill="url(#dsh_sam_art_leafA)" fill-opacity="0.72"></rect><rect x="12" y="14" width="13" height="13" rx="2.8" fill="url(#dsh_sam_art_leafB)" fill-opacity="0.8"></rect><rect x="18" y="6" width="14" height="14" rx="3" fill="url(#dsh_sam_art_leafC)" fill-opacity="0.9"></rect><path d="M25 12.2h-2.6" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="1.7" stroke-linecap="round"></path><path d="M24.6 16.4h-3.4" stroke="#FFFFFF" stroke-opacity="0.72" stroke-width="1.7" stroke-linecap="round"></path><defs><linearGradient id="dsh_sam_art_leafA" x1="12" y1="21" x2="12" y2="33" gradientUnits="userSpaceOnUse"><stop stop-color="#45E7A4"></stop><stop offset="1" stop-color="#05909D"></stop></linearGradient><linearGradient id="dsh_sam_art_leafB" x1="18.5" y1="14" x2="18.5" y2="27" gradientUnits="userSpaceOnUse"><stop stop-color="#7FD1FF"></stop><stop offset="1" stop-color="#2BA6C9"></stop></linearGradient><linearGradient id="dsh_sam_art_leafC" x1="25" y1="6" x2="25" y2="20" gradientUnits="userSpaceOnUse"><stop stop-color="#69B9FF"></stop><stop offset="1" stop-color="#324DE2"></stop></linearGradient></defs></svg>';

const CUSTOM_ACTIONS = [
	{ key: "subagent", label: "子代理", icon: "agents", markup: SAM_ICON_MARKUP, selector: ".dsh-sam-trigger", run: () => runConversationAction(".dsh-sam-trigger") },
	{ key: "workflow", label: "工作流", icon: "flow", selector: ".mneme-pipe-trigger", run: () => runConversationAction(".mneme-pipe-trigger") },
	{ key: "tasks", label: "后台任务", icon: "clock", selector: ".Ag-ohG_trigger", run: () => runConversationAction(".Ag-ohG_trigger") }
];

const CUSTOM_CSS = [
	"/* icon only buttons: the title bar shows glyphs, the name comes on hover */",
	"/* provider-list settings, drawn inside the picker itself */",
	".uidy-opts-title{padding:6px 10px 2px;font-size:12px;opacity:.6}",
	".uidy-opts-row{display:flex;align-items:center;gap:8px;width:100%;height:28px;padding:0 10px;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:13px;text-align:left;cursor:pointer}",
	".uidy-opts-row:hover{background:rgba(127,127,127,0.16)}",
	".uidy-opts-check{display:inline-flex;width:14px;justify-content:center;opacity:.9}",
	".uidy-item-tag{margin-left:auto;font-size:11px;opacity:.55}",
	".uidy-page-icon{width:28px;padding:0;justify-content:center;gap:0}",
	".uidy-page-ico{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}",
	".uidy-page-ico > svg{width:14px;height:14px;display:block}",
	".uidy-page-avatar{width:18px;height:18px;border-radius:50%;object-fit:cover;display:block}",
	".uidy-account-head{display:flex;align-items:center;gap:8px;padding:4px 8px 6px;font-size:13px}",
	".uidy-account-avatar{width:24px;height:24px;border-radius:50%;object-fit:cover;display:block}",
	"/* the settings page: plain rows, no card chrome, the panel already has one */",
	".uidy-set{padding:2px 2px 18px;font-size:14px;line-height:1.5}",
	".uidy-set-title{font-size:16px;font-weight:500;margin:0 0 4px}",
	".uidy-set-desc{font-size:12px;line-height:1.6;opacity:.6;margin:0 0 14px}",
	".uidy-set-head{font-size:12px;opacity:.6;margin:18px 0 6px}",
	".uidy-set-row{display:flex;align-items:center;gap:8px;min-height:28px;margin:1px 0;cursor:pointer}",
	".uidy-set-row > input[type=checkbox]{width:14px;height:14px;margin:0;flex:0 0 auto;accent-color:currentColor;cursor:pointer}",
	".uidy-set-row > select,.uidy-set-row > input[type=number]{height:26px;border-radius:6px;border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;font:inherit;font-size:13px;padding:0 6px;cursor:pointer}",
	".uidy-set-row > input[type=number]{width:72px;cursor:text}",
	".uidy-set-hint{opacity:.5;font-size:12px}",
	"/* hover name for every cluster button: a glyph alone leaves newcomers guessing */",
	".uidy-page{position:relative}",
	".uidy-page[data-name]:hover::after{content:attr(data-name);position:absolute;top:32px;left:50%;transform:translateX(-50%);padding:3px 8px;border-radius:6px;white-space:nowrap;font-size:12px;line-height:18px;background:var(--dsw-alias-bg-layer-2,#2a2a2a);color:var(--dsw-alias-label-primary,#fff);border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28));box-shadow:var(--dsw-shadow-lv2,0 4px 12px rgba(0,0,0,.25));pointer-events:none;z-index:1300}",
	"/* the subagent drawer opens below the title bar and the session row, so its own close button never lands on the window controls */",
	".dsh-sam-backdrop{top:84px !important}",
	".dsh-sam-panel{height:100% !important;border-top-left-radius:12px}",
	"/* the memory sheet: a sheet, not a takeover - the page behind stays legible */",
	".mneme-backdrop{background:rgba(0,0,0,.14) !important;-webkit-backdrop-filter:none !important;backdrop-filter:none !important}",
	".mneme-overlay{top:56px !important;border-radius:14px !important}",
].join("\n");

function loadCustom() {
	try {
		const raw = localStorage.getItem(CUSTOM_KEY);
		const parsed = raw === null ? null : JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.filter((key) => typeof key === "string") : [];
	} catch {
		return [];
	}
}
function saveCustom(list) {
	try {
		localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
	} catch {
		/* storage unavailable */
	}
}

function clickSelector(selector) {
	const node = document.querySelector(selector);
	if (node !== null && typeof node.click === "function") node.click();
}

/**
 * The glyph the control itself draws.
 *
 * The workflow, task and subagent controls are drawn by their own plugins on
 * the conversation header. Borrowing their artwork keeps one icon per
 * feature instead of an invented look-alike.
 * @param selector - the control.
 * @returns SVG markup, or null when the control draws none.
 */
function readTriggerIcon(selector) {
	try {
		const node = document.querySelector(selector);
		if (node === null) return null;
		const svg = node.querySelector("svg");
		return svg === null ? null : svg.outerHTML;
	} catch {
		return null;
	}
}

function customGlyph(action) {
	if (typeof action.markup === "string" && action.markup !== "") {
		return h("span", { className: "uidy-page-ico", dangerouslySetInnerHTML: { __html: action.markup } });
	}
	const markup = action.selector === undefined ? null : readTriggerIcon(action.selector);
	if (markup !== null) return h("span", { className: "uidy-page-ico", dangerouslySetInnerHTML: { __html: markup } });
	return h(Icon, { name: action.icon });
}

/**
 * Run a control that only exists on the conversation page.
 *
 * The workflow, background-task and subagent controls are docked into the
 * conversation header by their own plugins, so they are simply not in the
 * document while another page is showing. Jumping to the conversation first
 * is what makes the title-bar entry work from anywhere instead of only when
 * the user happens to be on that page already.
 * @param selector - the control to click.
 * @returns {void}
 */
function runConversationAction(selector) {
	if (document.querySelector(selector) !== null) {
		clickSelector(selector);
		return;
	}
	selectPanel(null);
	setTimeout(() => clickSelector(selector), 280);
}

const PAGE_ORDER_KEY = "dsh-ui-tidy.pageOrder";

		/*
		 * Which pages the title bar carries. The stored value is the list of pages
		 * the user switched OFF in the + menu, so a page nobody has an opinion
		 * about — including one a plugin registered five minutes ago — is carried.
		 */
		const PINNED_KEY = "dsh-ui-tidy.hidden";

		function loadPinned() {
			try {
				const rawPinned = localStorage.getItem(PINNED_KEY);
				if (rawPinned === null) return [];
				const parsed = JSON.parse(rawPinned);
				return Array.isArray(parsed) ? parsed.filter((key) => typeof key === "string") : [];
			} catch {
				return [];
			}
		}

		function savePinned(list) {
			try {
				if (list === null) localStorage.removeItem(PINNED_KEY);
				else localStorage.setItem(PINNED_KEY, JSON.stringify(list));
			} catch {
				/* storage unavailable */
			}
		}

		/**
		 * Switch one page off or back on.
		 * @param key - the page key.
		 * @param allKeys - unused today; kept so callers stay unchanged.
		 * @returns {void}
		 */
		function togglePinned(key, allKeys) {
			void allKeys;
			const current = loadPinned();
			const next = current.includes(key) ? current.filter((entry) => entry !== key) : current.concat(key);
			savePinned(next);
			store.set({ pinned: next });
		}

		function loadPageOrder() {
			try {
				const raw = localStorage.getItem(PAGE_ORDER_KEY);
				const parsed = raw === null ? null : JSON.parse(raw);
				return Array.isArray(parsed) ? parsed.filter((key) => typeof key === "string") : [];
			} catch {
				return [];
			}
		}

		function savePageOrder(order) {
			try {
				localStorage.setItem(PAGE_ORDER_KEY, JSON.stringify(order));
			} catch {
				/* storage unavailable */
			}
		}

		/**
		 * Apply the user's stored button order.
		 *
		 * Pages are matched by a stable key so the order survives an official
		 * upgrade, and pages the user has never moved keep their shipped order
		 * after the ones that were placed by hand.
		 * @param pages the pages as discovered.
		 * @param order the stored keys.
		 * @returns the pages in display order.
		 */
		function sortPages(pages, order) {
			if (order.length === 0) return pages;
			const rank = new Map();
			order.forEach((key, index) => rank.set(key, index));
			const placed = [];
			const rest = [];
			for (const page of pages) {
				const at = rank.get(page.key);
				if (at === undefined) rest.push(page);
				else placed.push({ page, at });
			}
			placed.sort((left, right) => left.at - right.at);
			return [...placed.map((entry) => entry.page), ...rest];
		}

function readPanelIcons() {
	const icons = new Map();
	try {
		/*
		 * A panel that registers only into the main slot (the usage report does)
		 * draws no sidebar row, so there is no live row to borrow its glyph from.
		 * A plugin that ships an icon publishes it behind a data-dsh-panel-entry
		 * marker; reading that keeps the plugin's own artwork instead of drawing
		 * a substitute here.
		 */
		for (const node of document.querySelectorAll("[data-dsh-panel-entry]")) {
			const id = node.getAttribute("data-dsh-panel-entry");
			if (id === null || id === "" || icons.has(id)) continue;
			const svg = node.tagName.toLowerCase() === "svg" ? node : node.querySelector("svg");
			if (svg === null) continue;
			icons.set(id, svg.outerHTML);
		}
	} catch {
		/* the marker is optional */
	}
	return icons;
}

		function readPages() {
			const pages = [];
			const named = new Set();
			const add = (page) => {
				if (page.label === "" || named.has(page.label)) return;
				named.add(page.label);
				pages.push(page);
			};
			/* The conversation is the host default and has no row of its own. */
			add({ key: "p:null", label: tt("panel.conversation"), icon: "chat", iconMarkup: null, panelId: null, rowLabel: null });
const rows = store.get().toolRows;
			const panelIcons = readPanelIcons();
			const discovered = new Map();
			for (const row of rows) {
				if (row.panelId === null || row.panelId === undefined || row.panelId === "") continue;
				discovered.set(row.panelId, row);
			}
			/*
			 * A panel that registers into the main slot without drawing a sidebar
			 * row (the usage panel does) leaves no live mark to read, so the shipped
			 * list is the fallback for those - and only for those.
			 */
			const shipped = new Set();
			for (const panel of PANELS) {
				if (panel.id === null) continue;
				shipped.add(String(panel.id));
				const row = discovered.get(panel.id);
				if (row === undefined) {
					add({ key: "p:" + String(panel.id), label: tt(panel.key), icon: PANEL_ICONS[panel.key] ?? "panel", iconMarkup: panelIcons.get(String(panel.id)) ?? null, panelId: panel.id, rowLabel: null });
					continue;
				}
				/* The live row keeps the host glyph the plugin was given. */
				add({ key: "p:" + String(panel.id), label: row.label, icon: "panel", iconMarkup: row.icon, panelId: panel.id, rowLabel: null });
			}
			/* A panel this build has never heard of keeps its own place at the end. */
			for (const [id, row] of discovered) {
				if (shipped.has(String(id))) continue;
				add({ key: "p:" + String(id), label: row.label, icon: "panel", iconMarkup: row.icon ?? panelIcons.get(String(id)) ?? null, panelId: id, rowLabel: null });
			}
			/* Rows that open a surface instead of a panel (novel forge, memory). */
			for (const row of rows) {
				if (row.panelId !== null && row.panelId !== undefined && row.panelId !== "") continue;
				add({ key: "r:" + row.label, label: row.label, icon: "panel", iconMarkup: row.icon, panelId: null, rowLabel: row.label });
			}
			return pages;
		}

		/**
		 * Width reserved for the OS caption buttons, measured rather than assumed.
		 * `getTitlebarAreaRect` reports the area the title bar is allowed to draw in;
		 * everything to its right belongs to the window controls.
		 * @returns the reserve in CSS pixels.
		 */
		/**
		 * Keep a popup inside the window.
		 * @param left - the wanted left edge.
		 * @param width - the popup width.
		 * @returns the left edge to use.
		 */
		function clampAnchorLeft(left, width) {
			const limit = window.innerWidth - width - 8;
			return Math.max(8, Math.min(left, limit));
		}

		function readCaptionReserve() {
			try {
				const overlay = navigator.windowControlsOverlay;
				if (overlay !== undefined && overlay !== null && overlay.visible === true) {
					const rect = overlay.getTitlebarAreaRect();
					const reserve = window.innerWidth - (rect.x + rect.width);
					if (Number.isFinite(reserve) && reserve > 0) return reserve;
				}
			} catch {
				/* overlay API unavailable */
			}
			return 138;
		}

		/**
		 * The left bound the cluster may not cross: the right edge of the shell's own
		 * menu bar, plus a little breathing room.
		 * @returns the x coordinate in CSS pixels.
		 */
		function readClusterLimit() {
			const host = document.querySelector("[data-windows-menu]");
			const rect = host === null ? null : host.getBoundingClientRect();
			const right = rect !== null && rect.width > 0 ? rect.right : 346;
			return right + 12;
		}

		/**
		 * One page button.
		 * @param props - `{ page, active }`.
		 * @returns the button element.
		 */
		function PageButton(props) {
			const page = props.page;
			const iconOnly = props.iconOnly === true;
			const glyph =
				page.iconMarkup !== null && page.iconMarkup !== undefined
					? h("span", { className: "uidy-page-ico", dangerouslySetInnerHTML: { __html: page.iconMarkup } })
					: h(Icon, { name: page.icon });
		return h(
			"button",
			{
				type: "button",
				className: iconOnly ? "uidy-page uidy-page-icon" : "uidy-page",
				title: page.label,
				"data-name": page.label,
				"aria-label": page.label,
				"aria-current": props.active ? "page" : undefined,
				"data-active": props.active ? "true" : "false",
				"data-page": page.key,
				draggable: true,
				onDragStart: (event) => {
					if (event.dataTransfer === null) return;
					event.dataTransfer.effectAllowed = "move";
					event.dataTransfer.setData("text/plain", page.key);
				},
				onDragOver: (event) => {
					if (event.dataTransfer === null) return;
					event.preventDefault();
					event.dataTransfer.dropEffect = "move";
				},
				onDrop: (event) => {
					if (event.dataTransfer === null) return;
					const from = event.dataTransfer.getData("text/plain");
					if (from === "" || from === page.key) return;
					event.preventDefault();
					props.onReorder(from, page.key);
				},
				onClick: () => {
					dismissForeignOverlays(overlayKindOf(page.label));
					/* Leaving the conversation closes the dock; it belongs to that page. */
					store.set({ sessionsDock: false });
					/* A null panelId is the conversation panel, so it must be selected too. */
					if (page.rowLabel === null) selectPanel(page.panelId);
					else clickToolRow(page.rowLabel);
				},
			},
			glyph,
			iconOnly ? null : h("span", null, page.label)
		);
		}

		/**
		 * The session browser toggle.
		 *
		 * It heads the page cluster so the session list, its live search and the
		 * workspace headings are one click away without pretending to be a page.
		 * The dock is a panel of the conversation page, so it is closed whenever the
		 * cluster switches to another page.
		 * @returns the toggle button.
		 */
		function SessionsToggle(props) {
			const state = useStore();
			const open = state.menu === "sessions";
			return h(
				"button",
				{
					type: "button",
					className: "uidy-page uidy-page-icon",
					title: tt("dock.toggle"),
					"data-name": tt("dock.toggle"),
					"aria-label": tt("dock.toggle"),
					"aria-haspopup": "menu",
					"aria-expanded": open ? "true" : "false",
					"data-active": open ? "true" : "false",
					"data-uidy-sessions-toggle": "",
					"data-fixed": "",
					onDragOver: (event) => event.preventDefault(),
					onDrop: (event) => {
						event.preventDefault();
						const from = event.dataTransfer === null ? "" : event.dataTransfer.getData("text/plain");
						if (from !== "" && typeof props.onReorder === "function") props.onReorder(from, props.firstKey);
					},
					onClick: (event) => toggleMenuAt(event.currentTarget, "sessions")
				},
				h(Icon, { name: "list" })
			);
		}
		/**
		 * The page cluster.
		 *
		 * It is a fixed overlay rather than a child of the shell's menu bar: the menu
		 * bar is a fixed-width flex row the shell positions itself, so anything
		 * appended to it would continue rightwards from 应用/编辑 instead of hugging
		 * the window's right edge. Only the buttons take the pointer, so the cluster
		 * can never swallow a click meant for the menus beneath it.
		 *
		 * The buttons do not shrink or scroll — a page that does not fit moves into a
		 * 更多 popup instead, which is what keeps the cluster from overlapping the
		 * shell menus in a narrow window. The fit is computed from the natural width
		 * of each button, measured in a hidden row so the visible cluster never has to
		 * reflow to find out how wide it wants to be.
		 * @returns the cluster element.
		 */
		/**
		 * The customisable right-hand group: the enabled actions, the picker, and
		 * the account trigger. The account popup is opened straight from here —
		 * routing it through a menu only added a level of nesting.
		 * @returns the cluster fragment.
		 */
		function CustomBar() {
			const state = useStore();
			const enabled = loadCustom();
			const nodes = [];
			for (const key of enabled) {
				const action = CUSTOM_ACTIONS.find((candidate) => candidate.key === key);
				if (action === undefined) continue;
				nodes.push(
					h(
						"button",
						{
							key: "custom:" + action.key,
							type: "button",
							className: "uidy-page uidy-page-icon",
							title: action.label,
							"data-name": action.label,
							"aria-label": action.label,
							"data-fixed": "",
							onClick: action.run
						},
customGlyph(action)
					)
				);
			}
			nodes.push(
				h(
					"button",
					{
						key: "custom-picker",
						type: "button",
						className: "uidy-page uidy-page-icon",
						title: "自定义顶栏功能",
						"data-name": "自定义顶栏功能",
						"aria-label": "自定义顶栏功能",
						"aria-haspopup": "menu",
						"aria-expanded": state.menu === "custom" ? "true" : "false",
						"data-active": state.menu === "custom" ? "true" : "false",
						"data-fixed": "",
						onClick: (event) => toggleMenuAt(event.currentTarget, "custom")
					},
					h(Icon, { name: "plus" })
				)
			);
			/* The account opens its own popup, anchored under this button. */
			const profile = readAccountProfile();
			nodes.push(
				h(
					"button",
					{
						key: "account",
						type: "button",
						className: "uidy-page uidy-page-icon",
						title: profile.name,
						"data-name": profile.name || "账号",
						"aria-label": profile.name,
						"aria-haspopup": "menu",
						"aria-expanded": state.menu === "account" ? "true" : "false",
						"data-active": state.menu === "account" ? "true" : "false",
						"data-fixed": "",
						onClick: (event) => toggleMenuAt(event.currentTarget, "account")
					},
					profile.avatar === null
						? h(Icon, { name: "user" })
						: h("img", { className: "uidy-page-avatar", src: profile.avatar, alt: profile.name })
				)
			);
		return h(react.Fragment, null, nodes);
		}

		function PageCluster() {
			const activePanelId = useActivePanelId();
			useStore();
			/* The settings page owns these two; read them on every render. */
			const ui = loadUi();
			const iconOnly = ui.iconOnly !== false;
			const [order, setOrder] = react.useState(loadPageOrder);
			const pages = sortPages(readPages(), order);
			/*
			 * Dropping a button onto another one moves it in front of that one and
			 * the result is persisted, so the bar keeps the arrangement across
			 * restarts. Keys are stable, which is what makes the order survive an
			 * official upgrade.
			 */
			const reorder = (from, to) => {
				const next = pages.map((page) => page.key).filter((key) => key !== from);
				const at = next.indexOf(to);
				if (at < 0) return;
				next.splice(at, 0, from);
				savePageOrder(next);
				setOrder(next);
			};
			const ghostRef = react.useRef(null);
			const clusterRef = react.useRef(null);
			/*
			 * The cluster lives in the shell overlay layer, which is a stacking
			 * context of its own. Any overlay another plugin opens (novel forge, the
			 * memory library, the sub-agent drawer) paints above that layer, so the
			 * title bar could be covered and could not be clicked.
			 *
			 * Moving the cluster out of the layer would fix the paint order, but
			 * React 18 delegates its events at the root container, so a cluster
			 * parked outside that container renders yet never reacts - every button
			 * would look alive and do nothing. The stacking context is therefore
			 * lifted instead: the host layer is raised above the foreign overlays,
			 * and the cluster keeps living inside the React tree.
			 */
			const useLayout = react.useLayoutEffect ?? react.useEffect;
			useLayout(() => {
				const node = clusterRef.current;
				if (node === null) return undefined;
				const lifted = [];
				let parent = node.parentElement;
				while (parent !== null && parent !== document.body && parent !== document.documentElement) {
					const style = getComputedStyle(parent);
					if (style.position !== "static" && style.zIndex !== "auto") {
						lifted.push({ node: parent, zIndex: parent.style.zIndex });
						parent.style.zIndex = "1101";
					}
					parent = parent.parentElement;
				}
				return () => {
					for (const entry of lifted) {
						try {
							entry.node.style.zIndex = entry.zIndex;
						} catch (error) {
							console.warn("[ui-tidy] cluster stacking restore failed:", error);
						}
					}
				};
			}, []);
			const hiddenKeys = loadPinned();
			/* A page that is switched off is still reachable from the + menu. */
			const carried = pages.filter((page) => !hiddenKeys.includes(page.key));
			const [fit, setFit] = react.useState(carried.length);


			/*
			 * Measuring has to happen after the ghost row is in the DOM, but a layout
			 * effect is not guaranteed to exist in every React build the host may
			 * bundle, so fall back to the passive one rather than throwing.
			 */
			useLayout(() => {
				const remeasure = () => {
					const ghost = ghostRef.current;
					if (ghost === null) return;
					/*
					 * Only the real page buttons; the ghost's 更多 button is measured
					 * separately because it is not one of the pages.
					 */
					const buttons = [...ghost.querySelectorAll("[data-page]")];
					if (buttons.length !== carried.length) return;
					const bar = clusterRef.current;
					const fixedWidth =
						bar === null
							? 0
							: [...bar.querySelectorAll("[data-fixed]")].reduce(
									(sum, node) => sum + node.getBoundingClientRect().width + 2,
									0
								);
					const available = window.innerWidth - readCaptionReserve() - readClusterLimit() - fixedWidth;
					let used = 0;
					let count = 0;
					for (let index = 0; index < buttons.length; index += 1) {
						const width = buttons[index].getBoundingClientRect().width;
						if (index > 0) used += 2;
						used += width;
						if (used <= available) {
							count = index + 1;
							continue;
						}
						break;
					}
					setFit(count);
				};
				remeasure();
				let frame = 0;
				/* A timer, not a frame: a hidden window draws no frames. */
				const onResize = () => {
					clearTimeout(frame);
					frame = setTimeout(remeasure, 16);
				};
				window.addEventListener("resize", onResize);
				return () => {
					clearTimeout(frame);
					window.removeEventListener("resize", onResize);
				};
			}, [carried.length]);

			/*
			 * Left edge or centred, per the settings page. The left-aligned mode
			 * is pure CSS (the cluster reads a custom property), so clearing the
			 * inline value is the switch back; centred mode needs the measured
			 * width, which only exists after the row has rendered.
			 */
			useLayout(() => {
				const bar = clusterRef.current;
				if (bar === null) return;
				const span = window.innerWidth - readCaptionReserve();
				const width = bar.getBoundingClientRect().width;
				if (ui.align === "center") {
					bar.style.left = `${Math.max(readClusterLimit(), Math.round((span - width) / 2))}px`;
					return;
				}
				if (ui.align === "right") {
					bar.style.left = `${Math.max(readClusterLimit(), Math.round(span - width))}px`;
					return;
				}
				bar.style.left = "";
			}, [ui.align, fit, carried.length]);


			const isActive = (page) =>
				page.panelId !== null && page.panelId !== undefined
					? String(page.panelId) === String(activePanelId ?? "")
					: false;
			/* Nothing spills any more: whatever does not fit is simply not carried. */
			const shown = carried.slice(0, fit);

			return h(
				react.Fragment,
				null,
				h(
					"div",
					{ className: "uidy-pages-ghost", ref: ghostRef, "aria-hidden": "true" },
					carried.map((page) => h(PageButton, { key: page.key, page, active: false, iconOnly }))
				),
				h(
					"div",
					{ className: "uidy-pages", ref: clusterRef, "aria-label": tt("cluster.pages"), role: "group" },
					h(SessionsToggle, { key: "sessions-toggle", onReorder: reorder, firstKey: carried.length === 0 ? "" : carried[0].key }),
					shown.map((page) => h(PageButton, { key: page.key, page, active: isActive(page), onReorder: reorder, iconOnly })),
					h(CustomBar, { key: "custom-bar" }),
				)
			);
		}

		function OverlaySurface() {
			return h(
				react.Fragment,
				null,
				h("style", { key: "css" }, SIDEBAR_CSS + RIGHTBAR_CSS + HEADER_CSS + DOCK_CSS + POPUP_CSS + MODEL_CSS + CUSTOM_CSS),
				h(ActionMenu, { key: "menu" }),
				h(SessionsDock, { key: "dock" }),
				h(PageCluster, { key: "pages" })
			);
		}

		/* ---------------------------------------------------------------- *
		 * fallback strip, used only when the shell menu host never appears
		 * ---------------------------------------------------------------- */

		/**
		 * The header-leading control strip.
		 * @returns the strip element, or null while the shell menu is in charge.
		 */
		function HeaderStrip() {
			const state = useStore();
			const buttonRef = react.useRef(null);
			if (!state.fallback) return null;
			return h(
				"div",
				{ className: "uidy-bar" },
				h(
					"button",
					{ type: "button", className: "uidy-btn", title: tt("item.newSession"), onClick: startSession },
					h(Icon, { name: "plus" }),
					h("span", null, tt("item.newSession"))
				),
				h(
					"div",
					{ ref: buttonRef, className: "uidy-wraptrue" },
					h(
						"button",
						{
							type: "button",
							className: "uidy-btn",
							title: tt("menu.view"),
							"aria-haspopup": "menu",
							"aria-expanded": state.menu !== null,
							onClick: () => {
								if (buttonRef.current !== null) toggleMenuAt(buttonRef.current, "panels");
							}
						},
						h(Icon, { name: "panel" }),
						h("span", null, tt("menu.view"))
					)
				),
				h(
					"button",
					{
						type: "button",
						className: "uidy-btn",
						title: tt("item.toggleSidebar"),
						"aria-label": tt("item.toggleSidebar"),
						onClick: toggleSidebar
					},
					h(Icon, { name: "menu" })
				)
			);
		}

		/* ---------------------------------------------------------------- *
		 * plugin body
		 * ---------------------------------------------------------------- */

		const TOPBAR_SEAT = "conversation.header.leading";
		const OVERLAY_SEAT = "shell.overlay";
		/* One settings page of our own instead of a menu nobody finds. */
		const SETTINGS_SEAT = "settings.section";

		/**
		 * Coalesce rapid calls into one trailing invocation.
		 *
		 * The shell mutates its tree constantly while a turn streams, and the sidebar
		 * sweep walks the document, so it runs on a trailing edge only.
		 * @param fn - the function to debounce.
		 * @param ms - quiet period in milliseconds.
		 * @returns the debounced function.
		 */
		function debounce(fn, ms) {
			let handle = null;
			return () => {
				if (handle !== null) clearTimeout(handle);
				handle = setTimeout(() => {
					handle = null;
					fn();
				}, ms);
			};
		}

		/**
		 * Mount the shell menu button, the popup and the sidebar rules.
		 * @param ctx - client root context.
		 * @returns {void}
		 */
		/* ---------------------------------------------------------------- *
		 * settings page
		 *
		 * Everything the title bar does is a preference, so the preferences live
		 * on a page of their own under Settings rather than behind a menu nobody
		 * finds. The page writes the same storage the bar reads, so a change is
		 * visible the moment the dialog closes — and, for the pieces that are
		 * plain DOM reads, immediately.
		 * ---------------------------------------------------------------- */

		const UI_KEY = "dsh-ui-tidy.ui";
		const UI_DEFAULTS = { iconOnly: true, align: "left", menuStart: 10, taskChip: "short" };

		/**
		 * Read the title-bar preferences.
		 * @returns the stored values merged over the defaults.
		 */
		function loadUi() {
			try {
				const raw = window.localStorage.getItem(UI_KEY);
				const parsed = raw === null ? null : JSON.parse(raw);
				if (parsed === null || typeof parsed !== "object") return { ...UI_DEFAULTS };
				return { ...UI_DEFAULTS, ...parsed };
			} catch {
				return { ...UI_DEFAULTS };
			}
		}

		/**
		 * Persist one or more title-bar preferences.
		 * @param patch - the values to change.
		 * @returns the merged result.
		 */
		function saveUi(patch) {
			const next = { ...loadUi(), ...patch };
			try {
				window.localStorage.setItem(UI_KEY, JSON.stringify(next));
			} catch (error) {
				console.warn("[ui-tidy] title bar preferences not persisted:", error);
			}
			store.set({ ui: next });
			/*
			 * The caption effect only re-runs on mount and resize, so push the
			 * two layout values it derives here as well: that way flipping the
			 * number in the settings page moves the menu bar immediately.
			 */
			try {
				document.documentElement.style.setProperty("--dsh-windows-menu-start", `${next.menuStart}px`);
				document.documentElement.style.setProperty(CLUSTER_LIMIT_VAR, `${readClusterLimit()}px`);
			} catch (error) {
				console.warn("[ui-tidy] title bar layout not applied:", error);
			}
			return next;
		}

		/**
		 * One checkbox row on the settings page.
		 * @param props - `{ label, checked, onChange }`.
		 * @returns the row.
		 */
		function SettingsCheck(props) {
			return h(
				"label",
				{ className: "uidy-set-row" },
				h("input", {
					type: "checkbox",
					checked: props.checked === true,
					onChange: (event) => props.onChange(event.target.checked)
				}),
				h("span", null, props.label)
			);
		}

		/**
		 * The 顶栏界面 settings page.
		 * @returns the page.
		 */
		function UiTidySettings() {
			useStore();
			const ui = loadUi();
			const saved = loadPrefs();
			const hidden = loadPinned();
			const pages = readPages();
			const rows = [];
			rows.push(h("div", { key: "title", className: "uidy-set-title" }, "顶栏界面"));
			rows.push(
				h("div", { key: "desc", className: "uidy-set-desc" }, "调整窗口标题栏上的那一排按钮与会话页头部的显示方式。改动即时生效，设置保存在本机。")
			);
			rows.push(h("div", { key: "h1", className: "uidy-set-head" }, "顶栏显示哪些页面"));
			for (const page of pages) {
				const keys = pages.map((entry) => entry.key);
				rows.push(
					h(SettingsCheck, {
						key: "page:" + page.key,
						label: page.label,
						checked: !hidden.includes(page.key),
						onChange: () => togglePinned(page.key, keys)
					})
				);
			}
			rows.push(h("div", { key: "h2", className: "uidy-set-head" }, "外观"));
			rows.push(
				h(SettingsCheck, {
					key: "iconOnly",
					label: "只显示图标，名称在鼠标悬停时提示",
					checked: ui.iconOnly !== false,
					onChange: (value) => saveUi({ iconOnly: value })
				})
			);
			rows.push(
				h(
					"div",
					{ key: "align", className: "uidy-set-row" },
					h("span", null, "顶栏按钮对齐"),
					h(
						"select",
						{
							value: ui.align,
							onChange: (event) => saveUi({ align: event.target.value })
						},
						h("option", { value: "left" }, "靠左（紧接菜单栏）"),
						h("option", { value: "center" }, "居中"),
						h("option", { value: "right" }, "靠右（贴住窗口右侧）")
					)
				)
			);
			rows.push(
				h(
					"div",
					{ key: "menuStart", className: "uidy-set-row" },
					h("span", null, "菜单栏左偏移"),
					h("input", {
						type: "number",
						min: 0,
						max: 120,
						step: 1,
						value: ui.menuStart,
						onChange: (event) => saveUi({ menuStart: Math.max(0, Math.min(120, Number(event.target.value) || 0)) })
					}),
					h("span", { className: "uidy-set-hint" }, "px，0 表示贴住窗口左缘")
				)
			);
			rows.push(
				h(SettingsCheck, {
					key: "taskChip",
					label: "后台任务胶囊只显示数量",
					checked: ui.taskChip !== "full",
					onChange: (value) => {
						saveUi({ taskChip: value ? "short" : "full" });
						restoreTaskChip();
					}
				})
			);
			rows.push(h("div", { key: "h3", className: "uidy-set-head" }, "模型选择菜单"));
			for (const toggle of MODEL_TOGGLES) {
				rows.push(
					h(SettingsCheck, {
						key: "model:" + toggle.key,
						label: tt(toggle.label),
						checked: saved[toggle.key] !== false,
						onChange: (value) => {
							prefs[toggle.key] = value;
							commitPrefs();
							store.set({});
						}
					})
				);
			}
			return h("div", { className: "uidy-set" }, rows);
		}

		function apply(ctx) {
			rootCtx = ctx;

			ctx.effect(() => {
				try {
					return ctx.locale.register(NS, { zh: DICT.zh, en: DICT.en });
				} catch (error) {
					console.warn("[ui-tidy] locale registration skipped:", error);
					return () => {};
				}
			}, "ui-tidy: dictionaries");

			try {
				boundTranslate = ctx.locale.bind(NS);
				const locale = typeof ctx.locale.getLocale === "function" ? String(ctx.locale.getLocale() ?? "") : "";
				fallbackDictionary = locale.toLowerCase().startsWith("zh") ? DICT.zh : DICT.en;
			} catch (error) {
				console.warn("[ui-tidy] locale binding skipped:", error);
			}

			ctx.effect(() => bootstrapMenuButton(), "ui-tidy: shell menu button");

			ctx.effect(() => installModelMenuEnhancer(), "ui-tidy: model menu enhancer");


			/*
			 * Publish the caption reserve as a custom property so the cluster hides
			 * behind the window buttons without any script touching layout on resize.
			 */
			ctx.effect(() => {
				const apply = () => {
					try {
						/*
						 * The shell parks its own menu bar 48px in, which was the
						 * slot the shipped sidebar toggle lived in. Nothing sits
						 * there any more, so pull the menus to the left edge. This
						 * runs first: the cluster limit is measured off the menus.
						 */
						document.documentElement.style.setProperty("--dsh-windows-menu-start", `${loadUi().menuStart}px`);
						document.documentElement.style.setProperty(CAPTION_RESERVE_VAR, `${readCaptionReserve()}px`);
						document.documentElement.style.setProperty(CLUSTER_LIMIT_VAR, `${readClusterLimit()}px`);
					} catch (error) {
						console.warn("[ui-tidy] caption reserve failed:", error);
					}
				};
				apply();
				let frame = 0;
				/* A timer, not a frame: a hidden window draws no frames. */
				const onResize = () => {
					clearTimeout(frame);
					frame = setTimeout(apply, 16);
				};
				window.addEventListener("resize", onResize);
				return () => {
					clearTimeout(frame);
					window.removeEventListener("resize", onResize);
				};
			}, "ui-tidy: caption reserve");

			/*
			 * Take the shipped left sidebar out and keep re-applying it: the shell
			 * remounts its columns on panel switches and session changes, and the
			 * tool rows can gain an entry whenever another plugin loads.
			 */
			ctx.effect(() => {
				const sync = () => {
					try {
						removeShippedSidebar();
					} catch (error) {
						console.warn("[ui-tidy] sidebar removal failed:", error);
					}
				};
				sync();
				const observer = new MutationObserver(debounce(sync, 120));
				observer.observe(document.body, { childList: true, subtree: true });
				return () => {
					observer.disconnect();
					restoreShippedSidebar();
				};
			}, "ui-tidy: sidebar removal");

			ctx.effect(() => {
				try {
					const unsubscribe = ctx.locale.subscribe(() => {
						try {
							syncMenuButton();
						} catch {
							/* menu host not ready */
						}
					});
					return typeof unsubscribe === "function" ? unsubscribe : () => {};
				} catch {
					return () => {};
				}
			}, "ui-tidy: menu label locale");

			const disposers = [];
			const register = (seat, options, component) => {
				try {
					disposers.push(ctx.slots.inject(seat, () => ctx.slots.register({ name: seat, ...options }, component)));
				} catch (error) {
					console.warn(`[ui-tidy] registration failed for ${seat}:`, error);
				}
			};

			register(OVERLAY_SEAT, { id: "dsh-ui-tidy:overlay" }, OverlaySurface);
			register(TOPBAR_SEAT, { id: "dsh-ui-tidy:topbar", order: 10 }, HeaderStrip);
			register(SETTINGS_SEAT, { id: "dsh-ui-tidy:settings", order: 50, label: () => "顶栏界面" }, UiTidySettings);

			ctx.effect(
				() => () => {
					closeMenu();
					for (const dispose of disposers.splice(0)) {
						try {
							dispose();
						} catch {
							/* already released */
						}
					}
				},
				"ui-tidy: mounts"
			);
		}

		exports.apply = apply;
		exports.inject = ["slots", "locale"];
		return module.exports;
	}
});
