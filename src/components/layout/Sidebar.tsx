import { NavLink } from 'react-router-dom'
import type { IconType } from 'react-icons'
import {
  FaHome,
  FaCompass,
  FaGamepad,
  FaFilm,
  FaTv,
  FaMusic,
  FaBook,
  FaMask,
  FaUser,
  FaBookmark,
  FaCalendarAlt,
  FaShoppingBag,
  FaCommentDots,
  FaCog,
  FaMoon,
} from "react-icons/fa";
import { SiComicfury } from "react-icons/si";
import { PiMaskHappyFill } from "react-icons/pi";
import { useTheme } from '../../context/ThemeContext'

type SidebarItem = {
  label: string;
  icon: IconType;
  path: string;
}

const mainNav: SidebarItem[] = [
  { label: "Home", icon: FaHome, path: "/" },
  { label: "Explore", icon: FaCompass, path: "/explore" },
];

const categories: SidebarItem[] = [
  { label: "Anime", icon: PiMaskHappyFill, path: "/category/anime" },
  { label: "Gaming", icon: FaGamepad, path: "/category/gaming" },
  { label: "Movies", icon: FaFilm, path: "/category/movies" },
  { label: "TV Shows", icon: FaTv, path: "/category/tv-shows" },
  { label: "K-Pop", icon: FaMusic, path: "/category/k-pop" },
  { label: "Comics", icon: SiComicfury, path: "/category/comics" },
  { label: "Manga", icon: FaBook, path: "/category/manga" },
  { label: "Cosplay", icon: FaMask, path: "/category/cosplay" },
];

const userNav: SidebarItem[] = [
  { label: "My Profile", icon: FaUser, path: "/profile" },
  { label: "Bookmarks", icon: FaBookmark, path: "/bookmarks" },
  { label: "Events", icon: FaCalendarAlt, path: "/events" },
  { label: "Merchandise", icon: FaShoppingBag, path: "/merchandise" },
  { label: "Feedback", icon: FaCommentDots, path: "/feedback" },
];

const adminNav: SidebarItem[] = [
  { label: "Admin Panel", icon: FaCog, path: "/admin" },
];

function SidebarLink({
  item,
  big = false,
  className = "",
}: {
  item: SidebarItem
  big?: boolean
  className?: string
}) {
  return (
    <NavLink
      to={item.path}
      end={item.path === "/"}
      className={({ isActive }) =>
        `sidebar-header mb-2 flex cursor-pointer items-center space-x-2 rounded-lg p-2 duration-500 ease-in-out hover:bg-purple-600 hover:text-white ${className} ${isActive
          ? "bg-purple-600 text-white"
          : "text-purple-950 dark:text-white"
        }`
      }
    >
      <item.icon size={big ? 24 : 20} />
      <span className={big ? "font-bold text-lg" : "font-medium"}>
        {item.label}
      </span>
    </NavLink>
  )
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <button
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      onClick={toggleTheme}
      className="sidebar-header sticky bottom-0 mt-auto flex w-full cursor-pointer items-center justify-between rounded-lg bg-white p-2 text-purple-950 duration-500 ease-in-out hover:bg-purple-600 hover:text-white dark:bg-purple-950 dark:text-white"
    >
      <span className="flex items-center space-x-2">
        <FaMoon size={20} />
        <span className="font-medium">Dark Mode</span>
      </span>

      <span
        className={`relative h-5 w-9 rounded-md transition-colors ${isDark ? "bg-purple-600" : "bg-purple-500/30"
          }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-sm bg-white shadow transition-transform ${isDark ? "translate-x-4" : ""
            }`}
        />
      </span>
    </button>
  )
}

export default function Sidebar() {
  return (
    <aside className="sidebar-content sticky top-[73px] hidden h-[calc(100vh-73px)] w-60 shrink-0 flex-col overflow-y-auto border-r border-purple-200 bg-linear-225 from-white to-purple-200 p-4 scrollbar-hide dark:border-transparent dark:from-black/0 dark:via-black dark:via-purple-950/95 dark:to-purple-900 md:flex">
      {mainNav.map((item) => (
        <SidebarLink key={item.label} item={item} big />
      ))}

      <p className="text-purple-700 text-xs uppercase font-semibold mt-4 mb-2 px-2 dark:text-purple-300">
        Categories
      </p>

      {categories.map((item) => (
        <SidebarLink key={item.label} item={item} />
      ))}

      <p className="text-purple-700 text-xs uppercase font-semibold mt-4 mb-2 px-2 dark:text-purple-300">
        User
      </p>

      {userNav.map((item) => (
        <SidebarLink key={item.label} item={item} />
      ))}

      {adminNav.map((item) => (
        <SidebarLink key={item.label} item={item} className="mt-4" />
      ))}

      <ThemeToggle />
    </aside>
  )
}