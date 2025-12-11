interface ParsedAppointment {
  name: string;
  phone: string;
  details: string;
  datetime: string;
}

export function parseAppointment(text: string): ParsedAppointment | null {
  if (!text.trim()) return null;

  let remainingText = text.trim();

  const name = extractName(remainingText);
  if (name) {
    remainingText = remainingText.replace(name, '').trim();
  }

  const phone = extractPhone(remainingText);
  if (phone) {
    remainingText = remainingText.replace(phone.raw, '').trim();
  }

  const dateTimeInfo = extractDateTime(remainingText);
  if (dateTimeInfo) {
    remainingText = remainingText.replace(dateTimeInfo.raw, '').trim();
  }

  const details = remainingText.trim() || 'No details provided';

  return {
    name: name || 'Unknown',
    phone: phone ? phone.formatted : 'No phone',
    details,
    datetime: dateTimeInfo ? dateTimeInfo.datetime : new Date().toISOString()
  };
}

function extractName(text: string): string | null {
  const nameMatch = text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  return nameMatch ? nameMatch[1] : null;
}

function extractPhone(text: string): { raw: string; formatted: string } | null {
  const phonePatterns = [
    /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/,
    /\d{10}/
  ];

  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      const digits = match[0].replace(/\D/g, '');
      if (digits.length === 10) {
        const formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
        return { raw: match[0], formatted };
      }
    }
  }

  return null;
}

function extractDateTime(text: string): { raw: string; datetime: string } | null {
  const lowerText = text.toLowerCase();
  const now = new Date();

  let targetDate = new Date();
  let targetTime: { hours: number; minutes: number } | null = null;
  let matchedText = '';

  if (lowerText.includes('tomorrow')) {
    targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 1);
    matchedText = 'tomorrow';
  }

  const weekdayMatch = lowerText.match(/\b(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (weekdayMatch) {
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetWeekday = weekdays.indexOf(weekdayMatch[2]);
    const isNext = weekdayMatch[1] !== undefined;

    targetDate = new Date(now);
    const currentWeekday = targetDate.getDay();
    let daysToAdd = targetWeekday - currentWeekday;

    if (daysToAdd <= 0 || isNext) {
      daysToAdd += 7;
    }

    targetDate.setDate(targetDate.getDate() + daysToAdd);
    matchedText = weekdayMatch[0];
  }

  const specificDateMatch = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (specificDateMatch) {
    const month = parseInt(specificDateMatch[1]) - 1;
    const day = parseInt(specificDateMatch[2]);
    const year = specificDateMatch[3] ?
      (specificDateMatch[3].length === 2 ? 2000 + parseInt(specificDateMatch[3]) : parseInt(specificDateMatch[3])) :
      now.getFullYear();

    targetDate = new Date(year, month, day);
    matchedText = specificDateMatch[0];
  }

  const time12HourMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (time12HourMatch) {
    let hours = parseInt(time12HourMatch[1]);
    const minutes = time12HourMatch[2] ? parseInt(time12HourMatch[2]) : 0;
    const meridiem = time12HourMatch[3].toLowerCase();

    if (meridiem === 'pm' && hours !== 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;

    targetTime = { hours, minutes };
    matchedText += ' ' + time12HourMatch[0];
  }

  const time24HourMatch = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (time24HourMatch && !time12HourMatch) {
    const hours = parseInt(time24HourMatch[1]);
    const minutes = parseInt(time24HourMatch[2]);

    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      targetTime = { hours, minutes };
      matchedText += ' ' + time24HourMatch[0];
    }
  }

  if (targetTime) {
    targetDate.setHours(targetTime.hours, targetTime.minutes, 0, 0);
  } else {
    targetDate.setHours(9, 0, 0, 0);
  }

  return {
    raw: matchedText.trim(),
    datetime: targetDate.toISOString()
  };
}
