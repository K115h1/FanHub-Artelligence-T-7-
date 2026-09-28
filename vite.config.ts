import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(), react(),
  ],

  // The Vite app is the React frontend only: index.html, src/ and public/.
  // Everything else in this repo belongs to the .NET solution or the offline
  // data pipeline, and none of it is in the module graph — but the watcher
  // walks the whole project directory by default, so each of those files
  // triggers a pointless HMR check on every save.
  //
  // backend/ is not merely wasteful, it is actively harmful: `dotnet run` and
  // `dotnet build` hold a lock on apphost.exe while they work, and the
  // recursive watcher throws EBUSY on that locked handle, which takes the dev
  // server down with it. bin/ and obj/ are ignored for the same reason, in
  // case anything else ever compiles into the tree.
  server: {
    watch: {
      ignored: [
        '**/backend/**',
        '**/bin/**',
        '**/obj/**',
        '**/database/**',
        '**/data/**',
        '**/docs/**',
        '**/movies/**',
        '**/scripts/**',
        '**/dist/**',
        '**/.git/**',
      ],
    },
  },
})
