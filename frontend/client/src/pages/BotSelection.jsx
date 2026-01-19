import { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { User, Cpu } from 'lucide-react';

export default function BotSelection() {
  const [bots, setBots] = useState([]);
  const { login } = useUser();

  useEffect(() => {
    const fetchBots = async () => {
      try {
        const res = await axios.get('http://localhost:8000/bots');
        setBots(res.data);
      } catch (err) {
        console.error("Failed to load bots", err);
      }
    };
    fetchBots();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Welcome to SocialSim</h1>
          <p className="text-gray-600 text-lg">Choose your identity to start interacting</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {bots.map((bot, idx) => (
            <button
              key={idx}
              onClick={() => login(bot)}
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md border border-gray-100 transition transform hover:-translate-y-1 group flex flex-col items-center gap-4"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-inner">
                {bot.name[0]?.toUpperCase()}
              </div>
              <div className="text-center">
                <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-600 transition">
                  {bot.name}
                </h3>
                <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mt-1">
                  <Cpu size={12} />
                  <span>{bot.model}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
        
        {bots.length === 0 && (
           <div className="text-center text-gray-500 mt-8">
             Loading personas...
           </div>
        )}
      </div>
    </div>
  );
}
