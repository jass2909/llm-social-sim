import Sidebar from './Sidebar';
import RightPanel from './RightPanel';

export default function Layout({ children }) {
    return (
        <div className="flex justify-center min-h-screen bg-white">
            <div className="flex w-full max-w-7xl">
                <Sidebar />
                <main className="flex-1 border-r border-gray-200 min-w-0">
                    {children}
                </main>
                <RightPanel />
            </div>
        </div>
    );
}
