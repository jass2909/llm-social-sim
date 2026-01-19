import { createContext, useState, useContext, useEffect } from 'react';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  // Optional: Persist to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('llm_sim_user');
    if (saved) {
      setUser(JSON.parse(saved));
    }
  }, []);

  const login = (botData) => {
    setUser(botData);
    localStorage.setItem('llm_sim_user', JSON.stringify(botData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('llm_sim_user');
  };

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
