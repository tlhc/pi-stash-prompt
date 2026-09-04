# pi-stash-prompt

Claude Code's Ctrl+S for [pi](https://github.com/earendil-works/pi): stash the draft, send something else, get the draft back.

## Install

```bash
pi install git:github.com/tlhc/pi-stash-prompt
```

Then run `/reload` in pi.

## Usage

Press **Ctrl+S** while the editor is focused:

- Editor has text: save it to the stash, clear the editor, show `stashed` in the footer
- Editor is empty: put the stash back
- After you send another normal message: the stash fills the editor on its own

In `/model`, `/thinking`, and `/resume`, Ctrl+S still saves the default model or toggles sort.

## Limits

Restore puts the cursor at the end. Large pastes come back as full text. If Ctrl+S is XOFF in your terminal, run `stty -ixon`.
