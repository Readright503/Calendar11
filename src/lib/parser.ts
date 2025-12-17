interface ParsedAppointment {
  name: string;
  phone: string;
  details: string;
  datetime: string;
}

export async function parseAppointment(text: string): Promise<ParsedAppointment | null> {
  if (!text.trim()) return null;

  try {
    const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;

    if (!apiKey) {
      console.log('⚠️ DeepSeek API key not found, using fallback parser');
      return fallbackParser(text);
    }

    console.log('🚀 Sending to DeepSeek API:', text);

    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

    const systemPrompt = `You are an appointment parser. Extract appointment information from user text and return valid JSON.

CURRENT DATE/TIME CONTEXT:
- Today is: ${dayOfWeek}, ${currentMonth}/${currentDay}/${currentYear}
- Current time: ${currentTime}
- ISO format: ${currentDate}

EXTRACTION RULES:
1. NAME: Extract the person's full name
2. PHONE: Extract phone number and format as XXX-XXX-XXXX (10 digits)
3. DATETIME: Parse the date/time carefully:
   - For specific dates like "December 29th" or "12/29", use that exact date in ${currentYear}
   - For "tomorrow", add 1 day to today's date
   - For "next Friday", find the next occurrence of Friday
   - For weekday names like "Tuesday", find the next occurrence
   - If NO time is specified, use 12:00 PM (noon) - which is 12:00:00 in 24-hour format
   - Convert to ISO 8601 format in UTC timezone
   - FORMAT: YYYY-MM-DDTHH:MM:SS.000Z
4. DETAILS: Any remaining context about the appointment

EXAMPLES:
Input: "meeting with Sam on December 29th number 818-999-0000"
Output: {"name": "Sam", "phone": "818-999-0000", "datetime": "2025-12-29T20:00:00.000Z", "details": "meeting"}

Input: "John 5551234567 tomorrow at 3pm"
If today is 2025-12-17, tomorrow is 2025-12-18, 3pm is 15:00
Output: {"name": "John", "phone": "555-123-4567", "datetime": "2025-12-18T23:00:00.000Z", "details": "appointment"}

Return ONLY valid JSON (no markdown, no code blocks, no extra text):
{"name": "string", "phone": "XXX-XXX-XXXX", "datetime": "YYYY-MM-DDTHH:MM:SS.000Z", "details": "string"}`;

    const requestBody = {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3
    };

    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ DeepSeek API error:', response.status, errorText);
      return fallbackParser(text);
    }

    const data = await response.json();
    console.log('📦 Full API response:', JSON.stringify(data, null, 2));

    let content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('❌ No content in DeepSeek response');
      return fallbackParser(text);
    }

    console.log('📝 Raw content from DeepSeek:', content);

    content = content.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (content.startsWith('```')) {
      content = content.replace(/```\n?/g, '').trim();
    }

    console.log('🧹 Cleaned content:', content);

    const parsed = JSON.parse(content);
    console.log('✅ Parsed JSON:', parsed);

    let formattedPhone = parsed.phone || 'No phone';
    if (formattedPhone !== 'No phone') {
      const digits = formattedPhone.replace(/\D/g, '');
      if (digits.length === 10) {
        formattedPhone = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
      }
    }

    const parsedDateTime = parsed.datetime || new Date().toISOString();
    const appointmentDate = new Date(parsedDateTime);

    console.log('📅 Date validation:');
    console.log('   - Input text:', text);
    console.log('   - Parsed datetime string:', parsedDateTime);
    console.log('   - As Date object:', appointmentDate);
    console.log('   - Formatted:', appointmentDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }));

    const result = {
      name: parsed.name || 'Unknown',
      phone: formattedPhone,
      details: parsed.details || 'No details provided',
      datetime: parsedDateTime
    };

    console.log('✨ Final appointment:', result);

    return result;
  } catch (error) {
    console.error('❌ Error calling DeepSeek API:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    console.log('⚠️ Falling back to regex parser');
    return fallbackParser(text);
  }
}

function fallbackParser(text: string): ParsedAppointment | null {
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
