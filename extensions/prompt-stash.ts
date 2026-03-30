import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const STASH_TYPE = "prompt-stash";

export default function (pi: ExtensionAPI) {
  let stash: string[] = [];

  function persist() {
    pi.appendEntry(STASH_TYPE, { items: [...stash] });
  }

  // Restore stash from session on load/reload
  pi.on("session_start", async (_event, ctx) => {
    stash = [];
    const entries = ctx.sessionManager.getEntries();
    for (const entry of entries) {
      if (entry.type === "custom" && entry.customType === STASH_TYPE) {
        stash = (entry as any).data?.items ?? [];
      }
    }
    updateWidget(ctx);
  });

  function updateWidget(ctx: { ui: { setWidget: Function; setStatus: Function } }) {
    if (stash.length > 0) {
      const lines = stash.map((s, i) => {
        const preview = s.length > 60 ? s.slice(0, 57) + "..." : s;
        return `  ${i}: ${preview.replace(/\n/g, "↵")}`;
      });
      ctx.ui.setWidget("prompt-stash", [`📋 Stash (${stash.length}) — Alt+Z to unstash:`, ...lines]);
      ctx.ui.setStatus("prompt-stash", `📋 ${stash.length} stashed`);
    } else {
      ctx.ui.setWidget("prompt-stash", undefined);
      ctx.ui.setStatus("prompt-stash", undefined);
    }
  }

  // Keyboard shortcuts — work even with text in the editor
  pi.registerShortcut("alt+s", {
    description: "Stash current editor text",
    handler: async (ctx) => {
      const text = ctx.ui.getEditorText();
      if (!text || text.trim() === "") {
        ctx.ui.notify("Nothing to stash — editor is empty", "warning");
        return;
      }
      stash.push(text);
      persist();
      ctx.ui.setEditorText("");
      updateWidget(ctx);
      ctx.ui.notify(`Stashed prompt (${stash.length} in stack)`, "info");
    },
  });

  pi.registerShortcut("alt+z", {
    description: "Pop last stashed prompt into editor",
    handler: async (ctx) => {
      if (stash.length === 0) {
        ctx.ui.notify("Stash is empty", "warning");
        return;
      }
      const current = ctx.ui.getEditorText();
      if (current && current.trim() !== "") {
        const ok = await ctx.ui.confirm(
          "Editor not empty",
          "Overwrite current editor text with stashed prompt?"
        );
        if (!ok) return;
      }
      const text = stash.pop()!;
      persist();
      ctx.ui.setEditorText(text);
      updateWidget(ctx);
      ctx.ui.notify(`Restored prompt (${stash.length} remaining)`, "info");
    },
  });

  // Commands as alternatives (useful when editor is empty)
  pi.registerCommand("stash", {
    description: "Stash current editor text (prefer Alt+S)",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Tip: Use Alt+S to stash without clearing the editor first", "info");
    },
  });

  pi.registerCommand("unstash", {
    description: "Pop last stashed prompt into editor",
    handler: async (_args, ctx) => {
      if (stash.length === 0) {
        ctx.ui.notify("Stash is empty", "warning");
        return;
      }
      const text = stash.pop()!;
      persist();
      ctx.ui.setEditorText(text);
      updateWidget(ctx);
      ctx.ui.notify(`Restored prompt (${stash.length} remaining)`, "info");
    },
  });

  pi.registerCommand("stash-list", {
    description: "Show all stashed prompts",
    handler: async (_args, ctx) => {
      if (stash.length === 0) {
        ctx.ui.notify("Stash is empty", "info");
        return;
      }
      const items = stash.map((s, i) => {
        const preview = s.length > 80 ? s.slice(0, 77) + "..." : s;
        return `${i}: ${preview.replace(/\n/g, "↵")}`;
      });
      ctx.ui.notify(`Stash (${stash.length}):\n${items.join("\n")}`, "info");
    },
  });

  pi.registerCommand("stash-clear", {
    description: "Clear all stashed prompts",
    handler: async (_args, ctx) => {
      if (stash.length === 0) {
        ctx.ui.notify("Stash is already empty", "info");
        return;
      }
      const ok = await ctx.ui.confirm(
        "Clear stash",
        `Discard ${stash.length} stashed prompt(s)?`
      );
      if (!ok) return;
      stash.length = 0;
      persist();
      updateWidget(ctx);
      ctx.ui.notify("Stash cleared", "info");
    },
  });
}
