/**
 * Shared date/time utilities for the Skillo platform.
 * All display formatting uses Asia/Karachi (PKT, UTC+5) timezone.
 * Storage format: YYYY-MM-DD for dates, HH:MM for times, ISO 8601 for datetimes.
 */

const PKT_OFFSET = "+05:00";
const TIMEZONE = "Asia/Karachi";
const LOCALE = "en-PK";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

// --- Storage Formatters ---

/**
 * Format a Date object as YYYY-MM-DD string.
 * @param {Date} date
 * @returns {string}
 */
function formatDateISO(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get the day name (e.g. "Monday") from a YYYY-MM-DD date string.
 * @param {string} dateString - YYYY-MM-DD
 * @returns {string}
 */
function getDayFromDate(dateString) {
  const date = new Date(dateString + "T00:00:00" + PKT_OFFSET);
  return DAY_NAMES[date.getDay()];
}

/**
 * Build a full ISO datetime string from separate date + time, enforcing PKT offset.
 * @param {string} dateString - YYYY-MM-DD
 * @param {string} timeString - HH:MM
 * @returns {string} ISO 8601 UTC datetime
 */
function buildDateTime(dateString, timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);
  const iso = `${dateString}T${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00.000${PKT_OFFSET}`;
  return new Date(iso).toISOString();
}

// --- Display Formatters ---

/**
 * Format a date value for human-readable display in PKT.
 * @param {Date|string|number} dateValue
 * @returns {string}
 */
function formatDateDisplay(dateValue) {
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString(LOCALE, {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  } catch {
    return "Invalid Date";
  }
}

/**
 * Format a time value for human-readable display in PKT.
 * @param {Date|string|number} timeValue
 * @returns {string}
 */
function formatTimeDisplay(timeValue) {
  try {
    const time = new Date(timeValue);
    if (isNaN(time.getTime())) return "Invalid Time";
    return time.toLocaleTimeString(LOCALE, {
      timeZone: TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "Invalid Time";
  }
}

// --- Natural Language Parsers ---

/**
 * Parse a natural-language date string into YYYY-MM-DD.
 * @param {string} dateString
 * @param {Date} [referenceDate]
 * @returns {string|null}
 */
function parseDate(dateString, referenceDate = new Date()) {
  const text = dateString.toLowerCase().trim();
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  if (text === "today" || text === "now") {
    return formatDateISO(today);
  }

  if (text === "tomorrow") {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateISO(tomorrow);
  }

  const nextDayMatch = text.match(
    /next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
  );
  if (nextDayMatch) {
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const targetDay = dayNames.indexOf(nextDayMatch[1].toLowerCase());
    const currentDay = today.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    const nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + daysUntil);
    return formatDateISO(nextDate);
  }

  const datePatterns = [
    /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i,
    /(\d{1,2})[\/\-](\d{1,2})[\/\-]?(\d{2,4})?/,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      let day, month, year;

      if (MONTH_NAMES.includes(match[2]?.toLowerCase())) {
        day = parseInt(match[1]);
        month = MONTH_NAMES.indexOf(match[2].toLowerCase());
        year = today.getFullYear();
      } else if (MONTH_NAMES.includes(match[1]?.toLowerCase())) {
        day = parseInt(match[2]);
        month = MONTH_NAMES.indexOf(match[1].toLowerCase());
        year = today.getFullYear();
      } else {
        day = parseInt(match[1]);
        month = parseInt(match[2]) - 1;
        year = match[3]
          ? match[3].length === 2
            ? 2000 + parseInt(match[3])
            : parseInt(match[3])
          : today.getFullYear();
      }

      if (!isNaN(day) && !isNaN(month)) {
        const parsedDate = new Date(year, month, day);
        if (parsedDate < today) {
          parsedDate.setFullYear(parsedDate.getFullYear() + 1);
        }
        return formatDateISO(parsedDate);
      }
    }
  }

  return null;
}

/**
 * Parse a natural-language time string into HH:MM (24h).
 * @param {string} timeString
 * @returns {string|null}
 */
function parseTime(timeString) {
  const text = timeString.toLowerCase().trim();

  const timePatterns = [
    /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
    /(\d{1,2})\s*(am|pm)/i,
    /(\d{1,2})(?::(\d{2}))?\s*(?:o'clock)?/i,
  ];

  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      let hours = parseInt(match[1]);
      let minutes = parseInt(match[2]) || 0;
      const meridiem = match[3]?.toLowerCase();

      if (meridiem === "pm" && hours !== 12) {
        hours += 12;
      } else if (meridiem === "am" && hours === 12) {
        hours = 0;
      }

      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      }
    }
  }

  return null;
}

/**
 * Parse a duration string and calculate end time from start time.
 * @param {string} durationString
 * @param {string} startTime - HH:MM
 * @returns {string|null} HH:MM end time or null
 */
function parseDuration(durationString, startTime) {
  const text = durationString.toLowerCase();
  const hoursMatch = text.match(/(\d+)\s*(?:hour|hr|h)/i);
  const minutesMatch = text.match(/(\d+)\s*(?:minute|min|m)/i);

  let totalMinutes = 0;
  if (hoursMatch) totalMinutes += parseInt(hoursMatch[1]) * 60;
  if (minutesMatch) totalMinutes += parseInt(minutesMatch[1]);

  if (totalMinutes > 0 && startTime) {
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const endMinutes = startHours * 60 + startMinutes + totalMinutes;
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
  }

  return null;
}

/**
 * Calculate end time from start time and duration in minutes.
 * @param {string} startTime - HH:MM
 * @param {number} durationMins
 * @returns {string} HH:MM
 */
function calculateEndTime(startTime, durationMins) {
  const [h, m] = startTime.split(":").map(Number);
  const totalMins = h * 60 + m + durationMins;
  const endH = Math.floor(totalMins / 60) % 24;
  const endM = totalMins % 60;
  return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
}

module.exports = {
  PKT_OFFSET,
  TIMEZONE,
  LOCALE,
  formatDateISO,
  getDayFromDate,
  buildDateTime,
  formatDateDisplay,
  formatTimeDisplay,
  parseDate,
  parseTime,
  parseDuration,
  calculateEndTime,
};
