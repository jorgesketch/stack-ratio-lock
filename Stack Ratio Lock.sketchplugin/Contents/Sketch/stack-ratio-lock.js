// Stack Ratio Lock
//
// Stacks have no aspect-ratio sizing, and Sketch disables Lock Aspect Ratio for stack children
// that aren't Fixed on both axes. This plugin stores a width / height ratio on a layer, makes
// the layer fill the stack's width, and sets its height from that width whenever it changes.

var sketch = require('sketch')
var UI = require('sketch/ui')
var Settings = require('sketch/settings')

var RATIO_KEY = 'ratio'
var TOLERANCE = 0.01
var MAX_PASSES = 4

// Ratios are read back from documents, which can come from anyone, so extreme values are ignored
// rather than turned into enormous or zero-height layers.
var MIN_RATIO = 0.01
var MAX_RATIO = 100

// MARK: - Model

function isValidRatio(ratio) {
  return typeof ratio === 'number' && ratio >= MIN_RATIO && ratio <= MAX_RATIO
}

function ratioOf(layer) {
  var ratio = Settings.layerSettingForKey(layer, RATIO_KEY)
  return isValidRatio(ratio) ? ratio : undefined
}

function isInStack(layer) {
  var parent = layer.parent
  return Boolean(parent && parent.type !== 'Page' && parent.stackLayout)
}

function canLock(layer) {
  return isInStack(layer) && layer.type !== 'Text' &&
    isValidRatio(layer.frame.width / layer.frame.height)
}

function hasImage(layer) {
  if (layer.type === 'Image') {
    return true
  }
  var fills = layer.style && layer.style.fills ? layer.style.fills : []
  return fills.some(function (fill) {
    return fill.enabled && fill.fillType === sketch.Style.FillType.Pattern
  })
}

function lock(layer) {
  var frame = layer.frame
  Settings.setLayerSettingForKey(layer, RATIO_KEY, frame.width / frame.height)
  layer.horizontalSizing = sketch.FlexSizing.Fill
  layer.verticalSizing = sketch.FlexSizing.Fixed
}

function unlock(layer) {
  Settings.setLayerSettingForKey(layer, RATIO_KEY, undefined)
}

function children(layer) {
  return layer.type === 'SymbolInstance' || !layer.layers ? [] : layer.layers
}

function collect(layer, predicate, into) {
  if (predicate(layer)) {
    into.push(layer)
  }
  children(layer).forEach(function (child) {
    collect(child, predicate, into)
  })
  return into
}

function lockedLayers(roots) {
  var found = []
  roots.forEach(function (root) {
    collect(root, function (layer) { return ratioOf(layer) !== undefined }, found)
  })
  return found
}

function horizontalPadding(stackLayer) {
  var padding = stackLayer.stackLayout.padding
  if (typeof padding === 'number') {
    return 2 * padding
  }
  if (!padding) {
    return 0
  }
  if (typeof padding.horizontal === 'number') {
    return 2 * padding.horizontal
  }
  return (padding.left || 0) + (padding.right || 0)
}

// Layers the user would otherwise resize by hand: images (or layers with an image fill) that are
// Fixed on both axes and as wide as their stack's content area.
function fullWidthRatioLayers(root) {
  return collect(root, function (layer) {
    if (layer === root || !canLock(layer) || !hasImage(layer)) {
      return false
    }
    if (layer.horizontalSizing !== sketch.FlexSizing.Fixed ||
      layer.verticalSizing !== sketch.FlexSizing.Fixed) {
      return false
    }
    var parent = layer.parent
    var contentWidth = parent.frame.width - horizontalPadding(parent)
    return Math.abs(layer.frame.width - contentWidth) < 0.5
  }, [])
}

// MARK: - Layout

function flushLayout(layers) {
  var seen = {}
  layers.forEach(function (layer) {
    var parent = layer.parent
    if (parent && parent.type !== 'Page' && parent.stackLayout && !seen[parent.id]) {
      seen[parent.id] = true
      parent.stackLayout.apply()
    }
  })
}

// Sets each locked layer's height from its laid-out width. Repeats while heights change, since
// a height change can move other stacks around. Returns how many layers changed.
function applyRatios(layers) {
  var changed = {}
  for (var pass = 0; pass < MAX_PASSES; pass++) {
    flushLayout(layers)
    var changedThisPass = 0
    layers.forEach(function (layer) {
      var frame = layer.frame
      var height = Math.round(frame.width / ratioOf(layer) * 100) / 100
      if (Math.abs(frame.height - height) > TOLERANCE) {
        frame.height = height
        layer.frame = frame
        changed[layer.id] = true
        changedThisPass++
      }
    })
    if (changedThisPass === 0) {
      break
    }
  }
  return Object.keys(changed).length
}

// The outermost layer below the page, so stacks that share space with a resized layer are
// updated too.
function topLevelAncestor(layer) {
  var current = layer
  while (current.parent && current.parent.type !== 'Page') {
    current = current.parent
  }
  return current
}

// MARK: - Helpers

function plural(count, singular, pluralForm) {
  return count + ' ' + (count === 1 ? singular : pluralForm)
}

function formatNumber(value) {
  return String(Math.round(value * 100) / 100)
}

function selectedLayers() {
  var document = sketch.getSelectedDocument()
  return document ? document.selectedLayers.layers : []
}

// MARK: - Commands

function toggleRatioLock() {
  var candidates = selectedLayers().filter(canLock)
  if (candidates.length === 0) {
    UI.message('Select a layer inside a stack')
    return
  }

  var allLocked = candidates.every(function (layer) { return ratioOf(layer) !== undefined })
  if (allLocked) {
    candidates.forEach(unlock)
    UI.message('Unlocked the ratio of ' + plural(candidates.length, 'layer', 'layers'))
    return
  }

  var toLock = candidates.filter(function (layer) { return ratioOf(layer) === undefined })
  toLock.forEach(lock)
  applyRatios(toLock)

  var message = toLock.length === 1
    ? 'Locked a ' + formatNumber(ratioOf(toLock[0])) + ':1 ratio on ' + toLock[0].name
    : 'Locked the ratio of ' + plural(toLock.length, 'layer', 'layers')
  UI.message(message)
}

function resize(layers, width) {
  if (!(isFinite(width) && width > 0)) {
    UI.message('Enter a number greater than 0')
    return
  }

  var autoLocked = []
  layers.forEach(function (layer) {
    if (lockedLayers([layer]).length === 0) {
      autoLocked = autoLocked.concat(fullWidthRatioLayers(layer))
    }
  })
  autoLocked.forEach(lock)

  layers.forEach(function (layer) {
    if (layer.stackLayout && layer.horizontalSizing === sketch.FlexSizing.Fit) {
      layer.horizontalSizing = sketch.FlexSizing.Fixed
    }
    var frame = layer.frame
    frame.width = width
    layer.frame = frame
  })

  var locked = lockedLayers(layers)
  var updated = applyRatios(locked)

  var message = 'Resized ' + plural(layers.length, 'layer', 'layers')
  if (locked.length === 0) {
    message += ', no locked ratios inside'
  } else {
    message += ', updated ' + plural(updated, 'ratio', 'ratios')
  }
  if (autoLocked.length > 0) {
    message += ' (locked ' + plural(autoLocked.length, 'new layer', 'new layers') + ')'
  }
  UI.message(message)
}

function setWidth(context) {
  var layers = selectedLayers()
  if (layers.length === 0) {
    UI.message('Select one or more layers to resize')
    return
  }

  // Lets `sketchtool run … --context='{width: …}'` skip the dialog.
  if (context && context.width !== undefined && context.width !== null) {
    resize(layers, Number(context.width))
    return
  }

  UI.getInputFromUser('Width', {
    initialValue: formatNumber(layers[0].frame.width),
    description: 'Locked ratios inside the selection follow the new width',
  }, function (error, value) {
    if (error) {
      return
    }
    resize(layers, parseFloat(value))
  })
}

function updateRatios() {
  var document = sketch.getSelectedDocument()
  if (!document) {
    return
  }
  var roots = document.selectedLayers.layers
  if (roots.length === 0) {
    roots = [document.selectedPage]
  }
  var locked = lockedLayers(roots)
  if (locked.length === 0) {
    UI.message('No locked ratios found')
    return
  }
  var updated = applyRatios(locked)
  UI.message(updated === 0
    ? 'All ratios are up to date'
    : 'Updated ' + plural(updated, 'ratio', 'ratios'))
}

// MARK: - Actions

function onLayersResized(context) {
  var resized = context.actionContext.layers
  if (!resized) {
    return
  }
  var roots = []
  var seen = {}
  for (var i = 0; i < resized.count(); i++) {
    var root = topLevelAncestor(sketch.fromNative(resized.objectAtIndex(i)))
    if (!seen[root.id]) {
      seen[root.id] = true
      roots.push(root)
    }
  }
  var locked = lockedLayers(roots)
  if (locked.length > 0) {
    applyRatios(locked)
  }
}
