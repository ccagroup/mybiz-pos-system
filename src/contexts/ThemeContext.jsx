import { createContext, useContext, useState, useEffect } from 'react';
import { db, initializeSettings } from '../db/db';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [accentColor, setAccentColor] = useState('blue');

  useEffect(() => {
    const loadSettings = async () => {
      await initializeSettings();
      const savedTheme = await db.settings.get('theme');
      const savedColor = await db.settings.get('accentColor');
      if (savedTheme) setTheme(savedTheme.value);
      if (savedColor) setAccentColor(savedColor.value);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const updateSetting = async (key, value) => {
    await db.settings.put({ key, value });
    if (key === 'theme') setTheme(value);
    if (key === 'accentColor') setAccentColor(value);
  };

  return (
    <ThemeContext.Provider value={{ theme, accentColor, updateSetting }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);