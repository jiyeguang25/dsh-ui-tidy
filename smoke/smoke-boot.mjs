// Boot smoke test: load client.js the way the harness loader does and run apply()
// against a hand-rolled DOM. No jsdom, no Electron - it only answers one question:
// would the shell's plugin entry activate, or would it throw and take the whole
// web boot down with it? A syntax check does not answer that; this does.
//
// usage: node smoke/smoke-boot.mjs   (from the plugin directory)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.resolve(HERE, "..", "client.js");
const src = fs.readFileSync(FILE, "utf8");

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

/* ---------------- DOM stand-ins ---------------- */
class Node {
	constructor(tag) {
		this.tagName = String(tag || "div").toUpperCase();
		this.children = [];
		this.attributes = new Map();
		this.style = {
			setProperty() {},
			removeProperty() {},
			getPropertyValue() { return ""; },
		};
		this.parentElement = null;
		this.ownerDocument = null;
	}
	get className() { return this.attributes.get("class") || ""; }
	set className(value) { this.attributes.set("class", String(value)); }
	get textContent() { return this.children.map((c) => (typeof c === "string" ? c : c.textContent)).join(""); }
	set textContent(value) { this.children = [String(value)]; }
	get firstElementChild() { return this.children.find((c) => c instanceof Node) || null; }
	get parentNode() { return this.parentElement; }
	appendChild(child) { child.parentElement = this; this.children.push(child); return child; }
	insertBefore(child, ref) { child.parentElement = this; const i = this.children.indexOf(ref); if (i < 0) this.children.push(child); else this.children.splice(i, 0, child); return child; }
	removeChild(child) { const i = this.children.indexOf(child); if (i >= 0) this.children.splice(i, 1); return child; }
	remove() { if (this.parentElement) this.parentElement.removeChild(this); }
	setAttribute(name, value) { this.attributes.set(name, String(value)); }
	getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
	hasAttribute(name) { return this.attributes.has(name); }
	removeAttribute(name) { this.attributes.delete(name); }
	querySelector() { return null; }
	querySelectorAll() { return []; }
	closest() { return null; }
	contains() { return false; }
	addEventListener() {}
	removeEventListener() {}
	dispatchEvent() { return true; }
	getBoundingClientRect() { return { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }; }
	cloneNode() { return new Node(this.tagName); }
}

const head = new Node("head");
const body = new Node("body");
const documentElement = new Node("html");
const document = {
	documentElement,
	head,
	body,
	createElement: (tag) => new Node(tag),
	createTextNode: (text) => text,
	querySelector: () => null,
	querySelectorAll: () => [],
	getElementById: () => null,
	addEventListener() {},
	removeEventListener() {},
	visibilityState: "visible",
};
documentElement.ownerDocument = document;
body.ownerDocument = document;
head.ownerDocument = document;
documentElement.appendChild(head);
documentElement.appendChild(body);

const storage = new Map();
const window = {
	document,
	innerWidth: 1440,
	innerHeight: 900,
	devicePixelRatio: 1,
	location: { href: "dsh-app://app/", reload() {} },
	localStorage: {
		getItem: (k) => (storage.has(k) ? storage.get(k) : null),
		setItem: (k, v) => storage.set(k, String(v)),
		removeItem: (k) => storage.delete(k),
	},
	addEventListener() {},
	removeEventListener() {},
	setTimeout: (fn, ms) => setTimeout(fn, ms),
	clearTimeout: (id) => clearTimeout(id),
	requestAnimationFrame: (fn) => setTimeout(() => fn(Date.now()), 0),
	cancelAnimationFrame: (id) => clearTimeout(id),
	matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
	getComputedStyle: () => ({ position: "static", zIndex: "auto", display: "block", visibility: "visible", opacity: "1", getPropertyValue: () => "" }),
	__ModuleLoader__: { load(entry) { globalThis.__entry = entry; } },
};

globalThis.window = window;
globalThis.document = document;
Object.defineProperty(globalThis, "navigator", {
	configurable: true,
	value: { clipboard: { writeText: async () => {} } },
});
window.navigator = globalThis.navigator;
globalThis.getComputedStyle = window.getComputedStyle;
globalThis.requestAnimationFrame = window.requestAnimationFrame;
globalThis.cancelAnimationFrame = window.cancelAnimationFrame;
class Observer { observe() {} disconnect() {} takeRecords() { return []; } }
globalThis.MutationObserver = Observer;
globalThis.ResizeObserver = Observer;
globalThis.PointerEvent = class { constructor(type, init) { Object.assign(this, init, { type }); } };
globalThis.MouseEvent = globalThis.PointerEvent;
globalThis.KeyboardEvent = globalThis.PointerEvent;

/* ---------------- load ---------------- */
const react = {
	createElement: (type, props, ...children) => ({ type, props: { ...(props || {}), children: children.flat(Infinity) } }),
	Fragment: Symbol("Fragment"),
	useState: (initial) => [typeof initial === "function" ? initial() : initial, () => {}],
	useEffect: () => {},
	useLayoutEffect: () => {},
	useMemo: (fn) => fn(),
	useCallback: (fn) => fn,
	useRef: (initial) => ({ current: initial === undefined ? null : initial }),
	useReducer: (reducer, initial) => [initial, () => {}],
};

let entry = null;
try {
	new Function("window", "document", "require", "MutationObserver", "ResizeObserver", src)(window, document, (id) => {
		if (id === "react") return react;
		throw new Error("unexpected require: " + id);
	}, Observer, Observer);
	entry = globalThis.__entry;
	check("module body ran", true);
} catch (error) {
	check("module body ran", false, String(error && error.message));
}

check("loader received an entry", entry !== null && entry !== undefined, entry ? String(entry.id) : "none");
if (entry) {
	check("entry id is dsh-ui-tidy", entry.id === "dsh-ui-tidy", String(entry.id));
	let mod = null;
	try {
		mod = entry.factory((id) => {
			if (id === "react") return react;
			throw new Error("unexpected require: " + id);
		});
		check("factory ran", true);
	} catch (error) {
		check("factory ran", false, String(error && error.message));
	}
	if (mod) {
		check("exports apply", typeof mod.apply === "function");
		const inject = Array.isArray(mod.inject) ? mod.inject : [];
		check("declares its seats", inject.includes("slots") && inject.includes("locale"), inject.join(","));
		const registered = [];
		const ctx = {
			get: () => null,
			effect: (fn) => { const d = fn(); return typeof d === "function" ? d : () => {}; },
			locale: { register: () => () => {}, bind: () => (k) => k, getLocale: () => "zh-CN" },
			slots: {
				inject: (seat, cb) => { cb && cb(); return () => {}; },
				register: (opts, component) => { registered.push({ name: opts.name, id: opts.id, component }); return () => {}; },
			},
		};
		try {
			mod.apply(ctx);
			check("apply() completed", true);
		} catch (error) {
			check("apply() completed", false, String(error && error.message));
		}
		const seats = registered.map((r) => r.name).sort();
		check("registered three surfaces", seats.length === 3, seats.join(","));
		for (const seat of ["shell.overlay", "conversation.header.leading", "settings.section"]) {
			check("seat " + seat, seats.includes(seat));
		}
	}
}

/* ---------------- safe mode ---------------- */
function loadFresh() {
	globalThis.__entry = null;
	new Function("window", "document", "require", "MutationObserver", "ResizeObserver", srcSrc)(window, document, (id) => {
		if (id === "react") return react;
		throw new Error("unexpected require: " + id);
	}, Observer, Observer);
	const fresh = globalThis.__entry;
	return fresh.factory((id) => {
		if (id === "react") return react;
		throw new Error("unexpected require: " + id);
	});
}

function runApply(mod, override) {
	const registered = [];
	const opts = override || {};
	const ctx = {
		get: () => null,
		effect: opts.effect || ((fn) => { const d = fn(); return typeof d === "function" ? d : () => {}; }),
		locale: { register: () => () => {}, bind: () => (k) => k, getLocale: () => "zh-CN" },
		slots: opts.slots || {
			inject: (seat, cb) => { cb && cb(); return () => {}; },
			register: (opts_) => { registered.push(opts_.name); return () => {}; },
		},
	};
	let threw = null;
	try { mod.apply(ctx); } catch (error) { threw = error; }
	return { registered, threw };
}

// The negative cases below log on purpose. Silence them so a passing run reads
// as a passing run; the assertions, not the log text, are the evidence.
const quiet = () => { const e = console.error, w = console.warn; console.error = () => {}; console.warn = () => {}; return () => { console.error = e; console.warn = w; }; };
const unmute = quiet();

const srcSrc = src;
storage.set("dsh-ui-tidy.safeMode", "off");
{
	const mod = loadFresh();
	const { registered, threw } = runApply(mod);
	check("safe mode off: apply does not throw", threw === null, threw ? String(threw && threw.message) : "");
	check("safe mode off: registers nothing", registered.length === 0, registered.join(","));
}
storage.delete("dsh-ui-tidy.safeMode");
storage.set("dsh-ui-tidy.safeMode", "off");
{
	const mod = loadFresh();
	const { registered } = runApply(mod);
	check("safe mode is read from storage", registered.length === 0, "seats=" + registered.length);
}
storage.delete("dsh-ui-tidy.safeMode");
{
	// Per-seat registration failures are swallowed on purpose inside apply(), so
	// the fallback has to be driven by a throw that escapes apply() itself.
	const explodingEffect = { effect: () => { throw new Error("effect exploded"); } };
	const mod = loadFresh();
	runApply(mod, explodingEffect);
	check("failure counter increments", storage.get("dsh-ui-tidy.activationFailures") === "1", String(storage.get("dsh-ui-tidy.activationFailures")));
	const mod2 = loadFresh();
	runApply(mod2, explodingEffect);
	check("second failure switches to minimal", storage.get("dsh-ui-tidy.safeMode") === "minimal", String(storage.get("dsh-ui-tidy.safeMode")));
}

unmute();

/* ---------------- report ---------------- */
const failed = results.filter((r) => !r.ok);
for (const r of results) console.log((r.ok ? "PASS  " : "FAIL  ") + r.name + (r.ok || !r.detail ? "" : "  -> " + r.detail));
console.log("\n" + (results.length - failed.length) + "/" + results.length + " checks passed");
process.exit(failed.length === 0 ? 0 : 1);
