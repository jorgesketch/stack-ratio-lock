# Stack Ratio Lock

Keeps layers at their aspect ratio inside Sketch stacks. Resize a card, and the 16:9 image inside
it stays 16:9.

## Install

- [**Download the plugin**](https://github.com/jorgesketch/stack-ratio-lock/releases/latest/download/stack-ratio-lock.sketchplugin.zip),
  then double-click `Stack Ratio Lock.sketchplugin` to install it.

Requires **Sketch 2026.1 or newer**.

## Why

Stacks have no aspect-ratio sizing. An image inside a card either keeps its size (Fixed) or
stretches with the card (Fill), but its height never follows its width. Lock Aspect Ratio in the
Inspector is only available for stack layers that are Fixed in both directions, so every new card
width means resizing the image by hand.

This plugin does that resizing for you.

## Commands

All commands are in **Plugins › Stack Ratio Lock**.

### Set Width…

Select one or more cards and enter a width. Every locked layer inside them keeps its ratio.

You don't need to lock anything first. If a card has no locked layers yet, Set Width locks its
images automatically: any image, or layer with an image fill, that's Fixed in both directions and
spans the full width of its stack. A card set to Fit width is switched to Fixed, so it can take the
new width.

### Toggle Ratio Lock

Select a layer inside a stack, such as an image or a shape with an image fill, to lock its current
ratio. Run it again to unlock it.

### Update Ratios

Restores the ratio of every locked layer in the selection, or on the whole page when nothing is
selected. Use it after changing a size in a way the plugin isn't told about (see
[Limits](#limits)).

### Drag to resize

Drag-resizing a card on the canvas fixes the locked layers inside it as soon as you let go of the
mouse. While you drag, the image stretches, because Sketch only tells plugins when a resize starts
and when it ends.

## How it works

- **Locking** saves the layer's current width ÷ height in the document, on the layer itself. It
  also sets the layer to Fill width and Fixed height, so the stack controls its width and the
  plugin controls its height. You can see both settings in the Inspector.
- **Updating** lets each stack lay out first, then sets every locked layer's height to its new
  width ÷ the saved ratio. A taller image can make other stacks around it grow, so the plugin
  repeats this, at most four times, until nothing moves.
- **The ratio is saved in the file.** Anyone who opens it with the plugin installed gets the same
  behaviour. Without the plugin, a locked layer is just Fill width and Fixed height, and it keeps
  the height it had.
- **Unlocking** forgets the ratio but leaves the layer's sizing as it is.
- Heights are exact, not rounded to whole pixels: 300 wide at 16:9 is 168.75, the same as
  Sketch's own Lock Aspect Ratio.
- The plugin doesn't connect to the internet or read or write files. It only changes layer sizes
  and sizing settings, and the ratios it saves in the document.

## Limits

- **Width drives height.** A layer that fills the height of a row and should take its width from
  that height, such as a square thumbnail in a list item, isn't supported.
- **Some changes aren't reported to plugins.** That includes typing a size in the Inspector, for
  the card or a stack around it, and changing a stack's padding. Run **Update Ratios** afterwards.
- **Component instances** can't use it, because layers inside an instance can't be resized on
  their own. It works inside a Component Source.
- Text layers can't be locked, and ratios must be between 1:100 and 100:1.

## Try it

[`Extras/Ratio Lock Test.sketch`](Extras/Ratio%20Lock%20Test.sketch) has a 512 px card and a
256 px card that was resized by hand. Select the 512 px card, choose **Set Width…** and enter
`256`. The image becomes 256 × 144, matching the hand-made card.

You can also run Set Width from Terminal with `sketchtool`, which comes inside the Sketch app. It
resizes the cards selected in Sketch, and `width` skips the dialog:

```bash
/Applications/Sketch.app/Contents/MacOS/sketchtool run "Stack Ratio Lock.sketchplugin" setWidth --context='{"width":256}'
```

## License

[MIT](LICENSE)
