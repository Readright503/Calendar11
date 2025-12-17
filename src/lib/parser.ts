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
    const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

    const systemPrompt = `You are an appointment parser. Extract appointment information from user text.

Current context:
- Today is ${dayOfWeek}, ${currentDate}
- Current time is ${currentTime}

Rules:
1. Extract name, phone number (format as XXX-XXX-XXXX), date/time, and details
2. For relative dates like "tomorrow", "next Friday", calculate the actual date
3. If no time specified, use 12:00 PM (noon)
4. Phone numbers must be 10 digits, formatted as XXX-XXX-XXXX
5. Return date/time in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.000Z)

Return ONLY a JSON object with this exact structure (no markdown, no code blocks):
{
  "name": "Full Name",
  "phone": "XXX-XXX-XXXX",
  "datetime": "2025-12-29T20:00:00.000Z",
  "details": "description of appointment"
}`;

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

    const result = {
      name: parsed.name || 'Unknown',
      phone: formattedPhone,
      details: parsed.details || 'No details provided',
      datetime: parsed.datetime || new Date().toISOString()
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
