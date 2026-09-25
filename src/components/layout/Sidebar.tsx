// Sidebar (scaffold placeholder).
// Used by Explorer (filter groups) and Admin (section navigation).
// import React from 'react'
import {
  FaHome, FaCompass, FaGamepad, FaFilm, FaTv, FaMusic,
  FaBook, FaMask, FaUser, FaBookmark, FaCalendarAlt,
  FaShoppingBag, FaCommentDots, FaCog, 
} from "react-icons/fa";
import { SiComicfury } from "react-icons/si";
import { PiMaskHappyFill } from "react-icons/pi";

const mainNav = [
  { label: "Home", icon: FaHome, path: "/" },
  { label: "Explore", icon: FaCompass, path: "/explore" },
];

const categories = [
  { label: "Anime", icon: PiMaskHappyFill, path: "/category/anime" },
  { label: "Gaming", icon: FaGamepad, path: "/category/gaming" },
  { label: "Movies", icon: FaFilm, path: "/category/movies" },
  { label: "TV Shows", icon: FaTv, path: "/category/tv-shows" },
  { label: "K-Pop", icon: FaMusic, path: "/category/k-pop" },
  { label: "Comics", icon: SiComicfury, path: "/category/comics" },
  { label: "Manga", icon: FaBook, path: "/category/manga" },
  { label: "Cosplay", icon: FaMask, path: "/category/cosplay" },
];

const userNav = [
  { label: "My Profile", icon: FaUser, path: "/profile" },
  { label: "Bookmarks", icon: FaBookmark, path: "/bookmarks" },
  { label: "Events", icon: FaCalendarAlt, path: "/events" },
  { label: "Merchandise", icon: FaShoppingBag, path: "/merchandise" },
  { label: "Feedback", icon: FaCommentDots, path: "/feedback" },
];

const adminNav = [
  { label: "Admin Panel", icon: FaCog, path: "/admin" },
];

const Sidebar = () => {

  return (
    <div>
        {/* Sidebar Content */}
        <div className="sidebar-content bg-linear-0 from-[#15001f] to-purple-900 p-4 w-60 h-screen position-fixed flex flex-col overflow-y-auto scrollbar-hide">

          {mainNav.map((item) => (
            <div key={item.label} className="sidebar-header mb-2 hover:bg-[#7C3AED] duration-500 ease-in-out p-2 rounded-lg cursor-pointer">
              <p className="text-white flex items-center space-x-2">
                <item.icon size={24} />
                <a href={item.path} className="text-white font-bold text-lg">{item.label}</a>
              </p>
            </div>
          ))}

          <p className="text-purple-300 text-xs uppercase font-semibold mt-4 mb-2 px-2">Categories</p>
          {categories.map((item) => (
            <div key={item.label} className="sidebar-header mb-2 hover:bg-[#7C3AED] duration-500 ease-in-out p-2 rounded-lg cursor-pointer">
              <p className="text-white flex items-center space-x-2">
                <item.icon size={20} />
                <a href={item.path} className="text-white font-medium">{item.label}</a>
              </p>
            </div>
          ))}

          <p className="text-purple-300 text-xs uppercase font-semibold mt-4 mb-2 px-2">User</p>
          {userNav.map((item) => (
            <div key={item.label} className="sidebar-header mb-2 hover:bg-[#7C3AED] duration-500 ease-in-out p-2 rounded-lg cursor-pointer">
              <p className="text-white flex items-center space-x-2">
                <item.icon size={20} />
                <a href={item.path} className="text-white font-medium">{item.label}</a>
              </p>
            </div>
          ))}

          {adminNav.map((item) => (
            <div key={item.label} className="sidebar-header mt-4 mb-2 hover:bg-[#7C3AED] duration-500 ease-in-out p-2 rounded-lg cursor-pointer">
              <p className="text-white flex items-center space-x-2">
                <item.icon size={20} />
                <a href={item.path} className="text-white font-medium">{item.label}</a>
              </p>
            </div>
          ))}

        </div>
    </div>
  )
}

export default Sidebar