// The mojibake signature, shared by the scanner and its self-test.
//
// WHAT GOES WRONG
//   A file is read as the system codepage and written back as UTF-8. Every
//   non-ASCII byte is then re-encoded, so "é" (bytes C3 A9) becomes the two
//   characters "Ã©" (bytes C3 83 C2 A9) and the damage is invisible to anyone
//   who does not already know the title should carry an accent.
//
// WHICH SHAPE
//   Reading as latin1 gives the leading characters Â Ã Ä â ã followed by a
//   continuation character. Reading as cp1252 instead maps 0x80-0x9F to
//   typographic characters, so the same damage looks like "â€™" (U+20AC U+2122)
//   rather than "â\x80\x99". Both are in scope, because which one you get
//   depends on the machine that did the damage, not on the file.
//
// WHY NOT THE SIMPLER "[lead][continuation]"
//   U+0080-U+009F are the C1 control characters. They never occur in a title
//   or a summary, so any of them at all is proof of damage. That check is
//   included because it has no false positives whatsoever, and it is the one
//   that catches a damage pattern not anticipated here.

// The Latin-1 renderings of the bytes 0x80-0xBF.
const LEAD = '[\\u00C2-\\u00C4\\u00E2\\u00E3]'

// What may follow: a Latin-1 control or high character, or the cp1252
// character that the equivalent byte 0x80-0x9F maps to.
const CONTINUATION =
  '[\\u0080-\\u00BF\\u20AC\\u201A\\u0192\\u201E\\u2026\\u2020\\u2021' +
  '\\u02C6\\u2030\\u0160\\u2039\\u0152\\u2122\\u02DC\\u0161\\u203A\\u0153' +
  '\\u017D\\u0178\\u017E\\u017A\\u20B9]'

/** A C1 control character, which no real title or summary contains. */
export const HAS_C1_CONTROL = /[\u0080-\u009F]/

/** A Latin-1 or cp1252 mojibake lead character followed by its continuation. */
export const HAS_MOJIBAKE_PAIR = new RegExp(`${LEAD}${CONTINUATION}`)

/** True when a value shows either sign of a re-encoded round trip. */
export const isMojibake = (value) =>
  typeof value === 'string' &&
  (HAS_C1_CONTROL.test(value) || HAS_MOJIBAKE_PAIR.test(value))

/**
 * Applies one round of the damage, so a self-test can build a known-bad value.
 * @param {string} good correctly encoded text
 * @param {'latin1', 'cp1252'} [codepage] which codepage did the misreading
 */
export const damageOnce = (good, codepage = 'latin1') => {
  const bytes = Buffer.from(good, 'utf8')
  const misread = codepage === 'cp1252' ? bytes.toString('binary') : bytes.toString('latin1')
  // Re-encode the misread bytes as UTF-8, which is the second half of the
  // damage. cp1252 needs a real decoder, which Node does not expose, so binary
  // stands in and the high bytes keep their identity.
  return Buffer.from(misread, codepage === 'cp1252' ? 'binary' : 'utf8').toString('latin1')
}
