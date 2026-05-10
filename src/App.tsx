/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Medal, Moon, Sun, RefreshCw, ChevronRight, User, Hash, Zap } from 'lucide-react';
import { cn } from './lib/utils';

// Google Sheets CSV Export URL
const CSV_URL = 'https://docs.google.com/spreadsheets/d/1-CACUVpi5k0KZEgSayNR2vio4Bn61MQqYuUkTwE0crM/export?format=csv';

interface Driver {
  rank: number;
  name: string;
  points: number;
}

function LoadingState() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div 
          key={i} 
          className="h-16 w-full animate-pulse bg-zinc-100 dark:bg-zinc-800/10 rounded-lg flex items-center px-4 gap-4"
        >
          <div className="w-8 h-8 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-6 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="ml-auto w-12 h-8 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      ))}
    </>
  );
}

function DriverRow(props: { driver: Driver; index: number; key?: string | number }) {
  const { driver, index } = props;
  const isTop3 = index < 3;
  
  return (
    <motion.div
      layout
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      transition={{ delay: index * 0.05 }}
      id={`driver-${driver.name.replace(/\s/g, '-')}`}
      className={cn(
        "f1-card flex items-center justify-between p-4 rounded-lg shadow-sm border border-black/5 dark:border-white/5",
        isTop3 ? "bg-white/80 dark:bg-zinc-900 font-semibold" : "bg-white dark:bg-zinc-900/50"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-8 flex justify-center font-racing italic text-lg leading-none",
          index === 0 && "text-yellow-500 font-black scale-125",
          index === 1 && "text-slate-400 font-bold",
          index === 2 && "text-amber-600 font-bold",
          index > 2 && "text-zinc-400 font-medium"
        )}>
          {index === 0 ? "1" : index === 1 ? "2" : index === 2 ? "3" : driver.rank}
        </div>
        
        <div className="h-6 w-[2px] bg-f1-red" />
        
        <div className="flex flex-col">
          <span className="font-racing uppercase italic tracking-tight text-sm sm:text-base">
            {driver.name}
          </span>
          {isTop3 && (
            <span className="text-[8px] uppercase font-bold tracking-widest text-f1-red">
              {index === 0 ? 'Championship Leader' : 'Podium Contender'}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-sm font-bold shadow-inner">
          {driver.points}
        </div>
        <ChevronRight size={16} className="opacity-20" />
      </div>
    </motion.div>
  );
}

function PodiumCard({ driver, position }: { driver?: Driver, position: number }) {
  if (!driver) return null;

  const heights = {
    1: 'h-40',
    2: 'h-32',
    3: 'h-28'
  };

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        "relative flex flex-col items-center p-3 rounded-t-xl text-white shadow-xl",
        position === 1 ? "f1-gradient z-10 scale-110" : "bg-f1-black",
        heights[position as keyof typeof heights]
      )}
    >
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full border-4 border-f1-red bg-white dark:bg-zinc-800 overflow-hidden flex items-center justify-center shadow-lg">
        {position === 1 && <Trophy className="text-yellow-500" size={32} />}
        {position === 2 && <Medal className="text-slate-400" size={32} />}
        {position === 3 && <Medal className="text-amber-600" size={32} />}
      </div>
      
      <div className="mt-auto text-center w-full">
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">P{position}</span>
        <h3 className="font-racing font-bold text-sm truncate w-full italic uppercase leading-none mt-1">
          {driver.name.split(' ')[0]}
        </h3>
        <p className="font-mono text-xs font-bold mt-1">{driver.points} PTS</p>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('gt7-theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(CSV_URL);
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData = results.data.map((row: any) => {
            // Find keys case-insensitively or with common variants
            const getField = (variants: string[]) => {
              for (const variant of variants) {
                if (row[variant] !== undefined) return row[variant];
                // Try case-insensitive match
                const match = Object.keys(row).find(k => k.toLowerCase() === variant.toLowerCase());
                if (match) return row[match];
              }
              return undefined;
            };

            return {
              rank: parseInt(getField(['RANK', 'Rank', 'POS']) || '0'),
              name: getField(['NOME', 'Nome', 'Name', 'Driver', 'PILOTO']) || 'Unknown',
              points: parseFloat(getField(['PONTOS', 'TOTAL PONTOS', 'Total Pontos', 'Points', 'PTS']) || '0')
            };
          })
          .filter(d => d.name !== 'Unknown' && d.name.trim() !== '')
          .sort((a, b) => b.points - a.points)
          .map((d, index) => ({ ...d, rank: index + 1 })); // Correcting rank based on sorted points
          
          setDrivers(parsedData);
          setLastUpdated(new Date());
          setLoading(false);
        },
        error: (error: Error) => {
          console.error('CSV Parsing Error:', error);
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Fetch Error:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto refresh every 5 minutes
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('gt7-theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('gt7-theme', 'light');
    }
  }, [isDarkMode]);

  const topThree = useMemo(() => drivers.slice(0, 3), [drivers]);
  const restOfField = useMemo(() => drivers.slice(3), [drivers]);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-f1-black text-white px-4 py-4 f1-border-bottom shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-f1-red p-1 rotate-[-10deg]">
              <Zap size={24} fill="white" className="text-white" />
            </div>
            <div>
              <h1 className="font-racing font-extrabold text-xl italic tracking-tighter leading-none">
                GT7 <span className="text-f1-red">CHAMPIONSHIP</span>
              </h1>
              <p className="text-[10px] uppercase font-bold opacity-70 tracking-widest leading-none mt-1">
                Live Standings • {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={fetchData}
              className={cn("p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors", loading && "animate-spin")}
              aria-label="Refresh Data"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6 space-y-6">
        {/* Podium Section */}
        {drivers.length > 0 && (
          <div className="grid grid-cols-3 gap-2 items-end pt-8 pb-4 relative h-48">
            <PodiumCard driver={topThree[1]} position={2} />
            <PodiumCard driver={topThree[0]} position={1} />
            <PodiumCard driver={topThree[2]} position={3} />
          </div>
        )}

        {/* List Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2 mb-4 opacity-50 uppercase text-[10px] font-bold tracking-widest">
            <div className="flex items-center gap-4">
              <span className="w-8">POS</span>
              <span>PILOTO</span>
            </div>
            <span>PTS</span>
          </div>

          <AnimatePresence mode="popLayout">
            {loading && drivers.length === 0 ? (
              <LoadingState />
            ) : (
              drivers.map((driver, index) => (
                <DriverRow 
                  key={driver.name} 
                  driver={driver} 
                  index={index} 
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="mt-12 py-8 px-4 text-center border-t border-zinc-200 dark:border-zinc-800 opacity-30">
        <p className="text-[10px] uppercase font-bold tracking-widest">Official GT7 Community Standings</p>
      </footer>
    </div>
  );
}

