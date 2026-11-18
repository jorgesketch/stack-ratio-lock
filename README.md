# Stack Ratio Lock

Keeps a layer's aspect ratio inside a stack when the stack changes width — the classic video
card, where cards of different widths must keep a 16:9 image.

Sketch stacks have no aspect-ratio sizing, and Lock Aspect Ratio is disabled for stack children
that aren't Fixed on both axes. This plugin stores the ratio on the layer itself, sets the layer
to Fill width, and sets its height from its width.

## Commands

Plugins › Stack Ratio Lock:

- **Toggle Ratio Lock** — select a layer inside a stack (an image, a frame with an image fill…).
  Stores its current width / height ratio and makes it Fill width, Fixed height. Run it again to
  unlock.
- **Set Width…** — select one or more cards and type a width. Locked layers inside follow. If a
  card has no locked layers yet, any image (or layer with an image fill) that's Fixed on both
  axes and spans the stack's full width is locked automatically first — so the sample file works
  with no setup.
- **Update Ratios** — restores locked ratios in the selection, or on the whole page when nothing
  is selected. Use it after typing a width in the Inspector.

Drag-resizing a layer on the canvas updates the locked ratios inside it automatically when you
let go of the mouse (the `LayersResized` action).

## Limits

- Width drives height. Height-driven ratios (e.g. an image that fills a row's height) aren't
  supported.
- Typing a size in the Inspector doesn't fire an action — run Update Ratios afterwards.
- Component instances can't use it: nested layers have no size override, and instances re-lay
  out from their source. It works on a Component Source.
- Heights are exact (300 wide at 16:9 is 168.75), same as the native Lock Aspect Ratio.
- Ratios must be between 1:100 and 100:1. Anything outside that range is ignored.

## Testing

`Extras/Ratio Lock Test.sketch` is the original sample: a 512 and a 256 card with a 16:9 bitmap.
Commands can be run headlessly; `width` skips the Set Width dialog:

```bash
sketchtool run "Stack Ratio Lock.sketchplugin" setWidth --without-activating --context='{"width":256}'
```
