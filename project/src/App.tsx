import { useState } from 'react';
import { Calendar, List, Trash2, Phone, Clock, User, FileText, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseAppointment } from './lib/parser';
import './App.css';

interface Appointment {
  id: string;
  name: string;
  phone: string;
  details: string;
  datetime: string;
}

function App() {
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      phone: '720-555-1234',
      details: 'wants kitchen remodel estimate',
      datetime: '2025-12-12T14:00:00'
    },
    {
      id: '2',
      name: 'Mike Chen',
      phone: '303-555-5678',
      details: 'bathroom inspection follow-up',
      datetime: '2025-12-15T10:30:00'
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 11, 1));
  const [selectedEvent, setSelectedEvent] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleParse = () => {
    if (!inputText.trim()) return;

    const parsed = parseAppointment(inputText);
    if (parsed) {
      const newAppointment: Appointment = {
        id: Date.now().toString(),
        ...parsed
      };
      setAppointments([...appointments, newAppointment]);
      setInputText('');
    }
  };

  const handleDelete = (id: string) => {
    setAppointments(appointments.filter(apt => apt.id !== id));
    setIsModalOpen(false);
  };

  const handleEventClick = (appointment: Appointment) => {
    setSelectedEvent(appointment);
    setIsModalOpen(true);
  };

  const formatDateTime = (datetime: string) => {
    const date = new Date(datetime);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTime = (datetime: string) => {
    const date = new Date(datetime);
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];

    return appointments.filter(apt => {
      const aptDate = new Date(apt.datetime);
      return aptDate.getFullYear() === date.getFullYear() &&
             aptDate.getMonth() === date.getMonth() &&
             aptDate.getDate() === date.getDate();
    });
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthYear = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const days = getDaysInMonth(currentMonth);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Quick Scheduler</h1>
          <p className="text-gray-600">Parse unstructured text into calendar appointments</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Appointment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Example: John Doe 7205551212 wants estimate Tuesday at 3pm"
                className="h-64 resize-none text-base"
              />

              <Button
                onClick={handleParse}
                className="w-full"
                size="lg"
              >
                Parse & Save Appointment
              </Button>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-blue-900 text-sm">Example Formats:</p>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>• John Doe 7205551212 wants estimate Tuesday at 3pm</p>
                  <p>• Sarah Smith (720) 555-1234 roof inspection tomorrow at 10am</p>
                  <p>• Mike Johnson 303-555-5678 follow-up 12/20 at 2:30pm</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="calendar" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="calendar" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Calendar View
                  </TabsTrigger>
                  <TabsTrigger value="list" className="flex items-center gap-2">
                    <List className="w-4 h-4" />
                    List View
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="calendar" className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={previousMonth}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <h3 className="text-lg font-semibold">{monthYear}</h3>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={nextMonth}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center font-semibold text-sm text-gray-600 pb-2">
                        {day}
                      </div>
                    ))}

                    {days.map((day, index) => {
                      const events = getEventsForDate(day);
                      const isToday = day &&
                        day.getDate() === new Date().getDate() &&
                        day.getMonth() === new Date().getMonth() &&
                        day.getFullYear() === new Date().getFullYear();

                      return (
                        <div
                          key={index}
                          className={`min-h-24 border rounded-lg p-1 ${
                            day ? 'bg-white' : 'bg-gray-50'
                          } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                        >
                          {day && (
                            <>
                              <div className={`text-sm font-medium mb-1 ${
                                isToday ? 'text-blue-600' : 'text-gray-700'
                              }`}>
                                {day.getDate()}
                              </div>
                              <div className="space-y-1">
                                {events.map(event => (
                                  <button
                                    key={event.id}
                                    onClick={() => handleEventClick(event)}
                                    className="w-full text-left text-xs bg-blue-100 hover:bg-blue-200 text-blue-900 rounded px-1 py-0.5 transition-colors"
                                  >
                                    <div className="font-medium truncate">{formatTime(event.datetime)}</div>
                                    <div className="truncate">{event.name}</div>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="list">
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead className="hidden md:table-cell">Details</TableHead>
                          <TableHead>Date/Time</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {appointments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-gray-500">
                              No appointments yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          appointments.map(apt => (
                            <TableRow key={apt.id} className="cursor-pointer hover:bg-gray-50">
                              <TableCell className="font-medium">{apt.name}</TableCell>
                              <TableCell>{apt.phone}</TableCell>
                              <TableCell className="hidden md:table-cell">{apt.details}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                {new Date(apt.datetime).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(apt.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-semibold">{selectedEvent.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold">{selectedEvent.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Date & Time</p>
                  <p className="font-semibold">{formatDateTime(selectedEvent.datetime)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Details</p>
                  <p className="font-semibold">{selectedEvent.details}</p>
                </div>
              </div>

              <Button
                variant="destructive"
                className="w-full"
                onClick={() => handleDelete(selectedEvent.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Appointment
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
