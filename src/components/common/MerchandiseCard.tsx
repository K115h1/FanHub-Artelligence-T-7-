// MerchandiseCard, one product, for the product strips on a category page.
//
// This is the only merchandise card going now. It used to be
// components/merch/MerchCard and the old /merchandise grid used it, but that
// whole bit got reworked and taken out. We still need a card here though,
// because a fandom like Cosplay has products and no titles, so without a strip
// those rows were not reachable from anywhere.
//
// Image is a CSS background. Bad path means it paints nothing and you see the
// layer under it, instead of a broken image icon sat in the middle of the grid.
// The artwork we were given is the most likely thing to be missing.
//
// Renders as a list item so it drops into a grid. Nothing here is buyable, the
// shop has no cart, so there is no price link or product page on purpose.
import { ImageOff } from 'lucide-react'
import type { MerchandiseItem } from '../../types/models'
import { CategoryDot } from './CategoryArt'

const CATEGORY_NAMES: Record<string, string> = {
  anime: 'Anime',
  cosplay: 'Cosplay',
  'k-pop': 'K-Pop',
  manga: 'Manga',
  movies: 'Movies',
  gaming: 'Gaming',
  comics: 'Comics',
  'tv-shows': 'TV Shows',
}

export default function MerchandiseCard({ item }: { item: MerchandiseItem }) {
  const category = CATEGORY_NAMES[item.categorySlug] ?? item.categorySlug

  return (
    <li className="group overflow-hidden rounded-xl border border-line bg-surface transition hover:border-accent">
      <div className="relative aspect-square bg-surface-sunken">
        {item.imagePath && (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
            style={{ backgroundImage: `url(${item.imagePath})` }}
          />
        )}

        {/* Under the photo rather than over it, so a failed load leaves a
            purple tile instead of a "no photo" note across a good picture. */}
        {!item.imagePath && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 accent-wash">
            <ImageOff size={20} className="text-white/60" aria-hidden="true" />
            <span className="text-[11px] font-medium text-white/70">No photo yet</span>
          </span>
        )}

        {/* Bottom scrim so the category chip stays legible over a light photo. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/75 to-transparent"
        />
        <span className="absolute bottom-2 left-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-white">
          <CategoryDot slug={item.categorySlug} />
          {category}
        </span>

        {item.tag && (
          <span className="absolute top-2 left-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-purple-800">
            {item.tag}
          </span>
        )}
      </div>

      <div className="space-y-1 p-3">
        <p className="text-sm leading-snug font-semibold text-ink">{item.name}</p>
        {item.description && (
          <p className="line-clamp-2 text-xs text-ink-muted">{item.description}</p>
        )}
        <p className="pt-0.5 text-[11px] font-medium text-ink-subtle">
          {item.priceNote ?? 'Price to be announced'}
        </p>
      </div>
    </li>
  )
}
