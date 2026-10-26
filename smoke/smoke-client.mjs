/**
 * Offline smoke test for dsh-ui-tidy/client.js.
 *
 * The app cannot render while the host's plugin bundles 404, so this loads the
 * client bundle against a hand-rolled React stub and a mock context, then walks
 * the rendered tree and exercises every handler. No DOM, no jsdom, no app.
 *
 * usage: node _probe/ui-audit/smoke-client.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE = path.resolve(HERE, '..', 'client.js');
const src = fs.readFileSync(BUNDLE, 'utf8');

let captured = null;
globalThis.window = {
	localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
	addEventListener() {},
	removeEventListener() {},
	innerWidth: 1440,
	__ModuleLoader__: {
		load(entry) {
			captured = entry;
		}
	}
};

/* ---- minimal stateful React stub ---- */
const cells = [];
let cursor = 0;
const React = {
	Fragment: Symbol('Fragment'),
	createElement(type, props, ...children) {
		return { type, props: { ...(props ?? {}), children: children.flat(Infinity) } };
	},
	useState(initial) {
		const index = cursor++;
		if (cells.length <= index) cells.push(typeof initial === 'function' ? initial() : initial);
		return [cells[index], (next) => { cells[index] = typeof next === 'function' ? next(cells[index]) : next; }];
	},
	useEffect() {},
	useLayoutEffect() {},
	useReducer(reducer, initial) {
		const index = cursor++;
		if (cells.length <= index) cells.push(typeof initial === 'function' ? initial() : initial);
		return [cells[index], (action) => { cells[index] = reducer(cells[index], action); }];
	},
	useMemo(fn) { return fn(); },
	useCallback(fn) { return fn; },
	useRef(initial) {
		const index = cursor++;
		if (cells.length <= index) cells.push({ current: initial ?? null });
		return cells[index];
	}
};
const requireStub = (id) => {
	if (id === 'react') return React;
	throw new Error('unexpected require(): ' + id);
};

/* ---- browser globals the bundle may touch during bootstrap ---- */
class NoopObserver {
	observe() {}
	disconnect() {}
	takeRecords() { return []; }
}
globalThis.MutationObserver = NoopObserver;
globalThis.ResizeObserver = NoopObserver;
globalThis.document = {
	documentElement: { style: { setProperty() {}, removeProperty() {} }, setAttribute() {}, getAttribute() { return null; } },
	body: { appendChild() {}, contains() { return false; } },
	querySelector() { return null; },
	querySelectorAll() { return []; },
	getElementById() { return null; },
	addEventListener() {},
	removeEventListener() {},
	createElement() {
		return {
			style: {},
			setAttribute() {},
			appendChild() {},
			remove() {},
			querySelector() { return null; },
			querySelectorAll() { return []; },
			addEventListener() {},
			classList: { add() {}, remove() {} }
		};
	}
};
globalThis.innerWidth = 1440;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.setTimeout = globalThis.setTimeout;
globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

/* ---- load the bundle exactly as the loader would ---- */
new Function('window', 'require', src)(globalThis.window, requireStub);
const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

check('module id', captured?.id === 'dsh-ui-tidy', captured?.id);
const mod = captured.factory(requireStub);
check('inject declares slots + locale', JSON.stringify(mod.inject) === JSON.stringify(['slots', 'locale']), JSON.stringify(mod.inject));

/* ---- mock context ---- */
const calls = { started: 0, toggled: 0, selected: [], effects: 0, injected: [], registered: [], localeNs: null };
let topBar = null;
let overlay = null;
let settingsPage = null;
const ctx = {
	get(name) {
		if (name === 'layout') {
			return {
				selectPanel(id) { calls.selected.push(id); },
				toggleSidebar() { calls.toggled++; },
				closeRightbar() { calls.rightbarClosed = (calls.rightbarClosed ?? 0) + 1; },
				panelInfo: { getSnapshot: () => ({ activePanelId: 'plugins' }), subscribe: () => () => {} }
			};
		}
		if (name === 'uiWorkspace') return { startSession(...args) { calls.started++; calls.startArgs = args; } };
		return null;
	},
	effect(fn) { calls.effects++; const d = fn(); return typeof d === 'function' ? d : () => {}; },
	locale: {
		register(ns, dicts) { calls.localeNs = ns; check('locale has zh+en', !!(dicts.zh && dicts.en), Object.keys(dicts).join('/')); },
		bind(ns) { return (key) => null; },
		getLocale() { return 'zh-CN'; }
	},
	slots: {
		inject(seat, cb) { calls.injected.push(seat); cb(); return () => {}; },
		register(opts, component) {
			calls.registered.push({ name: opts.name, id: opts.id, order: opts.order, isFn: typeof component === 'function' });
			if (opts.name === 'conversation.header.leading') topBar = component;
			if (opts.name === 'shell.overlay') overlay = component;
			if (opts.name === 'settings.section') settingsPage = component;
			if (opts.name === 'settings.section') settingsPage = component;
			return () => {};
		}
	}
};

try {
	mod.apply(ctx);
	check('apply() did not throw', true);
} catch (error) {
	check('apply() did not throw', false, String(error));
}

check('injected all seats', (() => { const s = [...calls.injected].sort(); return JSON.stringify(s) === JSON.stringify(['conversation.header.leading', 'settings.section', 'shell.overlay']); })(), calls.injected.join(','));
check('registered 3 components', calls.registered.length === 3, JSON.stringify(calls.registered));
check('top bar component captured', typeof topBar === 'function');
check('overlay component captured', typeof overlay === 'function');

/* ---- render + interact (shared tree walkers) ---- */
const expand = (node) => {
	if (node === null || node === undefined || node === false || node === true) return null;
	if (Array.isArray(node)) return node.map(expand);
	if (typeof node !== 'object' || !node.props) return node;
	const { type, props } = node;
	if (type === React.Fragment) return expand(props.children);
	if (typeof type === 'function') return expand(type({ ...props }));
	return { type, props: { ...props, children: expand(props.children) } };
};
const render = (component, props) => { cursor = 0; return expand(component(props ?? {})); };
const findAll = (node, out = []) => {
	if (node === null || node === undefined) return out;
	if (Array.isArray(node)) { node.forEach((n) => findAll(n, out)); return out; }
	if (typeof node === 'object' && node.props) { out.push(node); findAll(node.props.children, out); }
	return out;
};
const text = (node) => {
	const out = [];
	const walk = (n) => {
		if (n === null || n === undefined || n === false || n === true) return;
		if (Array.isArray(n)) { n.forEach(walk); return; }
		if (typeof n === 'string' || typeof n === 'number') { out.push(String(n)); return; }
		if (typeof n === 'object' && n.props) walk(n.props.children);
	};
	walk(node);
	return out.join('|');
};

/* ---- the stylesheet now lives in the overlay tree ---- */
let css = '';
let tree = null;
try {
	tree = render(overlay);
	const styles = findAll(tree).filter((n) => n.type === 'style');
	css = styles.map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : n.props.children)).join('');
	check('overlay renders one style element', styles.length === 1, String(styles.length));
} catch (error) {
	check('overlay render did not throw', false, String(error));
}

/* ---- stylesheet contract ---- */
try {
	const wanted = [
		['[data-uidy-nosb] [class*="sidebarCol"]{width:0 !important', 'shipped sidebar column collapsed to zero'],
		['[data-uidy-nosb] [class*="sidebarCol"] [class*="wtg9ga_root"]{display:none !important}', 'shipped sidebar root hidden'],
		['[data-uidy-sbseat]{position:absolute', 'preserved seats parked off-layout'],
		['.uidy-sessions{', 'session list container present'],
		['[data-uidy-hidden="true"]{display:none !important}', 'helper rows hide rule present'],
		['max-height:min(72vh,600px)', 'popup height']
	];
	const normalize = (s) => s.replace(/\r\n/g, '\n');
	const cssFlat = normalize(css);
	for (const [needle, label] of wanted) check('css: ' + label, cssFlat.includes(normalize(needle)), needle.slice(0, 44));
	check('shipped right sidebar is left intact', !css.includes('acoR2W'), 'rightbar css');
	check('sidebar removal no longer hides seats outright', !/sidebar\.panellist[^{]*\{[^}]*display:none/.test(css), 'seat css');
} catch (error) {
	check('css contract did not throw', false, String(error));
}

/* ---- the shipped right sidebar is closed on boot ---- */
check('boot leaves the shipped right sidebar alone', (calls.rightbarClosed ?? 0) === 0, String(calls.rightbarClosed));

/* ---- page cluster: one button per page, no page listed twice ---- */
try {
	const bullets = findAll(tree).filter((n) => n.type === 'div' && n.props?.className === 'uidy-pages');
	check('cluster renders one row', bullets.length === 1, String(bullets.length));
	/* the page buttons are the ones that carry a page key */
	const buttons = findAll(bullets[0] ?? { props: {} }).filter((n) => n.type === 'button' && typeof n.props?.['data-page'] === 'string');
	const labels = buttons.map((n) => n.props['aria-label']);
	check('cluster has one button per page', labels.length === 6, `count=${labels.length} [${labels.join(', ')}]`);
	check('cluster lists no page twice', new Set(labels).size === labels.length, labels.join(', '));
	check('cluster keeps shipped page order', labels[0] === '对话' && labels[5] === '账单', labels.join(', '));
	/* the title bar shows glyphs only; the name arrives on hover */
	check('page buttons are icon only', buttons.every((n) => String(n.props.className).includes('uidy-page-icon')), buttons.map((n) => n.props.className).join(' | '));
	check('page buttons keep a title for hover', buttons.every((n) => typeof n.props.title === 'string' && n.props.title !== ''), 'title');

	/* the session list and the account are separate entries, not pages */
	const fixed = findAll(bullets[0] ?? { props: {} }).filter((n) => n.type === 'button' && n.props?.['data-fixed'] !== undefined);
	const fixedLabels = fixed.map((n) => n.props['aria-label']);
	check('the session list is its own entry', fixedLabels.includes('会话列表'), fixedLabels.join(', '));
	check('the account is its own entry', fixedLabels.length >= 3, fixedLabels.join(', '));

	/* the 面板 menu is gone: that is what removed the duplicate entries */
	const menuButtons = findAll(tree).filter((n) => n.type === 'button' && n.props?.className === 'uidy-item');
	const menuLabels = menuButtons.map((n) => text(n)).filter((t) => t !== '');
	const pagesInMenu = ['插件', '自动化任务', '写作助手', '技能中心'].filter((l) => menuLabels.includes(l));
	check('no page is duplicated inside a menu', pagesInMenu.length === 0, pagesInMenu.join(', '));
} catch (error) {
	check('page cluster contract did not throw', false, String(error));
}

/* ---- zh base and en overlay stay key-aligned ---- */
try {
	let zhKeys = null;
	let enKeys = null;
	const probe = {
		...ctx,
		locale: { ...ctx.locale, register(ns, dicts) { zhKeys = Object.keys(dicts.zh).sort(); enKeys = Object.keys(dicts.en).sort(); } }
	};
	captured.factory(requireStub).apply(probe);
	check('zh/en dictionaries are key-aligned', JSON.stringify(zhKeys) === JSON.stringify(enKeys), String(zhKeys ? zhKeys.length : 0));
	check('new menu keys present', !!zhKeys && zhKeys.includes('menu.panels') && zhKeys.includes('menu.model'), String(zhKeys ? zhKeys.length : 0));
} catch (error) {
	check('dictionary alignment did not throw', false, String(error));
}

/* ---- settings page ---- */
try {
	check('settings page captured', typeof settingsPage === 'function');
	const page = render(settingsPage);
	const nodes = findAll(page);
	const boxes = nodes.filter((n) => n.type === 'input' && n.props.type === 'checkbox');
	const heads = nodes.filter((n) => typeof n.props.className === 'string' && n.props.className === 'uidy-set-head');
	check('settings page renders checkboxes', boxes.length > 0, String(boxes.length));
	check('settings page groups its rows', heads.length >= 3, String(heads.length));
	check('settings page names itself', text(page).includes('顶栏界面'), text(page).slice(0, 60));
	for (const box of boxes) {
		if (typeof box.props.onChange === 'function') box.props.onChange({ target: { checked: !box.props.checked } });
	}
	for (const node of nodes) {
		if (node.type === 'select' && typeof node.props.onChange === 'function') node.props.onChange({ target: { value: 'center' } });
		if (node.type === 'input' && node.props.type === 'number' && typeof node.props.onChange === 'function') node.props.onChange({ target: { value: '24' } });
	}
	check('settings page handlers all run', true);
} catch (error) {
	check('settings page handlers all run', false, String(error));
}
/* ---- report ---- */
const failed = results.filter((r) => !r.ok);
for (const r of results) console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.ok ? '' : '  -> ' + (r.detail ?? '')));
console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed');
process.exit(failed.length === 0 ? 0 : 1);






