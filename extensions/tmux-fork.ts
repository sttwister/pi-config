/**
 * Tmux Fork Extension
 *
 * Fork the current pi session into a new tmux pane or window.
 * Both sessions share the same conversation history up to the fork point,
 * then diverge independently — perfect for parallel workstreams.
 *
 * - `/tmux-fork` command with interactive split direction choice
 * - `Alt+T` keyboard shortcut (defaults to vertical split)
 *
 * Requires: tmux (detected automatically)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

function isInTmux(): boolean {
	return Boolean(process.env.TMUX);
}

function getPiCommand(): string {
	// Use the same executable that's currently running
	const currentScript = process.argv[1];
	if (currentScript) {
		return `${process.execPath} ${currentScript}`;
	}
	return "pi";
}

type SplitMode = "vertical" | "horizontal" | "window";

async function forkToTmux(
	pi: ExtensionAPI,
	sessionFile: string | undefined,
	cwd: string,
	mode: SplitMode,
): Promise<{ success: boolean; error?: string }> {
	if (!isInTmux()) {
		return { success: false, error: "Not running inside tmux" };
	}

	if (!sessionFile) {
		return { success: false, error: "No session file (ephemeral mode). Use a persisted session." };
	}

	const piCmd = getPiCommand();
	const forkCmd = `cd ${shellEscape(cwd)} && ${piCmd} --fork ${shellEscape(sessionFile)}`;

	let tmuxArgs: string[];
	switch (mode) {
		case "vertical":
			tmuxArgs = ["split-window", "-h", forkCmd];
			break;
		case "horizontal":
			tmuxArgs = ["split-window", "-v", forkCmd];
			break;
		case "window":
			tmuxArgs = ["new-window", forkCmd];
			break;
	}

	const result = await pi.exec("tmux", tmuxArgs, { timeout: 5000 });

	if (result.code !== 0) {
		return { success: false, error: `tmux failed: ${result.stderr || result.stdout}` };
	}

	return { success: true };
}

function shellEscape(s: string): string {
	return `'${s.replace(/'/g, "'\\''")}'`;
}

const SPLIT_OPTIONS = [
	"↔ Vertical split (side by side)",
	"↕ Horizontal split (top/bottom)",
	"⊞ New window (new tab)",
];

const SPLIT_MODES: SplitMode[] = ["vertical", "horizontal", "window"];

export default function (pi: ExtensionAPI) {
	// /tmux-fork command — interactive split direction picker
	pi.registerCommand("tmux-fork", {
		description: "Fork session into a new tmux pane/window",
		handler: async (args, ctx) => {
			if (!isInTmux()) {
				ctx.ui.notify("Not running inside tmux", "error");
				return;
			}

			const sessionFile = ctx.sessionManager.getSessionFile();
			if (!sessionFile) {
				ctx.ui.notify("No session file (ephemeral mode)", "error");
				return;
			}

			let mode: SplitMode;

			// Allow passing mode directly: /tmux-fork vertical|horizontal|window
			const arg = args?.trim().toLowerCase();
			if (arg === "vertical" || arg === "v") {
				mode = "vertical";
			} else if (arg === "horizontal" || arg === "h") {
				mode = "horizontal";
			} else if (arg === "window" || arg === "w") {
				mode = "window";
			} else {
				const choice = await ctx.ui.select("Fork to tmux:", SPLIT_OPTIONS);
				if (choice === undefined) return; // cancelled
				const idx = SPLIT_OPTIONS.indexOf(choice);
				mode = SPLIT_MODES[idx] ?? "vertical";
			}

			const result = await forkToTmux(pi, sessionFile, ctx.cwd, mode);

			if (result.success) {
				ctx.ui.notify(`Session forked → tmux ${mode}`, "info");
			} else {
				ctx.ui.notify(result.error!, "error");
			}
		},
	});

	// Alt+T shortcut — quick vertical split
	pi.registerShortcut("alt+t", {
		description: "Fork session into a new tmux vertical split",
		handler: async (ctx) => {
			if (!isInTmux()) {
				ctx.ui.notify("Not running inside tmux", "error");
				return;
			}

			const sessionFile = ctx.sessionManager.getSessionFile();
			if (!sessionFile) {
				ctx.ui.notify("No session file (ephemeral mode)", "error");
				return;
			}

			const result = await forkToTmux(pi, sessionFile, ctx.cwd, "vertical");

			if (result.success) {
				ctx.ui.notify("Session forked → tmux split", "info");
			} else {
				ctx.ui.notify(result.error!, "error");
			}
		},
	});
}
