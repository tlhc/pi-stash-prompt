# pi-stash-prompt

Claude Code's Ctrl+S for [pi](https://github.com/earendil-works/pi): stash the draft, send something else, get the draft back.

## Install

```bash
pi install git:github.com/tlhc/pi-stash-prompt
```

Then run `/reload` in pi.

## Usage

Press **Ctrl+S** while the editor is focused:

- Editor has text: push it onto a LIFO stack, clear the editor, show `stashed N` in the footer
- Editor is empty: pop the last draft back
- After you send another normal message: pop into the editor only if it is still empty
- `/new` / session shutdown drops the stack

In `/model`, `/thinking`, and `/resume`, Ctrl+S still saves the default model or toggles sort.

## Limits

Restore puts the cursor at the end. Large pastes come back as full text. If Ctrl+S is XOFF in your terminal, run `stty -ixon`.
