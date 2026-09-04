import { CustomEditor } from "@earendil-works/pi-coding-agent";
import { matchesKey } from "@earendil-works/pi-tui";

export default function (pi) {
	const stack: string[] = [];

	function setStatus(ui: { setStatus(key: string, text: string | undefined): void }) {
		ui.setStatus("stash", stack.length ? `stashed ${stack.length}` : undefined);
	}

	function popIfEmpty(
		ui: {
			getEditorText?(): string;
			setEditorText(text: string): void;
			setStatus(key: string, text: string | undefined): void;
		},
		current = ui.getEditorText?.() ?? "",
	) {
		if (stack.length === 0 || current.trim()) return;
		ui.setEditorText(stack.pop() as string);
		setStatus(ui);
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
					stack.push(text);
					editor.setText("");
					setStatus(ctx.ui);
					return;
				}
				popIfEmpty(ctx.ui, text);
			};
			return editor;
		});
	});

	pi.on("input", (event, ctx) => {
		if (event.source !== "interactive") return;
		popIfEmpty(ctx.ui);
	});

	pi.on("session_shutdown", (_event, ctx) => {
		stack.length = 0;
		ctx?.ui?.setStatus?.("stash", undefined);
	});
}
