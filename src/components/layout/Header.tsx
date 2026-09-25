import { Search, Moon, Menu } from "lucide-react"
const Header = () => {
    return (
        <>
            <header className="sticky top-4 z-50 mx-auto w-[90%] max-w-6xl">
                <div className="flex items-center justify-between rounded-full border border-purple-400 bg-transparent px-3 py-3 sm:px-4 md:px-6 md:py-4 shadow-lg backdrop-blur-xl">                    {/* Logo */}
                    <div className="text-lg sm:text-xl font-bold text-black ">
                        Fan Hub Plus
                    </div>
                    <button
                        aria-label="Open menu"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-purple-400/30 bg-transparent text-black/60 transition hover:border-purple-400 hover:text-purple-500 lg:hidden"
                    >
                        <Menu size={18} />
                    </button>
                    {/* Navigation */}
                    <nav className="hidden items-center gap-4 lg:flex xl:gap-6">
                        <a href="#"
                            className="text-black/70 transition hover:text-purple-500 "
                        >
                            Home
                        </a>
                        <a href="#"
                            className="text-black/70 transition hover:text-purple-500"
                        >
                            Categories
                        </a>
                        <a href="#"
                            className="text-black/70 transition hover:text-purple-500 "
                        >
                            About
                        </a>
                    </nav>

                    {/* Controls */}
                    <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
                        {/* search */}
                        <button
                            aria-label="Search"
                            className="flex sm:h-9 sm:w-9 items-center h-8 w-8 justify-center rounded-full border border-purple-400/30 bg-transparent text-black/60 transition hover:border-purple-400 hover:text-purple-500"
                        >

                            <Search size={16} />
                        </button>

                        {/* Dark and light mode toggle */}
                        <button
                            aria-label="Dark mode toggle"
                            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-purple-400/30 bg-transparent text-black/60 transition hover:border-purple-400 hover:text-purple-500"
                        >

                            <Moon size={16} />
                        </button>

                        {/* Font size Controls */}
                        <div className=" hidden sm:flex items-center gap-1 rounded-full border border-purple-400/30 bg-transparent px-2 py-1.5 transition hover:border-purple-400">
                            <span className="px-1 text-xs text-black/70 transition hover:text-purple-500">A-</span>
                            <span className="h-8 w-px bg-purple-400/30" />
                            <span className="px-1 text-base font-medium text-black/70 transition hover:text-purple-500">A+</span>
                        </div>

                        {/* Login */}
                        <button className=" flex-shrink-0 rounded-xl bg-purple-600 px-3 py-2 text-sm sm:px-4 sm:py-2 sm:text-base text-white transition hover:bg-purple-500">
                            Login
                        </button>


                    </div>
                </div>
            </header>
        </>
    )
}

export default Header