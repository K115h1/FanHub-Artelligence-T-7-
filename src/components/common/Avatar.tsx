// Avatar — profile-picture stand-in: the account's initials on a
// purple-gradient tile. No image files needed and fully on-theme
// (white/black + purple only). rounded-md keeps the low roundness
// used across the app.

// "Ada Lovelace" → "AL", "ada" → "AD", "" → "?"
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Avatar({
  name,
  size = 'md',
}: {
  name: string
  size?: 'sm' | 'md'
}) {
  const box = size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-9 w-9 text-xs'
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-purple-600 via-purple-500 to-purple-400 font-bold text-white ${box}`}
    >
      {initialsOf(name)}
    </span>
  )
}
