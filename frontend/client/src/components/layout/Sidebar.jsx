import { Home, Search, Bell, User, PenTool, LogOut } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { useState } from 'react';

export default function Sidebar() {
    const { user, logout } = useUser();
    const navItems = [
        { icon: <Home size={28} />, label: "Home" },
        { icon: <Search size={28} />, label: "Explore" },
        { icon: <Bell size={28} />, label: "Notifications" },
        { icon: <User size={28} />, label: "Profile" },
    ];

    return (
        <div className="w-20 xl:w-64 sticky top-0 h-screen flex flex-col justify-between border-r border-gray-200 px-2 py-4">
            {/* Top / Nav */}
            <div className="flex flex-col gap-4 items-center xl:items-start">
                {/* Logo */}
                <div className="p-3 hover:bg-gray-200 rounded-full cursor-pointer transition">
                    <div className="w-8 h-8 bg-black rounded-full text-white flex items-center justify-center font-bold">X</div>
                </div>

                {/* Links */}
                <nav className="flex flex-col gap-2 w-full">
                    {navItems.map((item, idx) => (
                        <button
                            key={idx}
                            className="flex items-center gap-4 p-3 hover:bg-gray-200 rounded-full transition w-full justify-center xl:justify-start"
                        >
                            {item.icon}
                            <span className="hidden xl:block text-xl font-medium">{item.label}</span>
                        </button>
                    ))}
                </nav>

                {/* Post Button */}
                {/* Post Button */}
                <button className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-4 xl:px-8 xl:py-3 font-bold text-lg mt-4 shadow-md transition transform hover:scale-105 w-fit xl:w-full flex justify-center">
                    <span className="hidden xl:block">Post</span>
                    <PenTool className="block xl:hidden" />
                </button>
            </div>

            {/* User Profile (Bottom) */}
            <div className="flex items-center gap-3 p-3 hover:bg-gray-200 rounded-full cursor-pointer transition w-full justify-center xl:justify-start mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {user?.name[0]?.toUpperCase() || "?"}
                </div>
                <div className="hidden xl:block overflow-hidden">
                    <p className="font-bold text-sm truncate">{user?.name || "User"}</p>
                    <p className="text-gray-500 text-sm truncate">@{user?.name?.replace(/\s+/g, '').toLowerCase() || "user"}</p>
                </div>
                <button onClick={logout} className="ml-auto p-2 text-gray-500 hover:text-red-500 rounded-full hover:bg-red-50 transition">
                    <LogOut size={20} />
                </button>
            </div>
        </div>
    );
}
