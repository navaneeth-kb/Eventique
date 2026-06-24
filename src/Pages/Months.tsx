import { useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  add,
  sub,
  isSameMonth,
  isToday,
  eachDayOfInterval,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const db = getFirestore();
const auth = getAuth();

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMonths, setShowMonths] = useState(false);
  const [showYearView, setShowYearView] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [userEmail, setUserEmail] = useState<string | null>(null);
  type EventType = Record<string, { name: string; details: string }>;
  const [events, setEvents] = useState<EventType>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setUserEmail(user.email);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!userEmail) return;
      try {
        const eventsQuery = query(collection(db, "event"), where("Participants", "array-contains", userEmail));
        const querySnapshot = await getDocs(eventsQuery);

        const eventsData = {} as Record<string, { name: string; details: string }>;
        querySnapshot.docs.forEach(doc => {
          const event = doc.data();
          eventsData[event.event_date] = {
            name: event.name,
            details: event.details || ""
          };
        });

        setEvents(eventsData);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };
    fetchEvents();
  }, [userEmail]);

  const startMonth = startOfMonth(currentDate);
  const endMonth = endOfMonth(currentDate);
  const startWeek = startOfWeek(startMonth);
  const endWeek = endOfWeek(endMonth);

  const days = [];
  let day = startWeek;

  while (day <= endWeek) {
    days.push(day);
    day = add(day, { days: 1 });
  }

  const handleMonthChange = (increment: boolean) => {
    const newDate = increment ? add(currentDate, { months: 1 }) : sub(currentDate, { months: 1 });
    setCurrentDate(newDate);
    setSelectedDate(''); // Reset selected date when month changes
  };

  return (
    <div className="min-h-screen bg-[#e9f7f1] flex flex-col items-center p-4 pt-6">
      {/* Page Title */}
      <h2 className="text-2xl font-bold text-[#246d8c] mb-5 tracking-wide">
        My Calendar
      </h2>

      <div className="w-full max-w-md">
        {/* Calendar Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {showYearView || showMonths ? (
            <div>
              {/* Year header */}
              <div className="bg-[#246d8c] px-6 py-4 flex justify-between items-center">
                <button 
                  onClick={() => setCurrentDate(sub(currentDate, { years: 1 }))}
                  aria-label="Previous year"
                  title="Previous year"
                  className="text-white/70 hover:text-white transition-colors p-1"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 
                  className="text-xl font-bold text-white cursor-pointer hover:text-blue-100 transition-colors" 
                  onClick={() => { setShowYearView(false); setShowMonths(false); }}
                >
                  {format(currentDate, "yyyy")}
                </h2>
                <button 
                  onClick={() => setCurrentDate(add(currentDate, { years: 1 }))}
                  aria-label="Next year"
                  title="Next year"
                  className="text-white/70 hover:text-white transition-colors p-1"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Months grid */}
              <div className="p-4 grid grid-cols-3 gap-3">
                {months.map((month, index) => {
                  const monthStart = new Date(currentDate.getFullYear(), index, 1);
                  const monthEnd = endOfMonth(monthStart);
                  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
                  const isCurrentMonth = index === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

                  return (
                    <div 
                      key={month} 
                      className={`p-3 text-center rounded-xl cursor-pointer transition-all duration-200
                        ${isCurrentMonth 
                          ? 'bg-[#246d8c] text-white shadow-md' 
                          : 'bg-[#f6fcf7] hover:bg-[#e9f7f1] text-gray-700'
                        }`}
                      onClick={() => {
                        setCurrentDate(monthStart);
                        setShowYearView(false);
                        setShowMonths(false);
                      }}
                      role="button"
                      aria-label={`Select ${month}`}
                      tabIndex={0}
                    >
                      <div className="font-semibold text-sm">{month.substring(0, 3)}</div>
                      <div className="grid grid-cols-7 text-xs gap-0.5 mt-1.5">
                        {monthDays.slice(0, 14).map((day) => (
                          <span 
                            key={day.toString()} 
                            className={isCurrentMonth ? 'text-white/60' : 'text-gray-400'}
                          >
                            {format(day, "d")}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Month header */}
              <div className="bg-[#246d8c] px-6 py-4 flex justify-between items-center">
                <button 
                  onClick={() => handleMonthChange(false)}
                  aria-label="Previous month"
                  title="Previous month"
                  className="text-white/70 hover:text-white transition-colors p-1"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 
                  className="text-lg font-semibold text-white cursor-pointer hover:text-blue-100 transition-colors"
                  onClick={() => { setShowMonths(true); setShowYearView(true); }}
                  role="button"
                  aria-label="Select month and year"
                  tabIndex={0}
                >
                  {format(currentDate, "MMMM yyyy")}
                </h2>
                <button 
                  onClick={() => handleMonthChange(true)}
                  aria-label="Next month"
                  title="Next month"
                  className="text-white/70 hover:text-white transition-colors p-1"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 text-center px-4 pt-4 pb-2">
                {weekdays.map((day, index) => (
                  <div key={index} className="text-xs font-semibold text-[#246d8c]/60 uppercase tracking-wider p-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1 px-4 pb-4">
                {days.map((day, index) => {
                  const formattedDate = format(day, "yyyy-MM-dd");
                  const hasEvent = !!events[formattedDate];
                  const isSelected = selectedDate === formattedDate;
                  const isTodayDate = isToday(day);
                  const inMonth = isSameMonth(day, currentDate);

                  return (
                    <div 
                      key={index} 
                      className={`relative p-2 text-center text-sm cursor-pointer transition-all duration-200 rounded-xl
                        ${!inMonth ? 'text-gray-300' : 'text-gray-700'}
                        ${isSelected ? 'bg-[#246d8c] text-white shadow-md scale-105' : ''}
                        ${isTodayDate && !isSelected ? 'bg-[#e9f7f1] text-[#246d8c] font-bold ring-1 ring-[#246d8c]/30' : ''}
                        ${inMonth && !isSelected && !isTodayDate ? 'hover:bg-[#f6fcf7]' : ''}
                      `}
                      onClick={() => {
                        setSelectedDate(formattedDate);
                      }}
                      role="button"
                      aria-label={`Select date ${format(day, "MMMM d, yyyy")}`}
                      tabIndex={0}
                    >
                      {format(day, "d")}
                      {hasEvent && (
                        <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-0.5 ${
                          isSelected ? 'bg-white' : 'bg-[#FFB94B]'
                        }`}></div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Events section */}
              <div className="border-t border-gray-100">
                <div className="px-6 py-4">
                  <h3 className="text-sm font-semibold text-[#246d8c]/60 uppercase tracking-wider mb-3">
                    {selectedDate 
                      ? format(new Date(selectedDate + 'T00:00:00'), "EEEE, MMMM d") 
                      : "Select a date"
                    }
                  </h3>
                  {selectedDate && events[selectedDate] ? (
                    <div className="flex items-start gap-3 bg-[#f6fcf7] p-4 rounded-xl border border-[#246d8c]/10">
                      <div className="w-1 h-full min-h-[2.5rem] bg-[#246d8c] rounded-full flex-shrink-0"></div>
                      <div>
                        <p className="font-semibold text-gray-800">{events[selectedDate].name}</p>
                        {events[selectedDate].details && (
                          <p className="text-sm text-gray-500 mt-1">{events[selectedDate].details}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-400 text-sm">No events on this day</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom accent bar */}
              <div className="h-1.5 bg-gradient-to-r from-[#246d8c] via-[#2B8D9C] to-[#246d8c]"></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calendar;