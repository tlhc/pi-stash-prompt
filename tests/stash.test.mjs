import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

const ctrlS = "\x13";

const codingAgent = "data:text/javascript," + encodeURIComponent(`
export class CustomEditor {
  constructor() {
    this.text = "";
    this.passed = [];
  }
  getText() { return this.text; }
  getExpandedText() { return this.text; }
  setText(t) { this.text = t; }
  handleInput(d) { this.passed.push(d); }
}
`);

const tui = "data:text/javascript," + encodeURIComponent(`
export function matchesKey(data, key) { return data === String.fromCharCode(19) && key === "ctrl+s"; }
`);

registerHooks({
	resolve(spec, context, next) {
		if (spec === "@earendil-works/pi-coding-agent") return { url: codingAgent, shortCircuit: true };
		if (spec === "@earendil-works/pi-tui") return { url: tui, shortCircuit: true };
		return next(spec, context);
	},
});

const { default: create } = await import("../extensions/stash.ts");

function setup({ mode = "tui", previous } = {}) {
	const handlers = {};
	let factory;
	let editor;
	const status = {};
	const pi = {
		registerShortcut() {
			throw new Error("registerShortcut");
		},
		on(ev, fn) {
			(handlers[ev] ??= []).push(fn);
		},
	};
	create(pi);
	const ctx = {
		mode,
		ui: {
			getEditorComponent: () => previous,
			setEditorComponent(fn) {
				factory = fn;
			},
			setEditorText(text) {
				editor?.setText(text);
			},
			setStatus(key, text) {
				status[key] = text;
			},
		},
	};
	for (const fn of handlers.session_start ?? []) fn({}, ctx);
	if (factory) editor = factory({}, {}, {});
	return {
		editor,
		status,
		input(event) {
			for (const fn of handlers.input ?? []) fn(event, ctx);
		},
	};
}

test("does not register ctrl+s as an extension shortcut", () => {
	assert.doesNotThrow(() => setup());
});

test("skips wrap outside tui", () => {
	const { editor } = setup({ mode: "rpc" });
	assert.equal(editor, undefined);
});

test("ctrl+s stashes text and restores on empty", () => {
	const { editor, status } = setup();
	editor.setText("draft one");
	editor.handleInput(ctrlS);
	assert.equal(editor.getText(), "");
	assert.equal(status.stash, "stashed");
	editor.handleInput(ctrlS);
	assert.equal(editor.getText(), "draft one");
	assert.equal(status.stash, undefined);
});

test("ctrl+s on empty with no stash is a no-op", () => {
	const { editor, status } = setup();
	editor.handleInput(ctrlS);
	assert.equal(editor.getText(), "");
	assert.equal(status.stash, undefined);
	assert.deepEqual(editor.passed, []);
});

test("whitespace-only editor does not stash", () => {
	const { editor, status } = setup();
	editor.setText("  \n");
	editor.handleInput(ctrlS);
	assert.equal(editor.getText(), "  \n");
	assert.equal(status.stash, undefined);
	assert.deepEqual(editor.passed, []);
});

test("other keys pass through", () => {
	const { editor } = setup();
	editor.handleInput("a");
	assert.deepEqual(editor.passed, ["a"]);
});

test("interactive input puts the stash back", () => {
	const { editor, status, input } = setup();
	editor.setText("keep me");
	editor.handleInput(ctrlS);
	assert.equal(editor.getText(), "");
	assert.equal(status.stash, "stashed");
	input({ source: "interactive" });
	assert.equal(editor.getText(), "keep me");
	assert.equal(status.stash, undefined);
	input({ source: "interactive" });
	assert.equal(editor.getText(), "keep me");
});

test("non-interactive input leaves the stash", () => {
	const { editor, input } = setup();
	editor.setText("keep me");
	editor.handleInput(ctrlS);
	input({ source: "extension" });
	assert.equal(editor.getText(), "");
});

test("stashes expanded text from collapsed paste markers", () => {
	const marker = "[paste #1 +2 lines]";
	const expanded = "one\ntwo\nthree";
	const inner = {
		text: marker,
		getText() {
			return this.text;
		},
		getExpandedText() {
			return this.text === marker ? expanded : this.text;
		},
		setText(t) {
			this.text = t;
		},
		handleInput() {
			throw new Error("ctrl+s passed through");
		},
	};
	const { editor } = setup({ previous: () => inner });
	editor.handleInput(ctrlS);
	assert.equal(inner.text, "");
	editor.handleInput(ctrlS);
	assert.equal(inner.text, expanded);
});

test("wraps a previous editor factory", () => {
	const inner = {
		text: "old",
		passed: [],
		getText() {
			return this.text;
		},
		setText(t) {
			this.text = t;
		},
		handleInput(d) {
			this.passed.push(d);
		},
	};
	const { editor } = setup({ previous: () => inner });
	editor.handleInput("x");
	assert.deepEqual(inner.passed, ["x"]);
	editor.handleInput(ctrlS);
	assert.equal(inner.text, "");
	assert.deepEqual(inner.passed, ["x"]);
});
