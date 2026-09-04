import { CustomEditor } from "@earendil-works/pi-coding-agent";
import { matchesKey } from "@earendil-works/pi-tui";

export default function (pi) {
	let stash: string | undefined;

	function putBack(ui: { setEditorText(text: string): void; setStatus(key: string, text: string | undefined): void }) {
		if (stash === undefined) return;
		ui.setEditorText(stash);
		stash = undefined;
		ui.setStatus("stash", undefined);
	}

	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		const previous = ctx.ui.getEditorComponent();
		ctx.ui.setEditorComponent((tui, theme, kb) => {
			const editor = previous?.(tui, theme, kb) ?? new CustomEditor(tui, theme, kb);
			const orig = editor.handleInput.bind(editor);
			editor.handleInput = (data: string) => {
				if (!matchesKey(data, "ctrl+s")) return orig(data);
				const text = editor.getExpandedText?.() ?? editor.getText();
				if (text.trim()) {
					stash = text;
					editor.setText("");
					ctx.ui.setStatus("stash", "stashed");
					return;
				}
				putBack(ctx.ui);
			};
			return editor;
		});
	});

	pi.on("input", (event, ctx) => {
		if (event.source !== "interactive") return;
		putBack(ctx.ui);
	});
}
