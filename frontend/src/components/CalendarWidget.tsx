import React, { useEffect, useMemo, useState } from 'react';
import { CalendarEvent, CalendarEventType } from '../types';
import { fetchCalendarEvents, fetchNextAppointment, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../api/client';

interface Props {
  onError: (msg: string) => void;
  onToast: (msg: string) => void;
  onEventsMutate?: () => void;
}

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

const EVENT_TYPES: Array<{ value: CalendarEventType; label: string; colorClass: string }> = [
  { value: 'WORK', label: 'Lavoro', colorClass: 'event-tone-work' },
  { value: 'PERSONAL', label: 'Personale', colorClass: 'event-tone-personal' },
  { value: 'HEALTH', label: 'Salute', colorClass: 'event-tone-health' },
  { value: 'FINANCE', label: 'Finanza', colorClass: 'event-tone-finance' },
  { value: 'STUDY', label: 'Studio', colorClass: 'event-tone-study' },
  { value: 'FUN', label: 'Relax', colorClass: 'event-tone-fun' },
];

const REMINDER_OPTIONS = [
  { value: '', label: 'Nessun promemoria' },
  { value: '15', label: '15 min prima' },
  { value: '30', label: '30 min prima' },
  { value: '60', label: '1 ora prima' },
  { value: '1440', label: '1 giorno prima' },
];

function typeMeta(type: CalendarEventType) {
  return EVENT_TYPES.find((item) => item.value === type) ?? EVENT_TYPES[1];
}

function formatReminder(reminderMinutes: number | null): string {
  if (!reminderMinutes) return 'No reminder';
  if (reminderMinutes % 1440 === 0) return `${reminderMinutes / 1440}g prima`;
  if (reminderMinutes >= 60 && reminderMinutes % 60 === 0) return `${reminderMinutes / 60}h prima`;
  return `${reminderMinutes}m prima`;
}

function normalizeTimeInput(time: string | null): string {
  if (!time) return '';
  return time.slice(0, 5);
}

export default function CalendarWidget({ onError, onToast, onEventsMutate }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<CalendarEventType>('PERSONAL');
  const [reminderMinutes, setReminderMinutes] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const [nextAppt, setNextAppt] = useState<CalendarEvent | null>(null);

  const loadEvents = async () => {
    try {
      setEvents(await fetchCalendarEvents(year, month));
      setNextAppt(await fetchNextAppointment());
    } catch (e) {
      onError((e as Error).message);
    }
  };

  useEffect(() => { void loadEvents(); }, [year, month]);

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedDate('');
    setSelectedTime('');
    setDescription('');
    setEventType('PERSONAL');
    setReminderMinutes('');
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const today = now.getFullYear() === year && now.getMonth() + 1 === month ? now.getDate() : -1;
  const eventDates = new Set(events.map((e) => e.date));

  const selectedDateEvents = useMemo(
    () => events
      .filter((event) => event.date === selectedDate)
      .sort((a, b) => `${a.time ?? '99:99'}-${a.title}`.localeCompare(`${b.time ?? '99:99'}-${b.title}`)),
    [events, selectedDate],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const list = map.get(event.date) ?? [];
      list.push(event);
      list.sort((a, b) => `${a.time ?? '99:99'}-${a.title}`.localeCompare(`${b.time ?? '99:99'}-${b.title}`));
      map.set(event.date, list);
    });
    return map;
  }, [events]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !description.trim()) return;
    try {
      if (editingId !== null) {
        await updateCalendarEvent(editingId, selectedDate, selectedTime, description.trim(), eventType, reminderMinutes ? parseInt(reminderMinutes, 10) : null);
        onToast('Appuntamento aggiornato ⚡');
      } else {
        await createCalendarEvent(selectedDate, selectedTime, description.trim(), eventType, reminderMinutes ? parseInt(reminderMinutes, 10) : null);
        onToast('Appuntamento aggiunto ✅');
      }
      resetForm();
      await loadEvents();
      onEventsMutate?.();
    } catch (err) {
      onError((err as Error).message);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    try {
      await deleteCalendarEvent(eventId);
      if (editingId === eventId) resetForm();
      onToast('Appuntamento eliminato');
      await loadEvents();
      onEventsMutate?.();
    } catch (err) {
      onError((err as Error).message);
    }
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingId(event.id);
    setSelectedDate(event.date);
    setSelectedTime(normalizeTimeInput(event.time));
    setDescription(event.title);
    setEventType(event.eventType);
    setReminderMinutes(event.reminderMinutes ? String(event.reminderMinutes) : '');
  };

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const formatDate = (day: number) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const formatItalianDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  return (
    <div className="calendar-widget">
      {nextAppt && (
        <div className="next-appointment-banner">
          <div className="next-appt-header">
            <span className="next-badge">🔔 PROSSIMO APPUNTAMENTO IN ARRIVO</span>
            <span className="next-date-pill">📅 {formatItalianDate(nextAppt.date)} {nextAppt.time ? `· ⏰ ${nextAppt.time.slice(0, 5)}` : ''}</span>
          </div>
          <div className="next-appt-body">
            <h3 className="next-title">{nextAppt.title}</h3>
            <div className="next-meta-row">
              <span className={`event-badge ${typeMeta(nextAppt.eventType).colorClass}`}>
                {typeMeta(nextAppt.eventType).label}
              </span>
              {nextAppt.reminderMinutes && (
                <span className="next-reminder-tag">
                  ⏰ Promemoria: {formatReminder(nextAppt.reminderMinutes)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="calendar-header">
        <button className="btn btn-small" onClick={prevMonth} title="Mese precedente">◀</button>
        <span className="calendar-title">{MONTH_NAMES[month - 1]} {year}</span>
        <button className="btn btn-small" onClick={nextMonth} title="Mese successivo">▶</button>
      </div>

      <div className="calendar-grid">
        {DAY_NAMES.map((d) => <div key={d} className="cal-day-header">{d}</div>)}
        {cells.map((day, idx) => {
          const dayDateStr = day !== null ? formatDate(day) : null;
          const dayEvents = dayDateStr ? eventsByDate.get(dayDateStr) : null;
          const mainEventType = dayEvents && dayEvents.length > 0 ? dayEvents[0].eventType : null;

          return (
            <div
              key={idx}
              className={[
                'cal-cell',
                day === null ? 'cal-empty' : '',
                day === today ? 'cal-today' : '',
                day !== null && eventDates.has(formatDate(day)) ? 'cal-has-event' : '',
                day !== null && selectedDate === formatDate(day) ? 'cal-selected' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => {
                if (day === null) return;
                setSelectedDate(formatDate(day));
              }}
            >
              <span className="cal-day-number">{day}</span>
              {day !== null && mainEventType && (
                <span className={`cal-event-marker marker-${mainEventType.toLowerCase()}`} title={`${dayEvents?.length} appuntamento/i`} />
              )}
            </div>
          );
        })}
      </div>

      <form className="cal-form cal-form-advanced" onSubmit={handleSubmit}>
        <div className="cal-form-row">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} required />
          <input type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} />
        </div>

        <div className="cal-form-row">
          <select value={eventType} onChange={(e) => setEventType(e.target.value as CalendarEventType)}>
            {EVENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select value={reminderMinutes} onChange={(e) => setReminderMinutes(e.target.value)}>
            {REMINDER_OPTIONS.map((item) => <option key={item.value || 'none'} value={item.value}>{item.label}</option>)}
          </select>
        </div>

        <div className="cal-form-row full-width">
          <input
            type="text"
            placeholder="Descrizione appuntamento (es. Visita Medica)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="calendar-form-actions">
          <button className="btn btn-primary btn-add-appt" type="submit">
            {editingId !== null ? '✎ Salva Modifica Appuntamento' : '+ Aggiungi Appuntamento'}
          </button>
          {editingId !== null && (
            <button className="btn btn-small btn-danger" type="button" onClick={resetForm}>
              Annulla
            </button>
          )}
        </div>
      </form>

      {selectedDate && (
        <div className="calendar-selected-info">
          <span>📅 Data selezionata: <strong>{formatItalianDate(selectedDate)}</strong></span>
          <span>{selectedDateEvents.length > 0 ? `${selectedDateEvents.length} appuntamento/i` : 'Nessun appuntamento in questo giorno'}</span>
        </div>
      )}

      {selectedDateEvents.length > 0 && (
        <ul className="event-list">
          {selectedDateEvents.map((ev) => (
            <li key={ev.id} className={`event-item ${editingId === ev.id ? 'event-item-editing' : ''} ${typeMeta(ev.eventType).colorClass}`}>
              <span className="event-date">📅 {formatItalianDate(ev.date)} {ev.time ? `· ⏰ ${ev.time.slice(0, 5)}` : ''}</span>
              <div className="event-desc-block">
                <span className="event-desc">{ev.title}</span>
                <span className="event-meta">{typeMeta(ev.eventType).label} {ev.reminderMinutes ? `· Promemoria: ${formatReminder(ev.reminderMinutes)}` : ''}</span>
              </div>
              <div className="event-actions">
                <button className="btn btn-small btn-primary" type="button" onClick={() => handleEditEvent(ev)} title="Modifica">✎</button>
                <button className="btn btn-small btn-danger" type="button" onClick={() => handleDeleteEvent(ev.id)} title="Elimina">✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
