import { Search } from 'lucide-react';

export default function RightPanel() {
    return (
        <div className="hidden lg:block w-80 pl-8 py-4 sticky top-0 h-screen overflow-y-auto">
            {/* Search */}
            <div className="sticky top-0 bg-white pb-4 z-10">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Search size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search"
                        className="w-full bg-gray-100 border-none rounded-full py-3 pl-12 pr-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                </div>
            </div>

            {/* Trending */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <h2 className="font-bold text-xl mb-4">Trends for you</h2>
                <div className="flex flex-col gap-4">
                    {["#AIRevolution", "#CodingLife", "SpaceX", "ReactJS", "Python"].map((trend, i) => (
                        <div key={i} className="hover:bg-gray-200 p-2 -mx-2 rounded-lg cursor-pointer transition">
                            <p className="text-xs text-gray-500">Trending in Tech</p>
                            <p className="font-bold text-sm">{trend}</p>
                            <p className="text-xs text-gray-400">12.5K posts</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Who to follow */}
            <div className="bg-gray-50 rounded-xl p-4">
                <h2 className="font-bold text-xl mb-4">Who to follow</h2>
                <div className="flex flex-col gap-4">
                    {[1, 2, 3].map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-gray-300 rounded-full" />
                                <div>
                                    <p className="font-bold text-sm hover:underline cursor-pointer">Dev Person {i + 1}</p>
                                    <p className="text-gray-500 text-xs">@devperson{i + 1}</p>
                                </div>
                            </div>
                            <button className="bg-black text-white text-sm font-bold px-4 py-1.5 rounded-full hover:bg-gray-800 transition">
                                Follow
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
