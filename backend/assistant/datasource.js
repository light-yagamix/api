const Groq = require("groq-sdk");
const {
  SYSTEM_PROMPT,
  BOOKING_ASSISTANT_PROMPT,
  VISION_INSPECTION_PROMPT,
  generateServicesContext,
} = require("./prompt");
const { ConversationDataSource } = require("../aiChat/datasource");
const { BookingService } = require("../booking/datasource");
const TimeSlotModel = require("../timeslot/model");
const {
  searchServices: searchServicesUtil,
  getServiceById: getServiceByIdUtil,
} = require("../utils/service-search");
const servicesData = require("./services.json");

// Helper function to parse user's service option selection
function parseServiceOptionSelection(userMessage, serviceId) {
  if (!serviceId || !userMessage) return null;

  const service = servicesData.find((s) => s._id === serviceId);
  if (!service || !service.prices || service.prices.length === 0) return null;

  const message = userMessage.toLowerCase();

  // Look for number selection (1, 2, 3, etc.)
  const numberMatch = message.match(/\b(\d+)\b/);
  if (numberMatch) {
    const index = parseInt(numberMatch[1]) - 1;
    if (index >= 0 && index < service.prices.length) {
      const selectedPrice = service.prices[index];
      return {
        _id: selectedPrice._id,
        label: selectedPrice.label,
        price: selectedPrice.price,
      };
    }
  }

  // Look for specific time mentions (1 hour, 2 hours, etc.)
  for (const price of service.prices) {
    const label = price.label.toLowerCase();
    if (
      message.includes(label) ||
      label.includes(message.replace(/[^\w\s]/g, "").trim())
    ) {
      return {
        _id: price._id,
        label: price.label,
        price: price.price,
      };
    }
  }

  // Look for "first", "second", "last" etc.
  if (message.includes("first") || message.includes("1st")) {
    const selectedPrice = service.prices[0];
    return {
      _id: selectedPrice._id,
      label: selectedPrice.label,
      price: selectedPrice.price,
    };
  }
  if (message.includes("second") || message.includes("2nd")) {
    if (service.prices.length > 1) {
      const selectedPrice = service.prices[1];
      return {
        _id: selectedPrice._id,
        label: selectedPrice.label,
        price: selectedPrice.price,
      };
    }
  }
  if (message.includes("last")) {
    const selectedPrice = service.prices[service.prices.length - 1];
    return {
      _id: selectedPrice._id,
      label: selectedPrice.label,
      price: selectedPrice.price,
    };
  }

  return null;
}

// --- Availability Helpers ---

const WORKING_HOURS = { start: 9, end: 18 }; // 9 AM - 6 PM

async function checkAvailability(dateStr, startTime, endTime) {
  if (!dateStr || !startTime || !endTime) return true; // Can't check if incomplete

  const start = buildDateTime(dateStr, startTime);
  const end = buildDateTime(dateStr, endTime);

  // 1. Check working hours
  const startHour = new Date(start).getHours();
  const endHour = new Date(end).getHours();
  if (startHour < WORKING_HOURS.start || endHour > WORKING_HOURS.end) {
    return false;
  }

  // 2. Check overlap with existing slots
  // We assume ANY overlap blocks the slot for simplicity
  const conflictingSlot = await TimeSlotModel.findOne({
    date: new Date(dateStr),
    $or: [
      { startTime: { $lt: end }, endTime: { $gt: start } }, // Overlap condition
    ],
  });

  return !conflictingSlot;
}

async function findNearestSlots(dateStr, durationMinutes = 60) {
  const suggestions = [];
  const baseDate = new Date(dateStr);
  const dateStrings = [dateStr];

  // Check today and next 2 days
  const nextDay = new Date(baseDate);
  nextDay.setDate(baseDate.getDate() + 1);
  const dayAfter = new Date(baseDate);
  dayAfter.setDate(baseDate.getDate() + 2);
  dateStrings.push(formatDate(nextDay));
  dateStrings.push(formatDate(dayAfter));

  for (const day of dateStrings) {
    // Generate candidate slots every hour
    for (let h = WORKING_HOURS.start; h < WORKING_HOURS.end; h++) {
      const startT = `${h.toString().padStart(2, "0")}:00`;
      const endH = h + Math.ceil(durationMinutes / 60);
      const endT = `${endH.toString().padStart(2, "0")}:00`;

      const isFree = await checkAvailability(day, startT, endT);
      if (isFree) {
        suggestions.push({
          date: day,
          start_time: startT,
          end_time: endT,
          reason: day === dateStr ? "Available today" : "Next earliest slot",
        });
      }
      if (suggestions.length >= 3) break;
    }
    if (suggestions.length >= 3) break;
  }
  return suggestions;
}

// Validate GROQ_API_KEY at module load
if (!process.env.GROQ_API_KEY) {
  console.warn("Warning: GROQ_API_KEY environment variable is not set");
}

// Initialize Groq client (lazy initialization to handle missing key gracefully)
let groq = null;
function getGroqClient() {
  if (!groq && process.env.GROQ_API_KEY) {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  return groq;
}

// Model configurations
const MODEL_CONFIGS = {
  polite: {
    model: "llama-3.3-70b-versatile",
    description: "Highest quality versatile model",
  },
  concise: {
    model: "llama-3.1-8b-instant",
    description: "Fast and direct answers",
  },
  versatile: {
    model: "llama-3.3-70b-versatile",
    description: "Balanced responses with good detail",
  },
  creative: {
    model: "llama-3.1-70b-versatile",
    description: "Large context versatile model",
  },
};

const BOOKING_MODEL = "llama-3.3-70b-versatile";

// Model fallback order for rate limiting
const MODEL_FALLBACK_ORDER = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
];

// Rate limit aware API call wrapper
async function callGroqWithFallback(groqClient, params) {
  let lastError = null;

  for (const model of MODEL_FALLBACK_ORDER) {
    try {
      console.log(`Attempting with model: ${model}`);
      const result = await groqClient.chat.completions.create({
        ...params,
        model: model,
      });

      if (model !== MODEL_FALLBACK_ORDER[0]) {
        console.log(`Successfully switched to fallback model: ${model}`);
      }

      return result;
    } catch (error) {
      lastError = error;
      console.warn(`Model ${model} failed:`, error.message);

      // Check if it's a rate limit error
      if (
        error.message?.includes("rate limit") ||
        error.message?.includes("429") ||
        error.status === 429
      ) {
        console.log(`Rate limit hit on ${model}, trying next model...`);
        continue;
      }

      // If it's a 401 (Invalid API Key), don't bother trying other models
      if (error.status === 401 || error.message?.includes("401")) {
        console.error("CRITICAL: Groq API Key is invalid.");
        break;
      }

      // If it's not a rate limit error, don't try other models for safety unless it's a 5xx/overloaded
      if (error.status !== 429 && error.status !== 503) {
        break;
      }
    }
  }

  // If we get here, all models failed
  throw new Error(
    `All models failed. Last error: ${lastError?.message || "Unknown error"}`,
  );
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;
const rateLimitMap = new Map();

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now - data.timestamp > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

/**
 * Check if a client IP is rate limited
 */
function isRateLimited(ip) {
  const now = Date.now();
  const rateLimitData = rateLimitMap.get(ip);

  if (!rateLimitData) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return false;
  }

  const { count, timestamp } = rateLimitData;

  if (now - timestamp > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return false;
  }

  if (count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  rateLimitMap.set(ip, { count: count + 1, timestamp });
  return false;
}

/**
 * Categorize errors for GraphQL responses
 */
function categorizeError(error) {
  if (error == null) {
    return {
      message: "An unknown error occurred",
      type: "UNKNOWN_ERROR",
    };
  }

  if (typeof error === "string") {
    return {
      message: error,
      type: "UNKNOWN_ERROR",
    };
  }

  if (error instanceof Error) {
    if (
      error.message.includes("429") ||
      error.message.includes("Too Many Requests") ||
      error.message.includes("quota") ||
      error.message.toLowerCase().includes("resource has been exhausted")
    ) {
      return {
        message:
          "API quota exceeded. Please try again tomorrow or upgrade your plan.",
        type: "QUOTA_EXCEEDED",
      };
    }

    if (
      error.message.includes("401") ||
      error.message.includes("unauthorized") ||
      error.message.includes("API key")
    ) {
      return {
        message:
          "Authentication failed. Please check your API key configuration.",
        type: "AUTH_ERROR",
      };
    }

    if (
      error.message.includes("fetch") ||
      error.message.includes("network") ||
      error.message.includes("connection")
    ) {
      return {
        message: "Network error. Please check your connection and try again.",
        type: "NETWORK_ERROR",
      };
    }

    return {
      message: error.message,
      type: "API_ERROR",
    };
  }

  return {
    message: "An unexpected error occurred",
    type: "UNKNOWN_ERROR",
  };
}

// --- General AI Helpers ---

/**
 * Validate and sanitize messages array
 */
function validateMessages(messages) {
  if (!Array.isArray(messages)) {
    throw new Error("Messages must be an array");
  }

  if (messages.length === 0) {
    throw new Error("At least one message is required");
  }

  return messages.map((msg, index) => {
    if (!msg || typeof msg !== "object") {
      throw new Error(
        `Invalid message format at index ${index}: must be an object`,
      );
    }

    if (!msg.role || !["user", "assistant"].includes(msg.role)) {
      throw new Error(
        `Invalid role at index ${index}: must be 'user' or 'assistant'`,
      );
    }

    if (!msg.content || typeof msg.content !== "string") {
      throw new Error(
        `Invalid content at index ${index}: must be a non-empty string`,
      );
    }

    if (msg.content.trim().length === 0) {
      return {
        role: msg.role,
        content:
          msg.role === "user"
            ? "what do you want to know?"
            : msg.content.trim(),
        timestamp: msg.timestamp,
        id: msg.id,
      };
    }

    if (msg.content.length > 10000) {
      throw new Error(
        `Message too long at index ${index}: maximum 10,000 characters`,
      );
    }

    return {
      role: msg.role,
      content: msg.content.trim(),
      timestamp: msg.timestamp,
      id: msg.id,
    };
  });
}

/**
 * Summarize conversation for context
 */
function summarizeConversation(messages) {
  if (messages.length <= 2) return "";

  const recentMessages = messages.slice(-6);
  const topics = [];

  const content = recentMessages
    .map((m) => m.content)
    .join(" ")
    .toLowerCase();

  if (content.includes("tuneit") || content.includes("solo project"))
    topics.push("Tuneit project");
  if (content.includes("jobify") || content.includes("marvellex"))
    topics.push("Jobify/Marvellex work");
  if (content.includes("servifi")) topics.push("Servifi project");
  if (content.includes("talent-tube") || content.includes("talent tube"))
    topics.push("Talent-Tube project");
  if (content.includes("debug") || content.includes("bug"))
    topics.push("debugging experience");
  if (content.includes("learn") || content.includes("started"))
    topics.push("learning journey");
  if (content.includes("javascript") || content.includes("js"))
    topics.push("JavaScript");
  if (content.includes("react") || content.includes("next"))
    topics.push("React/Next.js");

  if (topics.length === 0) return "";

  return `Recent conversation topics: ${topics.join(", ")}. `;
}

/**
 * Check if message is a casual greeting
 */
function isCasualGreeting(userQuery) {
  const queryLower = userQuery.toLowerCase().trim();

  const greetingKeywords = [
    "hello",
    "hi",
    "hey",
    "good morning",
    "good afternoon",
    "good evening",
    "howdy",
    "greetings",
    "sup",
    "what's up",
    "whats up",
    "yo",
    "hiya",
  ];

  return (
    greetingKeywords.some(
      (keyword) =>
        queryLower === keyword ||
        queryLower.startsWith(keyword + " ") ||
        queryLower.startsWith(keyword + ",") ||
        queryLower.startsWith(keyword + "!"),
    ) && queryLower.length < 50
  );
}

/**
 * Check if user is explicitly asking to book a professional.
 * This should trigger service search directly, without asking for more issue details.
 */
function isExplicitProfessionalBookingRequest(userQuery) {
  if (!userQuery || typeof userQuery !== "string") return false;
  const q = userQuery.toLowerCase();
  return (
    /\b(book|booking|schedule|hire)\b/.test(q) &&
    /\b(professional|pro|expert|technician|plumber|electrician|carpenter|ac|hvac|cleaner|cleaning)\b/.test(
      q,
    )
  );
}

/**
 * Get the next missing field question based on current data and service_type
 * IMPORTANT: Duration is NEVER asked - it comes from service data automatically
 */
function getNextMissingFieldQuestion(currentData, userLanguage = "english") {
  if (!currentData || typeof currentData !== "object") {
    currentData = {};
  }

  const serviceType = currentData.service_type || null;
  const missing = [];

  if (!currentData.problem_description) missing.push("problem");
  if (!currentData.service_id) missing.push("service");
  if (!currentData.preferred_date) missing.push("date");
  if (!currentData.start_time) missing.push("start_time");
  // CRITICAL: Do NOT ask for duration - it's automatically extracted from service data
  // Duration is never included in missing fields

  // Only ask for the relevant count based on service_type
  if (serviceType === "customer_based") {
    if (
      !currentData.number_of_customers &&
      currentData.number_of_customers !== 0
    )
      missing.push("customers");
  } else if (serviceType === "tradesman_based") {
    if (
      !currentData.number_of_tradesmen &&
      currentData.number_of_tradesmen !== 0
    )
      missing.push("tradesmen");
  } else {
    // service_type unknown yet — don't ask for either until we know
  }

  // service_option is required once a service is identified
  if (currentData.service_id && !currentData.service_option) {
    missing.push("service_option");
  }

  if (missing.length === 0) return null;

  const nextMissing = missing[0];

  if (userLanguage === "urdu") {
    switch (nextMissing) {
      case "problem":
        return "Kya masla hai jo aap theek karwana chahte hain?";
      case "service":
        return "Kis tarah ki service chahiye?";
      case "date":
        return "Kaunsa din theek rahega?";
      case "start_time":
        return "Kitne baje ana chahiye?";
      case "customers":
        return "Kitne log ghar mein honge?";
      case "tradesmen":
        return "Kitne workers chahiye?";
      case "service_option":
        return "Kaunsa service option chunna chahenge? (Meherban farma kar apna option chuniye)";
      default:
        return "Aur kya bataiye?";
    }
  } else {
    switch (nextMissing) {
      case "problem":
        return "What seems to be the problem you need help with?";
      case "service":
        return "What type of service do you need?";
      case "date":
        return "What date would work best for you?";
      case "start_time":
        return "What time would you prefer?";
      case "customers":
        return "How many people will be present during the service?";
      case "tradesmen":
        return "How many workers do you think you'll need?";
      case "service_option":
        return "Which service option would you like to choose? Please select one from the available options.";
      default:
        return "What else can you tell me?";
    }
  }
}

/**
 * Generate a random greeting response
 */
function generateGreetingResponse() {
  const greetings = [
    "Hey, what's up?",
    "Hi there, what's on your mind today?",
    "Hey! What would you like to know?",
    "Hello! How can I help you today?",
    "Hi! What's on your mind?",
  ];

  return greetings[Math.floor(Math.random() * greetings.length)];
}

/**
 * Detect the type of query for structured responses
 */
function detectQueryType(userQuery) {
  const queryLower = userQuery.toLowerCase();

  const skillsKeywords = [
    "skills",
    "hard skills",
    "soft skills",
    "technical skills",
    "what are your skills",
    "tell me about your skills",
    "what skills do you have",
    "abilities",
    "competencies",
  ];
  if (skillsKeywords.some((keyword) => queryLower.includes(keyword)))
    return "skills";

  const resumeKeywords = [
    "resume",
    "cv",
    "curriculum vitae",
    "background",
    "qualification",
    "summary",
    "about me",
    "bio",
    "profile",
  ];
  if (resumeKeywords.some((keyword) => queryLower.includes(keyword)))
    return "resume";

  const projectsKeywords = [
    "projects",
    "work",
    "portfolio",
    "what have you built",
    "what are your projects",
    "show me your projects",
    "showcase",
    "demos",
  ];
  if (projectsKeywords.some((keyword) => queryLower.includes(keyword)))
    return "projects";

  const experienceKeywords = [
    "experience",
    "job",
    "work experience",
    "professional experience",
    "career",
    "employment",
    "work history",
  ];
  if (experienceKeywords.some((keyword) => queryLower.includes(keyword)))
    return "experience";

  const contactKeywords = [
    "contact",
    "reach out",
    "get in touch",
    "email",
    "social media",
    "github",
    "instagram",
    "discord",
    "linkedin",
  ];
  if (contactKeywords.some((keyword) => queryLower.includes(keyword)))
    return "contact";

  const setupKeywords = [
    "setup",
    "computer",
    "laptop",
    "specs",
    "hardware",
    "development environment",
    "machine",
  ];
  if (setupKeywords.some((keyword) => queryLower.includes(keyword)))
    return "setup";

  return null;
}

/**
 * Get structured response instructions for a query type
 */
function getStructuredResponseInstructions(queryType) {
  const instructions = {
    skills: `
When discussing your skills, share them conversationally like you're explaining what you know and how you use it:
- Start with your overall tech journey and what drives your learning
- Talk about your key technologies naturally - explain why you like each one and how you apply it
- Group them loosely (like frontend tools, backend systems, databases, etc.) but don't force rigid categories
- For each skill, mention specific projects or experiences that highlight your experience
- Share your learning approach and how you stay current
- Keep the tone personal and reflective of your actual experience
Remember to maintain natural flow - use phrases like "I'm really comfortable with", "I've been using", "What I love about", "That's helped me with" to make it feel like real conversation.`,

    projects: `
When talking about your projects, share them like you're telling someone about your work and what you've built:
- Start with a brief overview of your project journey and what motivates you
- Describe each major project in a connected way - what problem it solves, your role, the tech involved, and the outcome
- Connect projects to show your growth or learning progression
- Include links naturally as part of the conversation (like "you can check it out at...")
- Highlight what made each project interesting or challenging to you personally
- Don't list them mechanically - weave them into a narrative about your development path
Use smooth transitions and keep it conversational, like you're sharing your portfolio with a friend.`,

    contact: `
When sharing contact information, be helpful and give context about how to reach you:
- Start with your preferred way to be contacted and why
- Explain your social media presence and how active you are on each platform
- Share your availability and typical response times
- Give guidance on what kinds of inquiries work best for email vs other channels
- Be clear about your current work situation and freelance availability
- Keep it approachable and personable
Make it feel like you're giving someone your contact info in a natural conversation.`,

    experience: `
When discussing your professional experience, share your journey like you're telling your story:
- Start with how you got into coding and your early experiences
- Talk about your current work at Marvellex - how you got there, what you do, your daily rhythm
- Share your work philosophy and habits that have shaped your approach
- Connect your experience to personal growth and future goals
- Mention key projects or achievements that highlight your development
- Keep it chronological but conversational, not like a resume
Use storytelling elements to make it engaging and authentic.`,

    setup: `
When describing your development setup, share it like you're showing someone your workspace:
- Start with your hardware and why it works for you
- Talk about your operating system choice and development environment
- Explain your tools and workflow preferences
- Share habits or quirks that make your setup unique
- Mention any future considerations or what you value in your setup
- Keep it personal and reflective of your actual preferences
Make it feel like a natural discussion about your tech environment.`,

    resume: `
When providing background information, share it like you're introducing yourself professionally but conversationally:
- Start with who you are, your current role, and your background
- Cover your professional experience, education, and key skills
- Highlight major projects and achievements
- Share your technical proficiency and work approach
- Keep it comprehensive but flowing naturally
- Use confident but approachable language
Structure it logically but maintain the personal touch throughout.`,
  };

  return instructions[queryType] || "";
}

// --- Booking Assistant Helpers ---

/**
 * Extract keywords from problem description for service search
 */
function extractKeywords(problemDescription) {
  if (!problemDescription) return [];

  const text = problemDescription.toLowerCase();
  const keywords = [];

  const keywordMappings = {
    plumbing: [
      "sink",
      "pipe",
      "leak",
      "water",
      "faucet",
      "drain",
      "toilet",
      "bathroom",
      "plumber",
      "plumbing",
    ],
    electrical: [
      "electric",
      "power",
      "outlet",
      "switch",
      "wire",
      "light",
      "socket",
      "voltage",
      "electrician",
    ],
    carpentry: [
      "wood",
      "door",
      "cabinet",
      "furniture",
      "carpenter",
      "shelf",
      "drawer",
    ],
    painting: ["paint", "wall", "color", "coating", "painter"],
    cleaning: ["clean", "dust", "wash", "mop", "sweep", "cleaner"],
    ac: [
      "ac",
      "air conditioner",
      "cooling",
      "hvac",
      "air conditioning",
      "cold",
    ],
    appliance: [
      "appliance",
      "refrigerator",
      "fridge",
      "washing machine",
      "microwave",
      "oven",
    ],
  };

  for (const [service, words] of Object.entries(keywordMappings)) {
    if (words.some((word) => text.includes(word))) {
      keywords.push(service);
    }
  }

  const significantWords = text
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 5);

  return [...new Set([...keywords, ...significantWords])];
}

/**
 * Search services using utils/service-search.js (single source of truth)
 * @param {string} problemDescription - User's problem description
 * @returns {Array} Array of matching services
 */
async function searchServices(problemDescription) {
  return searchServicesUtil(problemDescription);
}

/**
 * Get service by ID using utils/service-search.js (O(1) lookup)
 * @param {string} serviceId - Service ID
 * @returns {Object|null} Service object or null if not found
 */
function getServiceById(serviceId) {
  return getServiceByIdUtil(serviceId);
}

/**
 * Parse date from natural language
 */
function parseDate(dateString, referenceDate = new Date()) {
  const text = dateString.toLowerCase().trim();
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  if (text === "today" || text === "now") {
    return formatDate(today);
  }

  if (text === "tomorrow") {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDate(tomorrow);
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
    return formatDate(nextDate);
  }

  const datePatterns = [
    /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i,
    /(\d{1,2})[\/\-](\d{1,2})[\/\-]?(\d{2,4})?/,
  ];

  const monthNames = [
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

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      let day, month, year;

      if (monthNames.includes(match[2]?.toLowerCase())) {
        day = parseInt(match[1]);
        month = monthNames.indexOf(match[2].toLowerCase());
        year = today.getFullYear();
      } else if (monthNames.includes(match[1]?.toLowerCase())) {
        day = parseInt(match[2]);
        month = monthNames.indexOf(match[1].toLowerCase());
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
        return formatDate(parsedDate);
      }
    }
  }

  return null;
}

/**
 * Parse time from natural language
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
 * Parse duration and calculate end time
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
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get day name from date string
 */
function getDayFromDate(dateString) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const date = new Date(dateString);
  return days[date.getDay()];
}

/**
 * Build full datetime from date and time strings (Enforce PKT +05:00)
 */
function buildDateTime(dateString, timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);

  // Create ISO string with fixed offset for Pakistan (UTC+5)
  // Format: YYYY-MM-DDTHH:mm:00.000+05:00
  const isoWithOffset = `${dateString}T${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00.000+05:00`;

  return new Date(isoWithOffset).toISOString();
}

/**
 * Generate comprehensive checkout URL with all required parameters
 * This must match the manual flow exactly to ensure compatibility
 */
function generateCheckoutUrl(extractedData) {
  if (!extractedData.booking_ready) return null;
  if (extractedData.booking_mode === "automatic") return null;

  try {
    // Get service details by ID (not by search!)
    const service = getServiceById(extractedData.service_id);

    if (!service) {
      console.warn(
        "Service not found for AI redirect:",
        extractedData.service_id,
      );
      return null;
    }

    // Set default pricing - use first pricing option
    let selectedPrice = null;
    let totalPrice = 0;

    if (service.prices && service.prices.length > 0) {
      selectedPrice = {
        _id: service.prices[0]._id,
        price: service.prices[0].price,
        type: service.prices[0].type,
        duration: service.prices[0].duration,
      };
      totalPrice = service.prices[0].price;
    } else {
      selectedPrice = {
        _id: "default_price",
        price: 500,
        type: "fixed",
        duration: service.duration || 60,
      };
      totalPrice = 500;
    }

    // Convert time format to proper AM/PM format
    const formatTimeForURL = (time24) => {
      if (!time24) return "";
      const [hours, minutes] = time24.split(":");
      const hour24 = parseInt(hours);
      const ampm = hour24 >= 12 ? "PM" : "AM";
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      return `${hour12}:${minutes} ${ampm}`;
    };

    // Build complete booking parameters - including new required fields
    const bookingParams = {
      serviceId: extractedData.service_id,
      service: extractedData.service_id, // For compatibility
      date: extractedData.preferred_date,
      startTime: formatTimeForURL(extractedData.start_time),
      endTime: formatTimeForURL(extractedData.end_time),
      selectedPrice: selectedPrice,
      selectedAddons: [], // Default to empty array
      totalPrice: totalPrice,
      address: extractedData.location || "",
      city: extractedData.city || "",
      lat: extractedData.lat || undefined,
      lng: extractedData.lng || undefined,
      user_instructions: extractedData.problem_description || "",
      user_instructions_images: [],
      number_of_tradesman: extractedData.number_of_tradesmen || 1, // New required field
      number_of_customers: extractedData.number_of_customers || 1, // New required field
      payment_method: extractedData.payment_method || "cashOnDelivery",
      userTradesmanChoice: "manual", // AI always leads to manual selection
      service_option: extractedData.service_option || null,
    };

    // Build URL parameters using the same function as manual flow
    const params = new URLSearchParams();

    // Core identifiers
    params.set("service", bookingParams.serviceId);
    params.set("serviceId", bookingParams.serviceId);

    // Time parameters
    if (bookingParams.date) params.set("date", bookingParams.date);
    if (bookingParams.startTime)
      params.set("startTime", bookingParams.startTime);
    if (bookingParams.endTime) params.set("endTime", bookingParams.endTime);

    // Pricing parameters
    if (bookingParams.selectedPrice) {
      params.set("selectedPrice", JSON.stringify(bookingParams.selectedPrice));
    }
    if (bookingParams.selectedAddons) {
      params.set(
        "selectedAddons",
        JSON.stringify(bookingParams.selectedAddons),
      );
    }
    if (bookingParams.service_option) {
      params.set(
        "service_option",
        JSON.stringify(bookingParams.service_option),
      );
    }

    if (bookingParams.totalPrice) {
      params.set("totalPrice", bookingParams.totalPrice.toString());
    }

    if (bookingParams.address) params.set("address", bookingParams.address);
    if (bookingParams.city) params.set("city", bookingParams.city);
    if (bookingParams.lat !== undefined)
      params.set("lat", bookingParams.lat.toString());
    if (bookingParams.lng !== undefined)
      params.set("lng", bookingParams.lng.toString());

    if (bookingParams.user_instructions) {
      params.set("user_instructions", bookingParams.user_instructions);
    }
    if (bookingParams.number_of_tradesman) {
      params.set(
        "number_of_tradesman",
        bookingParams.number_of_tradesman.toString(),
      );
    }
    if (bookingParams.number_of_customers) {
      params.set(
        "number_of_customers",
        bookingParams.number_of_customers.toString(),
      );
    }
    if (bookingParams.payment_method) {
      params.set("payment_method", bookingParams.payment_method);
    }
    if (bookingParams.userTradesmanChoice) {
      params.set("userTradesmanChoice", bookingParams.userTradesmanChoice);
    }

    return `/checkout/tradesman?${params.toString()}`;
  } catch (error) {
    console.error("Error generating checkout URL:", error);
    return null;
  }
}

async function executeAutomaticBooking(extractedData, userId) {
  try {
    if (!extractedData.booking_ready) {
      return {
        success: false,
        message: "Booking data is incomplete",
        allFieldsCollected: false,
      };
    }

    if (!userId) {
      return {
        success: false,
        message: "User authentication required for automatic booking",
        allFieldsCollected: true,
      };
    }

    const bookingInput = {
      user: userId,
      service: extractedData.service_id,
      date: extractedData.preferred_date,
      day: getDayFromDate(extractedData.preferred_date),
      startTime: buildDateTime(
        extractedData.preferred_date,
        extractedData.start_time,
      ),
      endTime: buildDateTime(
        extractedData.preferred_date,
        extractedData.end_time,
      ),
      address: extractedData.location,
      userTradesmanChoice: "automatic",
      number_of_tradesman: extractedData.number_of_tradesmen || 1,
      number_of_customers: extractedData.number_of_customers || 1,
      user_instructions: extractedData.problem_description || "",
      service_option: extractedData.service_option || null,
    };

    const result = await BookingService.createBooking(bookingInput);

    return result;
  } catch (error) {
    console.error("executeAutomaticBooking error:", error);
    return {
      success: false,
      message: error.message || "Failed to create booking",
      allFieldsCollected: true,
    };
  }
}

/**
 * Parse AI response JSON
 */
function parseAIResponse(responseText) {
  try {
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.warn(
          "Failed to parse JSON from markdown block, trying fallback",
        );
      }
    }

    const startIndex = responseText.indexOf("{");
    const endIndex = responseText.lastIndexOf("}");

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const jsonString = responseText.substring(startIndex, endIndex + 1);
      try {
        return JSON.parse(jsonString);
      } catch (e) {
        console.warn("Failed to parse extracted JSON string:", e);
      }
    }

    return JSON.parse(responseText);
  } catch (error) {
    console.error("Critical JSON parse error:", error);
    return {
      message: responseText,
      extracted_data: {},
    };
  }
}

/**
 * Detect user's language from their message
 */
function detectLanguage(message) {
  // Only detect Urdu via script to avoid keyword-based assumptions.
  // If it's not Urdu script, treat it as English.
  const hasUrduScript = /[\u0600-\u06FF]/.test(message);
  return hasUrduScript ? "urdu" : "english";
}

/**
 * Clean response from technical data that should not be visible to users
 */
function cleanResponseFromTechnicalData(text) {
  if (!text) return text;

  let cleaned = text;

  // Remove service IDs and technical details
  cleaned = cleaned.replace(/service\s+id[^.]*?[a-f0-9]{24}[^.]*/gi, "");
  cleaned = cleaned.replace(/The service ID[^.]*\./gi, "");
  cleaned = cleaned.replace(/service ID[^.]*\./gi, "");
  cleaned = cleaned.replace(/\b[a-f0-9]{24}\b/gi, ""); // MongoDB ObjectIds
  cleaned = cleaned.replace(/ID:\s*[a-f0-9]{24}/gi, "");

  // Remove extracted data references
  cleaned = cleaned.replace(/Current extracted data[^}]*}/gi, "");
  cleaned = cleaned.replace(/extracted.data[^}]*}/gi, "");
  cleaned = cleaned.replace(/\{.*?"phase".*?\}/gi, "");

  // Remove specific technical phrases
  const technicalPhrases = [
    /extracted[_\s]*data/gi,
    /booking[_\s]*ready/gi,
    /phase[_\s]*:/gi,
    /problem[_\s]*solving/gi,
    /"phase":/gi,
    /"booking_ready":/gi,
    /Current extracted data:/gi,
    /service\s*id/gi,
  ];

  technicalPhrases.forEach((phrase) => {
    cleaned = cleaned.replace(phrase, "");
  });

  // Fix vague responses
  if (
    cleaned.toLowerCase().includes("i need a few more details") ||
    cleaned.toLowerCase().includes("please continue")
  ) {
    cleaned = "What specific information would you like to provide next?";
  }

  // Clean up extra whitespace and formatting
  cleaned = cleaned.replace(/[{}]/g, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

/**
 * Main Assistant datasource class
 */
const AssistantDataSource = {
  /**
   * Send a general conversation message (Portfolio Chat)
   */
  async sendGeneralMessage({
    messages,
    style = "versatile",
    clientIp = "unknown",
  }) {
    const startTime = Date.now();

    try {
      if (isRateLimited(clientIp)) {
        return {
          success: false,
          message: "Rate limit exceeded. Please try again later.",
          content: null,
          metadata: {
            processingTimeMs: Date.now() - startTime,
          },
        };
      }

      const validatedMessages = validateMessages(messages);
      const selectedStyle = style && MODEL_CONFIGS[style] ? style : "versatile";
      const selectedModel = MODEL_CONFIGS[selectedStyle];

      const lastUserMessage = validatedMessages[validatedMessages.length - 1];
      const userQuery = lastUserMessage ? lastUserMessage.content : "";

      if (!userQuery.trim()) {
        return {
          success: true,
          message: "Empty message handled",
          content: "what do you want to know?",
          metadata: {
            processingTimeMs: Date.now() - startTime,
            model: selectedModel.model,
            queryType: null,
          },
        };
      }

      if (isCasualGreeting(userQuery)) {
        return {
          success: true,
          message: "Greeting response",
          content: generateGreetingResponse(),
          metadata: {
            processingTimeMs: Date.now() - startTime,
            model: selectedModel.model,
            queryType: "greeting",
          },
        };
      }

      const queryType = detectQueryType(userQuery);
      const conversationSummary = summarizeConversation(validatedMessages);

      let systemPromptWithContext = "";
      if (SYSTEM_PROMPT && SYSTEM_PROMPT.content) {
        systemPromptWithContext = conversationSummary
          ? SYSTEM_PROMPT.content + "\n\n" + conversationSummary
          : SYSTEM_PROMPT.content;
      } else {
        systemPromptWithContext =
          "You are Siraj, a helpful AI assistant. " +
          (conversationSummary || "");
      }

      if (queryType) {
        const structuredInstructions =
          getStructuredResponseInstructions(queryType);
        systemPromptWithContext += "\n\n" + structuredInstructions;
      }

      const apiMessages = [
        { role: "system", content: systemPromptWithContext.trim() },
        ...validatedMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      const groqClient = getGroqClient();
      if (!groqClient) {
        return {
          success: false,
          message:
            "AI service not configured. Please set GROQ_API_KEY environment variable.",
          content: null,
          metadata: {
            processingTimeMs: Date.now() - startTime,
          },
        };
      }

      const result = await callGroqWithFallback(groqClient, {
        model: selectedModel.model,
        messages: apiMessages,
        max_tokens: 2048,
        temperature: 0.7,
        stream: false,
      });

      const responseContent =
        result.choices[0]?.message?.content ||
        "Sorry, I couldn't generate a response.";

      return {
        success: true,
        message: "Response generated successfully",
        content: responseContent,
        metadata: {
          processingTimeMs: Date.now() - startTime,
          model: selectedModel.model,
          queryType: queryType,
        },
      };
    } catch (error) {
      console.error("AI sendGeneralMessage error:", error);
      const errorInfo = categorizeError(error);

      return {
        success: false,
        message: errorInfo.message,
        content: null,
        metadata: {
          processingTimeMs: Date.now() - startTime,
        },
      };
    }
  },

  /**
   * Process a booking message (Booking Chat)
   */
  /**
   * Process a booking message (Booking Chat)
   * Enhanced with DIY vs Professional flow, language consistency, and complete field validation
   */
  async processBookingMessage(
    conversationId,
    userMessage,
    userId = null,
    options = {},
  ) {
    try {
      const groqClient = getGroqClient();
      if (!groqClient) throw new Error("AI service not configured");

      // --- SETUP CONTEXT ---
      const messagesResult =
        await ConversationDataSource.getConversationMessages(conversationId);
      const conversationHistory = messagesResult.data || [];
      const lastExtractedData =
        await ConversationDataSource.getLastExtractedData(conversationId);

      // Add User Message to DB (skip if already saved, e.g., from image upload)
      if (!options.skipUserMessageSave) {
        await ConversationDataSource.addMessage({
          conversationId,
          role: "user",
          content: userMessage,
          extractedData: {},
        });
      }

      // Detect user's language for consistent responses
      const userLanguage = detectLanguage(userMessage);

      // Casual greeting: respond casually first, don't push booking.
      if (isCasualGreeting(userMessage)) {
        const casualReply =
          userLanguage === "urdu"
            ? "Assalam o Alaikum! Kya haal hai? Aaj main aapki kis cheez mein madad kar sakta hun?"
            : "Hey! How's it going? What can I help you with today?";

        const cleaned = cleanResponseFromTechnicalData(casualReply);

        const greetingData = {
          ...(lastExtractedData || {}),
          phase: "greeting",
          booking_ready: false,
          allFieldsCollected: false,
        };

        await ConversationDataSource.addMessage({
          conversationId,
          role: "assistant",
          content: cleaned,
          extractedData: greetingData,
        });

        return {
          success: true,
          message: "Casual greeting response",
          content: cleaned,
          extracted_data: greetingData,
          available_services: [],
          checkout_url: null,
          booking_id: null,
          booking_success: false,
          allFieldsCollected: false,
        };
      }

      // Check if this is first interaction
      const isFirstInteraction =
        conversationHistory.length === 0 ||
        !lastExtractedData?.phase ||
        lastExtractedData.phase === "greeting" ||
        lastExtractedData.phase === "initial";

      // Check for "nearest" booking request - auto-book first available option
      const userSaysNearest =
        /nearest|closest|first|earliest|soonest|pehla|sabse pehle|jaldi/i.test(
          userMessage,
        );
      if (
        userSaysNearest &&
        lastExtractedData?.suggested_options?.length > 0 &&
        userId
      ) {
        console.log("Auto-booking nearest option for user:", userId);
        const firstOption = lastExtractedData.suggested_options[0];

        try {
          const autoBookingResult = await this.createAutomaticBooking(
            conversationId,
            userId,
            firstOption.date,
            firstOption.time,
            firstOption.service || lastExtractedData.service_id,
            lastExtractedData.location || "automatic",
            lastExtractedData.number_of_customers || 1,
            lastExtractedData.number_of_tradesmen || 1,
          );

          if (autoBookingResult.success) {
            const confirmMessage =
              userLanguage === "urdu"
                ? `Perfect! Maine aapke liye ${firstOption.service || lastExtractedData.service_name || "service"} book kar diya hai ${firstOption.date} pe ${firstOption.time} pe. Aapka booking ID hai ${autoBookingResult.bookingId}.`
                : `Perfect! I've automatically booked your ${firstOption.service || lastExtractedData.service_name || "service"} for ${firstOption.date} at ${firstOption.time}. Your booking ID is ${autoBookingResult.bookingId}.`;

            await ConversationDataSource.addMessage({
              conversationId,
              role: "assistant",
              content: confirmMessage,
              extractedData: {
                ...lastExtractedData,
                booking_ready: true,
                allFieldsCollected: true,
              },
            });

            return {
              success: true,
              message: "Booking confirmed",
              content: confirmMessage,
              extracted_data: lastExtractedData,
              available_services: [],
              checkout_url: null,
              booking_id: autoBookingResult.bookingId,
              booking_success: true,
              allFieldsCollected: true,
            };
          }
        } catch (autoBookingError) {
          console.error("Auto-booking failed:", autoBookingError);
        }
      }

      // --- SERVER-SIDE PHASE DETECTION ---
      // Determine if user wants to book BEFORE sending to AI
      let serverDetectedPhase = lastExtractedData?.phase || "initial";

      // If user explicitly wants to book a professional, set phase to booking
      if (isExplicitProfessionalBookingRequest(userMessage)) {
        serverDetectedPhase = "booking";
      }

      // If user is describing a problem and we're still in initial/greeting/problem_solving,
      // keep as problem_solving — the AI will decide booking vs diy_help
      // BUT if user says "yes", "book", "professional" after a problem description, go to booking
      if (
        lastExtractedData?.problem_description &&
        (lastExtractedData?.phase === "problem_solving" ||
          lastExtractedData?.phase === "initial") &&
        /\b(yes|yeah|yep|sure|ok|okay|book|professional|pro|haan|ji|theek|karwao|buk)\b/i.test(
          userMessage,
        )
      ) {
        serverDetectedPhase = "booking";
      }

      // If user wants DIY
      if (
        /\b(myself|diy|khud|self|fix it myself|apne aap)\b/i.test(
          userMessage,
        ) &&
        (lastExtractedData?.phase === "problem_solving" ||
          lastExtractedData?.phase === "initial")
      ) {
        serverDetectedPhase = "diy_help";
      }

      // Generate services context for the AI
      const servicesContext = generateServicesContext();

      // --- PASS 1: INITIAL AI RESPONSE ---
      const systemPrompts = [
        {
          role: "system",
          content: BOOKING_ASSISTANT_PROMPT.content + "\n\n" + servicesContext,
        },
        {
          role: "system",
          content: `Current extracted data: ${JSON.stringify(lastExtractedData)}
Current Date: ${formatDate(new Date())}
Day: ${getDayFromDate(formatDate(new Date()))}
User Language: ${userLanguage}
Is First Interaction: ${isFirstInteraction}
Server Detected Phase: ${serverDetectedPhase}

CRITICAL: The phase MUST be set in your extracted_data response. Based on context:
- Current phase is "${serverDetectedPhase}"
- If user agrees to book, phase MUST be "booking"
- If user wants DIY help, phase MUST be "diy_help"

CRITICAL REMINDERS FOR THIS CONVERSATION:
- NEVER show service IDs, technical codes, or internal system information to the user
- When asking for missing information, be SPECIFIC about what you need
- Ask for ONE missing field at a time
- NEVER say vague things like "I need more details" or "Please continue"
- Always respond in ${userLanguage === "urdu" ? "Romanized Hindi/Urdu" : "English"}
- Keep responses natural and conversational
- For dates: output in YYYY-MM-DD format (e.g., 2025-07-15)
- For times: output in HH:MM 24-hour format (e.g., 17:00 not "5pm")
- For duration: output as a number in hours (e.g., 2 not "2 hours")

${
  getNextMissingFieldQuestion(lastExtractedData, userLanguage)
    ? `NEXT MISSING FIELD TO ASK: ${getNextMissingFieldQuestion(lastExtractedData, userLanguage)}`
    : "ALL REQUIRED FIELDS COLLECTED - READY FOR BOOKING"
}`,
        },
      ];

      const conversationContext = conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const payloadPass1 = [
        ...systemPrompts,
        ...conversationContext,
        { role: "user", content: userMessage },
      ];

      const result1 = await callGroqWithFallback(groqClient, {
        model: BOOKING_MODEL,
        messages: payloadPass1,
        max_tokens: 2048,
        temperature: 0.7,
      });

      const aiResponseText1 = result1.choices[0]?.message?.content || "";

      // Parse the AI response
      const parsedResponse1 = parseAIResponse(aiResponseText1);

      // Define location validation array
      const locationAsks = [
        "location",
        "address",
        "Location",
        "Address",
        "kahan",
        "jagah",
        "ghar",
        "makaan",
        "address kya hai",
        "location batao",
        "where do you",
      ];

      let finalResponseText = parsedResponse1.message || aiResponseText1;

      // Validate response doesn't ask for location
      if (
        locationAsks.some((term) =>
          finalResponseText.toLowerCase().includes(term.toLowerCase()),
        )
      ) {
        console.warn("AI tried to ask for location, correcting response");
        finalResponseText =
          userLanguage === "urdu"
            ? "Main aapki booking complete karne ke liye bas kuch aur details chahiye. Aage bataiye:"
            : "I need a few more details to complete your booking. Please continue:";
      }

      // Merge new data
      let currentData = ConversationDataSource.mergeExtractedData(
        lastExtractedData,
        parsedResponse1.extracted_data || {},
      );

      // --- SERVER-SIDE PHASE ENFORCEMENT ---
      // If server detected a phase change, enforce it (overrides AI's potentially wrong phase)
      if (
        serverDetectedPhase === "booking" &&
        currentData.phase !== "booking"
      ) {
        console.log(
          `SERVER: Forcing phase to "booking" (was "${currentData.phase}")`,
        );
        currentData.phase = "booking";
      }
      if (
        serverDetectedPhase === "diy_help" &&
        currentData.phase !== "diy_help"
      ) {
        console.log(
          `SERVER: Forcing phase to "diy_help" (was "${currentData.phase}")`,
        );
        currentData.phase = "diy_help";
      }
      // Ensure phase is ALWAYS set
      if (!currentData.phase) {
        currentData.phase = serverDetectedPhase || "problem_solving";
        console.log(
          `SERVER: Phase was undefined, set to "${currentData.phase}"`,
        );
      }

      // --- SERVER-SIDE TIME NORMALIZATION ---
      // Always normalize start_time through parseTime (fixes "5pm" → "17:00")
      if (
        currentData.start_time &&
        !/^\d{2}:\d{2}$/.test(currentData.start_time)
      ) {
        const normalizedTime = parseTime(currentData.start_time);
        if (normalizedTime) {
          console.log(
            `SERVER: Normalized start_time "${currentData.start_time}" → "${normalizedTime}"`,
          );
          currentData.start_time = normalizedTime;
        }
      }
      // Also try to parse time from user message if AI didn't capture it
      if (!currentData.start_time) {
        const parsedTime = parseTime(userMessage);
        if (parsedTime) {
          currentData.start_time = parsedTime;
          console.log(
            `SERVER: Parsed start_time from user message: "${parsedTime}"`,
          );
        }
      }

      // --- SERVER-SIDE DATE NORMALIZATION ---
      if (!currentData.preferred_date) {
        const parsedDate = parseDate(userMessage);
        if (parsedDate) currentData.preferred_date = parsedDate;
      }
      // Normalize existing date if not in YYYY-MM-DD
      if (
        currentData.preferred_date &&
        !/^\d{4}-\d{2}-\d{2}$/.test(currentData.preferred_date)
      ) {
        const normalizedDate = parseDate(currentData.preferred_date);
        if (normalizedDate) {
          console.log(
            `SERVER: Normalized preferred_date "${currentData.preferred_date}" → "${normalizedDate}"`,
          );
          currentData.preferred_date = normalizedDate;
        }
      }

      // --- SERVER-SIDE SERVICE OPTION PARSING (pass 1) ---
      // If user is selecting a service option, parse it before any re-prompt
      if (currentData.service_id && !currentData.service_option) {
        const selectedOption = parseServiceOptionSelection(
          userMessage,
          currentData.service_id,
        );
        if (selectedOption) {
          currentData.service_option = selectedOption;
          console.log("SERVICE OPTION SELECTED (pass1):", selectedOption);
        }
      }

      // Parse number fields from user message
      if (!currentData.number_of_customers) {
        const customerMatch = userMessage.match(
          /(\d+)\s*(?:customers?|people|persons?|log|aadmi)/i,
        );
        if (customerMatch) {
          currentData.number_of_customers = parseInt(customerMatch[1]);
        }
      }
      if (!currentData.number_of_tradesmen) {
        const tradesmenMatch = userMessage.match(
          /(\d+)\s*(?:tradesman|tradesmen|worker|workers|karigar|mazdoor)/i,
        );
        if (tradesmenMatch) {
          currentData.number_of_tradesmen = parseInt(tradesmenMatch[1]);
        }
      }

      // --- SERVICE SEARCH (NOT gated by phase anymore) ---
      // Trigger service search whenever we have a problem description but no service_id
      let systemUpdateMessage = null;
      let availableServices = [];

      if (currentData.phase === "diy_help") {
        // For DIY help, skip service search
      } else if (
        (currentData.problem_description ||
          isExplicitProfessionalBookingRequest(userMessage)) &&
        !currentData.service_id
      ) {
        // Service search — triggered by problem_description existing, NOT by phase
        const serviceSearchText =
          currentData.problem_description || userMessage;
        availableServices = await searchServices(serviceSearchText);
        console.log(
          `SERVICE SEARCH for "${serviceSearchText}": found ${availableServices.length} matches`,
        );

        if (availableServices.length > 0) {
          const bestMatch = availableServices[0];
          currentData.service_id = bestMatch._id;
          currentData.service_name = bestMatch.name;

          // Get service_type from services.json
          const fullService = servicesData.find((s) => s._id === bestMatch._id);
          currentData.service_type =
            fullService?.service_type || "tradesman_based";
          currentData.duration_hours = fullService?.duration || null;

          // Don't auto-populate service_option - let user choose explicitly
          // Only set it to null so validation can detect it's missing
          currentData.service_option = null;

          systemUpdateMessage =
            userLanguage === "urdu"
              ? `SYSTEM UPDATE: "${serviceSearchText}" ke liye ${bestMatch.name} service mili hai (service_type: ${currentData.service_type}).
Service automatically selected. User ko sirf confirm kar ke next step (date/time) ki taraf badho.
NEVER mention service ID or technical details to user.
${
  currentData.service_type === "customer_based"
    ? "This is a customer_based service — ask how many people will be present. Do NOT ask for number of workers."
    : "This is a tradesman_based service — ask how many workers are needed. Do NOT ask for number of customers."
}`
              : `SYSTEM UPDATE: Found ${bestMatch.name} service for "${serviceSearchText}" (service_type: ${currentData.service_type}).
Service automatically selected. Just confirm and move to next step (date/time).
NEVER mention service ID or technical details to user.
${
  currentData.service_type === "customer_based"
    ? "This is a customer_based service — ask how many people will be present. Do NOT ask for number of workers."
    : "This is a tradesman_based service — ask how many workers are needed. Do NOT ask for number of customers."
}`;
        } else {
          systemUpdateMessage =
            userLanguage === "urdu"
              ? `SYSTEM UPDATE: "${serviceSearchText}" ke liye koi service nahin mili. User se maafi mango aur kehke different keywords use karne ko kaho.`
              : `SYSTEM UPDATE: No services found for "${serviceSearchText}". Please apologize and ask the user to use different keywords.`;
        }
      }

      // --- ALWAYS RE-POPULATE service_type/service_name from services.json ---
      // This fixes the case where AI's merge overwrites service_type with null
      // on subsequent turns (service search is skipped because service_id exists).
      if (currentData.service_id && !currentData.service_type) {
        const knownService = servicesData.find(
          (s) =>
            s._id === currentData.service_id ||
            (s._id && s._id.$oid === currentData.service_id),
        );
        if (knownService) {
          currentData.service_type =
            knownService.service_type || "tradesman_based";
          if (!currentData.service_name) {
            currentData.service_name = knownService.name;
          }
          if (!currentData.duration_hours && knownService.duration) {
            currentData.duration_hours = knownService.duration;
          }
          console.log(
            `SERVER: Re-populated service_type="${currentData.service_type}" for existing service_id="${currentData.service_id}"`,
          );
        }
      }

      // --- COMPUTE END TIME FROM START TIME + DURATION ---
      // Try to parse duration_hours from AI or user message
      if (!currentData.duration_hours && currentData.duration_hours !== 0) {
        // Try from user message
        const durationMatch = userMessage.match(
          /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h|ghanta|ghante)/i,
        );
        if (durationMatch) {
          currentData.duration_hours = parseFloat(durationMatch[1]);
        }
        // Also check for minutes
        const minutesMatch = userMessage.match(
          /(\d+)\s*(?:minutes?|mins?|m(?!\w))/i,
        );
        if (minutesMatch && !durationMatch) {
          currentData.duration_hours = parseInt(minutesMatch[1]) / 60;
        }
      }

      // Compute end_time = start_time + duration
      if (currentData.start_time && !currentData.end_time) {
        let durationMins = null;

        // Priority 1: explicit duration_hours from AI or user
        if (currentData.duration_hours) {
          durationMins = Math.round(currentData.duration_hours * 60);
        }
        // Priority 2: service's default duration
        else if (currentData.service_id) {
          const service = getServiceById(currentData.service_id);
          if (service && service.duration) {
            durationMins =
              service.duration >= 1 && service.duration <= 24
                ? service.duration * 60 // duration is in hours
                : service.duration; // duration is in minutes
            currentData.duration_hours = durationMins / 60;
          }
        }
        // Priority 3: try parsing duration from user message
        else {
          const parsedEndTime = parseDuration(
            userMessage,
            currentData.start_time,
          );
          if (parsedEndTime) {
            currentData.end_time = parsedEndTime;
          }
        }

        if (durationMins && !currentData.end_time) {
          const [h, m] = currentData.start_time.split(":").map(Number);
          const startMins = h * 60 + m;
          const endMins = startMins + durationMins;
          const endH = Math.floor(endMins / 60) % 24;
          const endM = endMins % 60;
          currentData.end_time = `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
          console.log(
            `SERVER: Computed end_time = "${currentData.end_time}" from start "${currentData.start_time}" + ${durationMins} mins`,
          );
        }
      }

      // Set defaults for count fields based on service_type in booking mode
      if (currentData.phase === "booking" && currentData.service_type) {
        if (currentData.service_type === "customer_based") {
          if (
            !currentData.number_of_customers &&
            currentData.number_of_customers !== 0
          ) {
            // Don't default yet — ask the user
          }
          // Default tradesmen to 1 for customer_based
          if (!currentData.number_of_tradesmen) {
            currentData.number_of_tradesmen = 1;
          }
        } else if (currentData.service_type === "tradesman_based") {
          if (
            !currentData.number_of_tradesmen &&
            currentData.number_of_tradesmen !== 0
          ) {
            // Don't default yet — ask the user
          }
          // Default customers to 1 for tradesman_based
          if (!currentData.number_of_customers) {
            currentData.number_of_customers = 1;
          }
        }
      }

      // DEFAULT: Assume automatic location unless user explicitly said "manual" or provided an address
      if (!currentData.booking_mode && currentData.phase === "booking") {
        currentData.booking_mode = "automatic";
        if (!currentData.location) {
          currentData.location = "USE_DEVICE_LOCATION";
        }
      }

      // Sanitize suggested_options
      if (
        currentData.suggested_options &&
        !Array.isArray(currentData.suggested_options)
      ) {
        currentData.suggested_options = [];
      } else if (
        currentData.suggested_options &&
        Array.isArray(currentData.suggested_options)
      ) {
        const validOptions = currentData.suggested_options.filter(
          (opt) => typeof opt === "object" && opt !== null,
        );
        if (validOptions.length !== currentData.suggested_options.length) {
          currentData.suggested_options = [];
        }
      }

      // --- AVAILABILITY CHECK ---
      if (
        currentData.phase === "booking" &&
        currentData.preferred_date &&
        currentData.start_time &&
        currentData.end_time
      ) {
        const isFree = await checkAvailability(
          currentData.preferred_date,
          currentData.start_time,
          currentData.end_time,
        );

        if (!isFree) {
          const suggestions = await findNearestSlots(
            currentData.preferred_date,
          );
          currentData.start_time = null;
          currentData.end_time = null;
          currentData.booking_ready = false;
          currentData.allFieldsCollected = false;
          currentData.suggested_options = suggestions;
          currentData.phase = "time_selection";

          const suggestionText = suggestions
            .map((s) => `${s.start_time} on ${s.date}`)
            .join(", ");

          systemUpdateMessage =
            userLanguage === "urdu"
              ? `SYSTEM UPDATE: Requested time available nahin hai.
Nearest available slots: ${suggestionText}.
User ko ye available times batao aur koi ek choose karne ko kaho.`
              : `SYSTEM UPDATE: The requested time is UNAVAILABLE.
Nearest available slots: ${suggestionText}.
Tell the user these available times and ask them to pick one.`;
        }
      }

      // --- PASS 3: RE-PROMPT (If needed) ---
      let finalData = currentData;

      if (systemUpdateMessage) {
        console.log(
          "Triggering Re-Prompt with System Update:",
          systemUpdateMessage,
        );

        const payloadPass2 = [
          ...payloadPass1,
          { role: "assistant", content: aiResponseText1 },
          { role: "system", content: systemUpdateMessage },
        ];

        const result2 = await callGroqWithFallback(groqClient, {
          model: BOOKING_MODEL,
          messages: payloadPass2,
          max_tokens: 2048,
          temperature: 0.7,
        });

        const aiResponseText2 = result2.choices[0]?.message?.content || "";
        const parsedResponse2 = parseAIResponse(aiResponseText2);

        finalResponseText = parsedResponse2.message || aiResponseText2;

        // Merge but PROTECT server-set values (service_id, phase, times)
        const aiNewData = parsedResponse2.extracted_data || {};
        // Don't let AI overwrite server-detected service_id with null
        if (currentData.service_id && !aiNewData.service_id) {
          delete aiNewData.service_id;
        }
        // Don't let AI overwrite server-set phase
        if (currentData.phase) {
          delete aiNewData.phase;
        }
        // Don't let AI overwrite normalized times
        if (
          currentData.start_time &&
          !/^\d{2}:\d{2}$/.test(aiNewData.start_time || "")
        ) {
          delete aiNewData.start_time;
        }
        if (currentData.end_time && !aiNewData.end_time) {
          delete aiNewData.end_time;
        }
        // Check if user is selecting a service option (fixed: use userMessage and local fn)
        if (currentData.service_id && !currentData.service_option) {
          const selectedOption = parseServiceOptionSelection(
            userMessage,
            currentData.service_id,
          );
          if (selectedOption) {
            aiNewData.service_option = selectedOption;
            console.log("SERVICE OPTION SELECTED (pass2):", selectedOption);
          }
        }

        // Don't let AI overwrite server-populated service_option with null
        if (currentData.service_option && !aiNewData.service_option) {
          delete aiNewData.service_option;
        }

        finalData = ConversationDataSource.mergeExtractedData(
          currentData,
          aiNewData,
        );
      }

      // --- FINALIZATION ---
      // Determine required fields based on service_type
      const serviceType = finalData.service_type || "tradesman_based";
      const hasCountField =
        serviceType === "customer_based"
          ? finalData.number_of_customers || finalData.number_of_customers === 0
          : finalData.number_of_tradesmen ||
            finalData.number_of_tradesmen === 0;

      const hasAllRequiredFields =
        finalData.phase === "booking" &&
        finalData.service_id &&
        finalData.preferred_date &&
        finalData.start_time &&
        // finalData.end_time &&
        hasCountField &&
        // service_option must be explicitly selected before proceeding
        !!finalData.service_option;

      // Debug logging for field collection
      console.log("=== FIELD COLLECTION DEBUG ===");
      console.log("finalData.phase:", finalData.phase);
      console.log("finalData.service_id:", finalData.service_id);
      console.log("finalData.service_name:", finalData.service_name);
      console.log("finalData.service_type:", finalData.service_type);
      console.log(
        "finalData.problem_description:",
        finalData.problem_description,
      );
      console.log("finalData.preferred_date:", finalData.preferred_date);
      console.log("finalData.start_time:", finalData.start_time);
      console.log("finalData.end_time:", finalData.end_time);
      console.log("finalData.duration_hours:", finalData.duration_hours);
      console.log(
        "finalData.number_of_customers:",
        finalData.number_of_customers,
      );
      console.log(
        "finalData.number_of_tradesmen:",
        finalData.number_of_tradesmen,
      );
      console.log("finalData.service_option:", finalData.service_option);
      console.log("hasAllRequiredFields:", hasAllRequiredFields);
      console.log("==============================");

      // Ensure location is automatically set for booking mode
      if (finalData.phase === "booking" && !finalData.location) {
        finalData.location = "USE_DEVICE_LOCATION";
      }

      if (hasAllRequiredFields) {
        finalData.booking_ready = true;
        finalData.allFieldsCollected = true;
        console.log(
          "✅ ALL FIELDS COLLECTED - Setting allFieldsCollected = true",
        );

        // Set booking mode if not already set
        if (!finalData.booking_mode) {
          finalData.booking_mode = "automatic";
        }
      } else {
        finalData.booking_ready = false;
        finalData.allFieldsCollected = false;
        console.log("❌ Missing fields - Setting allFieldsCollected = false");
      }

      // When all fields are collected, modify the final response to indicate completion
      if (finalData.allFieldsCollected) {
        console.log(
          "🎉 OVERRIDING AI RESPONSE - All fields collected, showing completion message",
        );
        const serviceDetails = getServiceById(finalData.service_id);
        const serviceName = serviceDetails
          ? serviceDetails.name.toLowerCase()
          : "service";

        const countInfo =
          serviceType === "customer_based"
            ? userLanguage === "urdu"
              ? `${finalData.number_of_customers} log present honge`
              : `${finalData.number_of_customers} person(s) will be present`
            : userLanguage === "urdu"
              ? `${finalData.number_of_tradesmen} worker(s) aayenge`
              : `${finalData.number_of_tradesmen} worker(s) will come`;

        finalResponseText =
          userLanguage === "urdu"
            ? `Perfect! Maine aapke liye saari details collect kar li hain. ${serviceName} ${finalData.preferred_date} ko ${finalData.start_time} se ${finalData.end_time} tak aur ${countInfo}.`
            : `Perfect! I've collected all the details. ${serviceName} on ${finalData.preferred_date} from ${finalData.start_time} to ${finalData.end_time}, and ${countInfo}.`;
      } else if (
        finalData.service_option &&
        !lastExtractedData?.service_option
      ) {
        // Service option was just selected in this turn — confirm and ask next missing field
        const nextQ = getNextMissingFieldQuestion(finalData, userLanguage);
        const optionLabel = finalData.service_option.label;
        if (userLanguage === "urdu") {
          finalResponseText = `"${optionLabel}" option select ho gaya. ${nextQ || "Shukriya!"}`;
        } else {
          finalResponseText = `Got it! You've selected "${optionLabel}". ${nextQ || "Let's move forward with the booking."}`;
        }
        console.log("✅ SERVICE OPTION CONFIRMED - Overriding AI response");
      }

      const checkoutUrl = generateCheckoutUrl(finalData);

      // Save Assistant Message
      await ConversationDataSource.addMessage({
        conversationId,
        role: "assistant",
        content: finalResponseText,
        extractedData: finalData,
      });

      // Update Status
      if (finalData.phase === "booking") {
        await ConversationDataSource.updateConversationStatus(
          conversationId,
          "booking_initiated",
        );
      }

      // Handle automatic booking
      if (finalData.booking_ready && finalData.booking_mode === "automatic") {
        if (userId && finalData.location !== "USE_DEVICE_LOCATION") {
          const bookingResult = await executeAutomaticBooking(
            finalData,
            userId,
          );
          if (bookingResult.success) {
            await ConversationDataSource.updateConversationStatus(
              conversationId,
              "booking_completed",
            );
            return {
              success: true,
              message: "Booking Successful",
              content: finalResponseText,
              extracted_data: finalData,
              available_services: availableServices,
              checkout_url: null,
              booking_id: bookingResult.data._id,
              booking_success: true,
              allFieldsCollected: true,
            };
          }
        }
      }

      // Final validation - ensure response doesn't ask for location
      if (
        locationAsks.some((term) =>
          finalResponseText.toLowerCase().includes(term.toLowerCase()),
        )
      ) {
        console.warn("Final response contains location request, correcting");
        finalResponseText =
          userLanguage === "urdu"
            ? "Main aapki booking ke liye aur details collect kar raha hun. Kya aur kuch specify karne chahte hain?"
            : "I'm collecting details for your booking. Is there anything else you'd like to specify?";
      }

      // Clean response from any technical data that might have leaked through
      finalResponseText = cleanResponseFromTechnicalData(finalResponseText);

      // Prevent repetitive responses
      const lastTwoMessages = conversationHistory.slice(-2);
      if (lastTwoMessages.length === 2) {
        const lastBotMessage =
          lastTwoMessages.find((m) => m.role === "assistant")?.content || "";
        if (
          lastBotMessage.toLowerCase().includes("i need a few more details") &&
          finalResponseText.toLowerCase().includes("i need a few more details")
        ) {
          const nextQuestion = getNextMissingFieldQuestion(
            finalData,
            userLanguage,
          );
          if (nextQuestion) {
            finalResponseText = nextQuestion;
          } else {
            finalResponseText =
              userLanguage === "urdu"
                ? "Lagta hai sab details mil gayi hain. Kya booking confirm karein?"
                : "It looks like we have all the details. Shall I confirm the booking?";
          }
        }
      }

      // Check if we need to show service options
      // Only show if: service identified, no option selected yet, AND user is NOT in the process of selecting
      let serviceOptions = null;
      if (finalData.service_id && !finalData.service_option) {
        // Don't re-show options if the user's message was a selection attempt
        const wasSelectionAttempt = !!parseServiceOptionSelection(
          userMessage,
          finalData.service_id,
        );

        if (!wasSelectionAttempt) {
          const service = servicesData.find(
            (s) => s._id === finalData.service_id,
          );
          if (service && service.prices && service.prices.length > 0) {
            serviceOptions = service.prices.map((price) => ({
              _id: price._id,
              label: price.label,
              price: price.price,
            }));

            // Update the response to include service options
            if (serviceOptions.length > 1) {
              const optionsText = serviceOptions
                .map((opt, idx) => `${idx + 1}. ${opt.label} - Rs${opt.price}`)
                .join("\n");

              if (userLanguage === "urdu") {
                finalResponseText = `${finalData.service_name} service ke liye ye options hain:\n\n${optionsText}\n\nKaunsa option chunna chahenge?`;
              } else {
                finalResponseText = `For ${finalData.service_name} service, here are your options:\n\n${optionsText}\n\nWhich option would you like to choose?`;
              }
            }
          }
        } else {
          // User attempted a selection but parsing still failed (no match found)
          // Show options again with a prompt to clarify
          const service = servicesData.find(
            (s) => s._id === finalData.service_id,
          );
          if (service && service.prices && service.prices.length > 0) {
            serviceOptions = service.prices.map((price) => ({
              _id: price._id,
              label: price.label,
              price: price.price,
            }));
          }
          // finalResponseText stays as-is from AI (it should already handle this)
        }
      }

      return {
        success: true,
        message: "Response generated",
        content: finalResponseText,
        extracted_data: finalData,
        available_services: availableServices,
        service_options: serviceOptions,
        checkout_url: checkoutUrl,
        booking_id: null,
        booking_success: false,
        allFieldsCollected: finalData.allFieldsCollected || false,
      };
    } catch (error) {
      console.error("processBookingMessage error:", error);
      return {
        success: false,
        message: error.message,
        content:
          "I'm sorry, I encountered an internal error. Please try again.",
        extracted_data: null,
        available_services: [],
        checkout_url: null,
        allFieldsCollected: false,
      };
    }
  },

  /**
   * Create automatic booking for nearest option
   */
  async createAutomaticBooking(
    conversationId,
    userId,
    date,
    time,
    serviceId,
    location,
    numberOfCustomers = 1,
    numberOfTradesmen = 1,
  ) {
    try {
      // Extract service info
      const service = getServiceById(serviceId);
      if (!service) {
        throw new Error("Service not found");
      }

      // Calculate end time based on service duration
      const [startHours, startMinutes] = time.split(":").map(Number);
      const durationMins = service.duration || 60;
      const endMins = startHours * 60 + startMinutes + durationMins;
      const endHours = Math.floor(endMins / 60) % 24;
      const endMinutes = endMins % 60;
      const endTime = `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;

      const bookingInput = {
        user: userId,
        service: serviceId,
        date: date,
        day: getDayFromDate(date),
        startTime: buildDateTime(date, time),
        endTime: buildDateTime(date, endTime),
        address: location === "automatic" ? "USE_DEVICE_LOCATION" : location,
        userTradesmanChoice: "automatic",
        number_of_tradesman: numberOfTradesmen, // New field
        number_of_customers: numberOfCustomers, // New field
        user_instructions: `Auto-booked nearest available slot for ${service.name}`,
        service_option: null, // will be set if a choice was provided earlier
      };

      console.log("Creating automatic booking:", bookingInput);

      const result = await BookingService.createBooking(bookingInput);

      if (result.success) {
        // Update conversation status
        await ConversationDataSource.updateConversationStatus(
          conversationId,
          "booking_completed",
        );

        return {
          success: true,
          bookingId: result.data._id,
          message: "Booking created successfully",
        };
      } else {
        throw new Error(result.message || "Failed to create booking");
      }
    } catch (error) {
      console.error("createAutomaticBooking error:", error);
      return {
        success: false,
        message: error.message || "Failed to create automatic booking",
      };
    }
  },

  /**
   * Two-stage image analysis for booking.
   * Stage 1 (Eyes): Maverick describes the image factually.
   * Stage 2 (Brain): processBookingMessage uses the observation for diagnosis.
   */
  async analyzeImageForBooking(
    conversationId,
    imageUrl,
    userMessage = "",
    userId = null,
  ) {
    try {
      const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

      // --- STAGE 1: Eyes (Maverick) — visual observation ---
      console.log("🔍 STAGE 1 (Eyes): Analyzing image with Maverick...");

      const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

      const visionMessages = [
        VISION_INSPECTION_PROMPT,
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userMessage
                ? `User says: "${userMessage}". Describe what you see in the image.`
                : "Describe what you see in the image.",
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ];

      const visionResult = await callGroqWithFallback(groqClient, {
        model: VISION_MODEL,
        messages: visionMessages,
        max_tokens: 512,
        temperature: 0.3,
      });

      const observation =
        visionResult.choices[0]?.message?.content ||
        "Unable to analyze the image.";
      console.log("👁️ Maverick observation:", observation);

      // Save user message with image reference
      await ConversationDataSource.addMessage({
        conversationId,
        role: "user",
        content: userMessage || "[Image uploaded]",
        imageUrl: imageUrl,
      });

      // --- STAGE 2: Brain (Llama-3.3) — diagnosis via existing flow ---
      console.log(
        "🧠 STAGE 2 (Brain): Passing observation to booking pipeline...",
      );

      // Compose a combined message that includes the visual observation
      const combinedMessage = `[VISUAL OBSERVATION FROM IMAGE]\n${observation}\n\n[USER MESSAGE]\n${userMessage || "What can you see? Please help."}`;

      // Use the existing processBookingMessage but skip saving the user message
      // since we already saved it above with the image URL
      const result = await this.processBookingMessage(
        conversationId,
        combinedMessage,
        userId,
        { skipUserMessageSave: true },
      );

      return result;
    } catch (error) {
      console.error("analyzeImageForBooking error:", error);
      return {
        success: false,
        message: error.message,
        content:
          "I'm sorry, I couldn't analyze the image. Please try again or describe your issue in text.",
        extracted_data: null,
        available_services: [],
        checkout_url: null,
        allFieldsCollected: false,
      };
    }
  },

  // Export internal helpers if needed, or just these standard methods
  searchServices,
  getServiceById,
  executeAutomaticBooking,
};

module.exports = { AssistantDataSource };
