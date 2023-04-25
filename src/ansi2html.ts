// commented out things without easy css equivalent (and which we don't really
// need anyway)
const ANSI_CODE_TABLE = {
  0: null,
  1: { 'font-weight': 'bold' },
  3: { 'font-style': 'italic' },
  4: { 'text-decoration': 'underline' },
  // 5: { blink: true },
  // 6: { blink: true },
  // 7: { invert: true },
  // 9: { strikethrough: true },
  23: { 'font-style': 'normal' }, // 'not italic'
  24: { 'text-decoration': 'none' }, // 'not underlined'
  // 25: { blink: false },
  // 27: { invert: false },
  // 29: { strikethrough: false },
  30: { color: 'black' },
  31: { color: 'red' },
  32: { color: 'green' },
  33: { color: 'yellow' },
  34: { color: 'blue' },
  35: { color: 'magenta' },
  36: { color: 'cyan' },
  37: { color: 'white' },
  39: { color: 'inherit' }, // reset color
  // 90-97 are nonstandard "bright" equivalents to 30-39
  90: { color: 'black' },
  91: { color: 'red' },
  92: { color: 'green' },
  93: { color: 'yellow' },
  94: { color: 'blue' },
  95: { color: 'magenta' },
  96: { color: 'cyan' },
  97: { color: 'white' },
  40: { "background-color": 'black' },
  41: { "background-color": 'red' },
  42: { "background-color": 'green' },
  43: { "background-color": 'yellow' },
  44: { "background-color": 'blue' },
  45: { "background-color": 'magenta' },
  46: { "background-color": 'cyan' },
  47: { "background-color": 'white' },
  49: { "background-color": 'inherit' }, // reset background
  // 100-107 are nonstandard "bright" equivalents to 40-47
  100: { "background-color": 'black' },
  101: { "background-color": 'red' },
  102: { "background-color": 'green' },
  103: { "background-color": 'yellow' },
  104: { "background-color": 'blue' },
  105: { "background-color": 'magenta' },
  106: { "background-color": 'cyan' },
  107: { "background-color": 'white' },
}

// based on https://github.com/agnoster/ansi2html
export default function ansi2html(str: string): string {
  let openTag = false

  function genTag(codes?: number[]) {
    let tag = ''
    if (openTag) {
      tag += "</span>"
      openTag = false
    }

    const styleProps = codes && codes.reduce((accum, c) => {
      if (c in ANSI_CODE_TABLE) {
        return {...accum, ...ANSI_CODE_TABLE[c]}
      } else {
        return accum
      }
    }, {})
    if (styleProps) {
      openTag = true
      const style = Object.keys(styleProps).map(k => `${k}: ${styleProps[k]}`).join('; ')
      tag += `<span style="${style}">`
    }

    return tag
  }

  return str.replace(/(\\u001b|\u001b)?\[([\d+;]+)m/g, function(match, _e, codes) {
    codes = codes.split(";").map(c => parseInt(c, 10))
    return genTag(codes)
  }) + genTag()
}
