/**
 * Service search utilities for the Skillo AI assistant.
 * All service lookups use the local services.json file as the single source of truth.
 */

const servicesData = require("../assistant/services.json");

// Pre-build a Map for O(1) ID lookups
const servicesByIdMap = new Map();
const validServices = servicesData.filter((s) => s._id && s.name);
validServices.forEach((s) => servicesByIdMap.set(s._id, s));

/**
 * Keyword extraction mappings for service category detection.
 */
const KEYWORD_MAPPINGS = {
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
  ac: ["ac", "air conditioner", "cooling", "hvac", "air conditioning", "cold"],
  appliance: [
    "appliance",
    "refrigerator",
    "fridge",
    "washing machine",
    "microwave",
    "oven",
  ],
};

/**
 * Extract relevant keywords from a problem description.
 * @param {string} problemDescription
 * @returns {string[]}
 */
function extractKeywords(problemDescription) {
  if (!problemDescription) return [];

  const text = problemDescription.toLowerCase();
  const keywords = [];

  for (const [service, words] of Object.entries(KEYWORD_MAPPINGS)) {
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
 * Search services by problem description using relevance scoring.
 * @param {string} problemDescription
 * @returns {Array} Top 5 matching services sorted by relevance
 */
function searchServices(problemDescription) {
  if (!problemDescription || typeof problemDescription !== "string") {
    return [];
  }

  const keywords = extractKeywords(problemDescription);
  if (keywords.length === 0) return [];

  const searchQuery = problemDescription.toLowerCase().trim();
  const keywordSet = new Set(keywords.map((k) => k.toLowerCase()));
  const results = [];

  for (const service of validServices) {
    let relevanceScore = 0;
    const serviceName = service.name.toLowerCase();
    const serviceDesc = (service.description || "").toLowerCase();
    const serviceKeywords = service.keywords || [];

    if (serviceName === searchQuery) {
      relevanceScore = 1.0;
    } else if (
      serviceName.includes(searchQuery) ||
      searchQuery.includes(serviceName)
    ) {
      relevanceScore = 0.9;
    } else if (
      serviceKeywords.some(
        (kw) =>
          typeof kw === "string" &&
          (kw.toLowerCase() === searchQuery ||
            kw.toLowerCase().includes(searchQuery)),
      )
    ) {
      relevanceScore = 0.8;
    } else if (serviceDesc.includes(searchQuery)) {
      relevanceScore = 0.6;
    } else {
      const matchingKws = serviceKeywords.filter(
        (kw) => typeof kw === "string" && keywordSet.has(kw.toLowerCase()),
      );
      if (matchingKws.length > 0) {
        relevanceScore = 0.4 + (matchingKws.length / keywordSet.size) * 0.3;
      }
    }

    if (relevanceScore > 0) {
      results.push({
        _id: service._id,
        name: service.name,
        description: service.description,
        duration: service.duration,
        keywords: service.keywords,
        prices: service.prices || [],
        service_type: service.service_type || "tradesman_based",
        relevanceScore,
      });
    }
  }

  return results
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5);
}

/**
 * Get a service by its ID (O(1) lookup).
 * @param {string} serviceId
 * @returns {Object|null}
 */
function getServiceById(serviceId) {
  if (!serviceId) return null;
  return servicesByIdMap.get(serviceId) || null;
}

/**
 * Get compact service list for AI prompt context (ID → Name only).
 * @returns {string}
 */
function getServiceMappingForPrompt() {
  return validServices.map((s) => `${s._id}: ${s.name}`).join("\n");
}

/**
 * Get count of valid services.
 * @returns {number}
 */
function getServiceCount() {
  return validServices.length;
}

module.exports = {
  extractKeywords,
  searchServices,
  getServiceById,
  getServiceMappingForPrompt,
  getServiceCount,
};
