import { useState, useEffect, useMemo } from 'react';
import { format, isSaturday, isSunday, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addDays, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './App.css';

function App() {
  const [selectedYear, setSelectedYear] = useState(2025);
  const [vacationDays, setVacationDays] = useState(20);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVacations, setSelectedVacations] = useState([]);
  const [selectedCombinations, setSelectedCombinations] = useState([]);

  // Fetch holidays from API
  useEffect(() => {
    const fetchHolidays = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${selectedYear}/PL`);
        const data = await response.json();
        setHolidays(data.map(h => ({
          date: new Date(h.date),
          name: h.localName || h.name,
        })));
      } catch (error) {
        console.error('Error fetching holidays:', error);
        setHolidays([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHolidays();
  }, [selectedYear]);

  // Load from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem(`urlopy-plan-${selectedYear}`);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setSelectedVacations(parsed.vacations.map(d => new Date(d)));
      setSelectedCombinations(parsed.combinations || []);
      setVacationDays(parsed.vacationDays || 20);
    } else {
      setSelectedVacations([]);
      setSelectedCombinations([]);
    }
  }, [selectedYear]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(`urlopy-plan-${selectedYear}`, JSON.stringify({
      vacations: selectedVacations,
      combinations: selectedCombinations,
      vacationDays
    }));
  }, [selectedVacations, selectedCombinations, selectedYear, vacationDays]);

  // Detect Saturday holidays
  const saturdayHolidays = useMemo(() => {
    return holidays.filter(h => isSaturday(h.date));
  }, [holidays]);

  // Generate vacation combinations
  const vacationCombinations = useMemo(() => {
    const combinations = [];

    holidays.forEach(holiday => {
      const dayOfWeek = getDay(holiday.date);
      const month = holiday.date.getMonth();

      // Thursday holiday -> 1 day vacation (Friday) = 4 days off
      if (dayOfWeek === 4) {
        const friday = addDays(holiday.date, 1);
        combinations.push({
          id: `thu-${holiday.date.getTime()}`,
          name: `${holiday.name} (czwartek) + piątek`,
          vacationDays: [friday],
          totalDays: 4,
          month,
          description: '1 dzień urlopu = 4 dni wolne'
        });
      }

      // Friday holiday -> already long weekend
      // But we can add Monday for 4 days
      if (dayOfWeek === 5) {
        const monday = addDays(holiday.date, 3);
        combinations.push({
          id: `fri-${holiday.date.getTime()}`,
          name: `${holiday.name} (piątek) + poniedziałek`,
          vacationDays: [monday],
          totalDays: 4,
          month,
          description: '1 dzień urlopu = 4 dni wolne'
        });
      }

      // Tuesday holiday -> 1 day (Monday) = 4 days off
      if (dayOfWeek === 2) {
        const monday = addDays(holiday.date, -1);
        combinations.push({
          id: `tue-${holiday.date.getTime()}`,
          name: `${holiday.name} (wtorek) + poniedziałek`,
          vacationDays: [monday],
          totalDays: 4,
          month,
          description: '1 dzień urlopu = 4 dni wolne'
        });
      }

      // Wednesday holiday -> 2 days (Thu, Fri) = 5 days off
      if (dayOfWeek === 3) {
        const thursday = addDays(holiday.date, 1);
        const friday = addDays(holiday.date, 2);
        combinations.push({
          id: `wed-${holiday.date.getTime()}`,
          name: `${holiday.name} (środa) + czw-pt`,
          vacationDays: [thursday, friday],
          totalDays: 5,
          month,
          description: '2 dni urlopu = 5 dni wolne'
        });
      }

      // Monday holiday -> 1 day (Friday before) = 4 days
      if (dayOfWeek === 1) {
        const friday = addDays(holiday.date, -3);
        combinations.push({
          id: `mon-${holiday.date.getTime()}`,
          name: `${holiday.name} (poniedziałek) + piątek`,
          vacationDays: [friday],
          totalDays: 4,
          month,
          description: '1 dzień urlopu = 4 dni wolne'
        });
      }
    });

    // Christmas + New Year combination
    const christmas = holidays.find(h => h.date.getMonth() === 11 && h.date.getDate() === 25);
    const newYear = holidays.find(h => h.date.getMonth() === 0 && h.date.getDate() === 1);

    if (christmas) {
      const christmasDay = getDay(christmas.date);
      // Add days between Christmas and New Year
      const daysToAdd = [];
      let current = addDays(christmas.date, 1);
      const endYear = new Date(selectedYear, 11, 31);

      while (current <= endYear && !isSaturday(current) && !isSunday(current)) {
        if (!holidays.some(h => isSameDay(h.date, current))) {
          daysToAdd.push(new Date(current));
        }
        current = addDays(current, 1);
      }

      if (daysToAdd.length > 0 && daysToAdd.length <= 5) {
        combinations.push({
          id: 'christmas-newyear',
          name: 'Święta Bożego Narodzenia + Nowy Rok',
          vacationDays: daysToAdd,
          totalDays: daysToAdd.length + 2, // +2 for Christmas days
          month: 11,
          description: `${daysToAdd.length} dni urlopu = ${daysToAdd.length + 2} dni wolne (połączenie świąt)`
        });
      }
    }

    // Easter combinations
    const easter = holidays.find(h => h.name.includes('Wielkanoc') || h.name.includes('Easter'));
    if (easter) {
      const easterMonday = holidays.find(h =>
        Math.abs(h.date - easter.date) === 86400000 && h.date > easter.date
      );

      if (easterMonday) {
        const friday = addDays(easter.date, -1);
        const tuesday = addDays(easterMonday.date, 1);
        const wednesday = addDays(easterMonday.date, 2);
        const thursday = addDays(easterMonday.date, 3);
        const nextFriday = addDays(easterMonday.date, 4);

        // Good Friday if not holiday + Tue-Fri after Easter Monday = 9 days
        if (!isSaturday(friday) && !isSunday(friday)) {
          combinations.push({
            id: 'easter-long',
            name: 'Wielkanoc - długi urlop',
            vacationDays: [friday, tuesday, wednesday, thursday, nextFriday],
            totalDays: 9,
            month: easter.date.getMonth(),
            description: '5 dni urlopu = 9 dni wolne'
          });
        }
      }
    }

    return combinations.sort((a, b) => {
      // Sort by month, then by efficiency (total days / vacation days)
      if (a.month !== b.month) return a.month - b.month;
      return (b.totalDays / b.vacationDays.length) - (a.totalDays / a.vacationDays.length);
    });
  }, [holidays, selectedYear]);

  // Check if combination uses Saturday holiday
  const usesSaturdayHoliday = (combination) => {
    const satHoliday = saturdayHolidays.find(sh => sh.date.getMonth() === combination.month);
    return satHoliday !== undefined;
  };

  // Toggle combination
  const toggleCombination = (combinationId) => {
    const combination = vacationCombinations.find(c => c.id === combinationId);
    if (!combination) return;

    if (selectedCombinations.includes(combinationId)) {
      // Remove
      setSelectedCombinations(prev => prev.filter(id => id !== combinationId));
      setSelectedVacations(prev =>
        prev.filter(d => !combination.vacationDays.some(vd => isSameDay(vd, d)))
      );
    } else {
      // Add
      setSelectedCombinations(prev => [...prev, combinationId]);
      setSelectedVacations(prev => {
        const newDays = [...prev];
        combination.vacationDays.forEach(vd => {
          if (!newDays.some(d => isSameDay(d, vd))) {
            newDays.push(vd);
          }
        });
        return newDays;
      });
    }
  };

  // Toggle individual vacation day
  const toggleVacationDay = (day) => {
    const exists = selectedVacations.some(d => isSameDay(d, day));
    if (exists) {
      setSelectedVacations(prev => prev.filter(d => !isSameDay(d, day)));
    } else {
      setSelectedVacations(prev => [...prev, day]);
    }
  };

  // Calculate used vacation days
  const usedVacationDays = selectedVacations.length;

  // Calculate total days off (including weekends and holidays in vacation periods)
  const totalDaysOff = useMemo(() => {
    const allDays = [...selectedVacations];
    holidays.forEach(h => allDays.push(h.date));

    if (allDays.length === 0) return 0;

    // Find continuous periods
    let total = 0;
    const sorted = allDays.sort((a, b) => a - b);

    sorted.forEach(day => {
      // Check if this day is part of a continuous period
      let current = new Date(day);
      let streak = 1;

      // Look forward
      let next = addDays(current, 1);
      while (
        isSaturday(next) ||
        isSunday(next) ||
        holidays.some(h => isSameDay(h.date, next)) ||
        selectedVacations.some(v => isSameDay(v, next))
      ) {
        if (!sorted.some(d => isSameDay(d, next))) {
          streak++;
        }
        next = addDays(next, 1);
      }

      total = Math.max(total, streak);
    });

    return total + allDays.length;
  }, [selectedVacations, holidays]);

  // Get day color
  const getDayColor = (day) => {
    const isHoliday = holidays.some(h => isSameDay(h.date, day));
    const isVacation = selectedVacations.some(v => isSameDay(v, day));
    const isWeekend = isSaturday(day) || isSunday(day);

    // Check if part of continuous period
    const isContinuous = () => {
      if (!isVacation && !isHoliday) return false;

      const prevDay = addDays(day, -1);
      const nextDay = addDays(day, 1);

      const prevIsFree = isSaturday(prevDay) || isSunday(prevDay) ||
        holidays.some(h => isSameDay(h.date, prevDay)) ||
        selectedVacations.some(v => isSameDay(v, prevDay));

      const nextIsFree = isSaturday(nextDay) || isSunday(nextDay) ||
        holidays.some(h => isSameDay(h.date, nextDay)) ||
        selectedVacations.some(v => isSameDay(v, nextDay));

      return prevIsFree || nextIsFree;
    };

    if (isContinuous()) return 'bg-blue-400 text-white';
    if (isHoliday) return 'bg-red-500 text-white';
    if (isVacation) return 'bg-yellow-400 text-black';
    if (isWeekend) return 'bg-green-400 text-white';
    return 'bg-white hover:bg-gray-100';
  };

  // Clear plan
  const clearPlan = () => {
    setSelectedVacations([]);
    setSelectedCombinations([]);
  };

  // Export to PDF
  const exportToPDF = async () => {
    const element = document.getElementById('calendar-container');
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`urlopy-${selectedYear}.pdf`);
  };

  // Optimal suggestion algorithm
  const suggestOptimal = () => {
    // Sort combinations by efficiency (total days / vacation days needed)
    const sorted = [...vacationCombinations].sort((a, b) => {
      const effA = a.totalDays / a.vacationDays.length;
      const effB = b.totalDays / b.vacationDays.length;
      return effB - effA;
    });

    let remainingDays = vacationDays;
    const selected = [];
    const vacDays = [];

    for (const combo of sorted) {
      if (combo.vacationDays.length <= remainingDays) {
        // Check for overlaps
        const hasOverlap = combo.vacationDays.some(vd =>
          vacDays.some(existing => isSameDay(existing, vd))
        );

        if (!hasOverlap) {
          selected.push(combo.id);
          vacDays.push(...combo.vacationDays);
          remainingDays -= combo.vacationDays.length;
        }
      }
    }

    setSelectedCombinations(selected);
    setSelectedVacations(vacDays);
  };

  // Render calendar for a month
  const renderMonth = (monthIndex) => {
    const firstDay = startOfMonth(new Date(selectedYear, monthIndex));
    const lastDay = endOfMonth(new Date(selectedYear, monthIndex));
    const days = eachDayOfInterval({ start: firstDay, end: lastDay });

    // Pad beginning
    const startDay = getDay(firstDay);
    const paddingDays = startDay === 0 ? 6 : startDay - 1;

    const monthName = format(firstDay, 'LLLL yyyy', { locale: pl });

    return (
      <div key={monthIndex} className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-bold mb-3 text-center capitalize">{monthName}</h3>
        <div className="grid grid-cols-7 gap-1">
          {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map(day => (
            <div key={day} className="text-center font-semibold text-sm p-1">{day}</div>
          ))}
          {[...Array(paddingDays)].map((_, i) => (
            <div key={`pad-${i}`} className="p-2"></div>
          ))}
          {days.map(day => {
            const isHoliday = holidays.some(h => isSameDay(h.date, day));
            const holiday = holidays.find(h => isSameDay(h.date, day));
            const isWeekend = isSaturday(day) || isSunday(day);
            const canClick = !isWeekend && !isHoliday;

            return (
              <div
                key={day.getTime()}
                onClick={() => canClick && toggleVacationDay(day)}
                className={`p-2 text-center rounded cursor-pointer text-sm ${getDayColor(day)} ${!canClick ? 'cursor-not-allowed' : ''}`}
                title={isHoliday ? holiday.name : ''}
              >
                {format(day, 'd')}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          Kalkulator Urlopów - Polska
        </h1>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wybierz rok
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {[2025, 2026, 2027, 2028, 2029].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Liczba dni urlopu: {vacationDays}
              </label>
              <input
                type="range"
                min="0"
                max="40"
                value={vacationDays}
                onChange={(e) => setVacationDays(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Saturday holidays info */}
          {saturdayHolidays.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Święta w soboty:</h3>
              <ul className="list-disc list-inside text-sm text-blue-700">
                {saturdayHolidays.map(h => (
                  <li key={h.date.getTime()}>
                    {h.name} ({format(h.date, 'd MMMM', { locale: pl })}) -
                    dodatkowy dzień wolny w {format(h.date, 'LLLL', { locale: pl })}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Combinations */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Gotowe kombinacje</h2>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {loading ? (
                  <p className="text-gray-500">Ładowanie świąt...</p>
                ) : vacationCombinations.length === 0 ? (
                  <p className="text-gray-500">Brak dostępnych kombinacji</p>
                ) : (
                  vacationCombinations.map(combo => (
                    <label
                      key={combo.id}
                      className="flex items-start p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCombinations.includes(combo.id)}
                        onChange={() => toggleCombination(combo.id)}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{combo.name}</div>
                        <div className="text-xs text-gray-600 mt-1">{combo.description}</div>
                        {usesSaturdayHoliday(combo) && (
                          <div className="text-xs text-blue-600 mt-1">
                            Wykorzystuje dzień za święto w sobotę
                          </div>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>

              <button
                onClick={suggestOptimal}
                className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Sugestia optymalna
              </button>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Podsumowanie</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Wykorzystane dni urlopu:</span>
                  <span className="font-bold">{usedVacationDays}/{vacationDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Łącznie dni wolnego:</span>
                  <span className="font-bold text-green-600">{totalDaysOff} dni</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pozostało do wykorzystania:</span>
                  <span className="font-bold">{vacationDays - usedVacationDays} dni</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t space-y-2">
                <button
                  onClick={clearPlan}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Wyczyść plan
                </button>
                <button
                  onClick={exportToPDF}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Export PDF
                </button>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="lg:col-span-2" id="calendar-container">
            <div className="bg-gray-50 rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Kalendarz {selectedYear}</h2>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mb-6 text-sm">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                  <span>Święta</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-400 rounded mr-2"></div>
                  <span>Urlop</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-400 rounded mr-2"></div>
                  <span>Weekend</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-400 rounded mr-2"></div>
                  <span>Ciągły okres wolnego</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(12)].map((_, i) => renderMonth(i))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
