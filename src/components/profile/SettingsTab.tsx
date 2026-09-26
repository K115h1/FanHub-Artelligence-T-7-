// SettingsTab — display and motion preferences.
//
// Two of these (font size, reduce motion) write to <html> rather than to a
// React tree, so their effect is document-wide and they live in the provider.
// See app/providers/SettingsProvider.tsx.
import { useSettings } from '../../context/SettingsContext'
import { useTheme, type Theme } from '../../context/ThemeContext'
import { FONT_SCALES } from '../../types/models'
import Toggle from '../common/Toggle'
import SettingRow from '../common/SettingRow'

export default function SettingsTab() {
  const { settings, updateSettings, resetSettings, setFontScale } = useSettings()
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-4">
      {/* ---- Appearance ---- */}
      <SettingRow
        title="Appearance"
        description="How Fan Hub Plus looks on this device."
        footnote="The theme is stored separately from these settings — see ThemeProvider."
      >
        <div className="flex items-center justify-between gap-4 py-3">
          <div>
            <span className="block text-sm font-medium text-ink">Theme</span>
            <p className="mt-0.5 text-xs text-ink-subtle">
              Dark mode is also available from the switch at the bottom of the sidebar.
            </p>
          </div>

          {/* Segmented control rather than a toggle, because theme is a choice
              of two, not an on/off. */}
          <div
            role="radiogroup"
            aria-label="Theme"
            className="flex shrink-0 rounded-lg border border-line p-0.5"
          >
            {(['light', 'dark'] as Theme[]).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={theme === option}
                onClick={() => setTheme(option)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  theme === option
                    ? 'bg-accent text-accent-ink'
                    : 'text-ink-muted hover:bg-accent-soft hover:text-accent'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 py-3">
          <div>
            <span className="block text-sm font-medium text-ink">Text size</span>
            <p className="mt-0.5 text-xs text-ink-subtle">
              Scales every rem-based size in the app, not just this page.
            </p>
          </div>

          <div
            role="radiogroup"
            aria-label="Text size"
            className="flex shrink-0 rounded-lg border border-line p-0.5"
          >
            {FONT_SCALES.map((scale) => (
              <button
                key={scale}
                type="button"
                role="radio"
                aria-checked={settings.fontScale === scale}
                onClick={() => setFontScale(scale)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                  settings.fontScale === scale
                    ? 'bg-accent text-accent-ink'
                    : 'text-ink-muted hover:bg-accent-soft hover:text-accent'
                }`}
              >
                {scale === 1 ? 'Default' : `${Math.round(scale * 100)}%`}
              </button>
            ))}
          </div>
        </div>
      </SettingRow>

      {/* ---- Motion ---- */}
      <SettingRow
        title="Motion"
        description="The home banner slides on its own. These are the only controls for it now that its arrows and dots were removed."
      >
        <Toggle
          label="Carousel autoplay"
          description="Advance the home banner automatically. Turning this off leaves it on the first slide until you reload the page."
          checked={settings.carouselAutoplay}
          onChange={(next) => updateSettings({ carouselAutoplay: next })}
        />
        <Toggle
          label="Reduce motion"
          description="Removes animation across the whole site, regardless of your system settings."
          checked={settings.reduceMotion}
          onChange={(next) => updateSettings({ reduceMotion: next })}
        />
      </SettingRow>

      {/* ---- Reset ---- */}
      <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h3 className="text-sm font-semibold text-ink">Reset settings</h3>
          <p className="mt-0.5 text-xs text-ink-subtle">
            Puts every preference on this page back to its default. Your profile and accounts
            are not affected.
          </p>
        </div>
        <button
          type="button"
          onClick={resetSettings}
          className="shrink-0 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink-muted transition hover:border-accent hover:text-accent"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
