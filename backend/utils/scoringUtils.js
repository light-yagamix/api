/**
 * Scoring System Utility
 * Distributes points across profile fields to reach a minimum of 15 points
 */

// Define the point value for each field
const FIELD_POINTS = {
  first_name: 3,
  last_name: 2,
  cnic: 2,
  profile_picture: 1,
  age: 1,
  gender: 1,
  email: 2,
  phone: 2,
  addresses: 2,
  bio: 1,
  skills: 2,
  experience: 1,
  cnic_front_image: 1,
  cnic_back_image: 1,
};

// Minimum total score for a complete profile
const MINIMUM_SCORE = 15;

/**
 * Check if a field value is valid (not empty, not null, not undefined)
 * @param {*} value - The field value to check
 * @returns {boolean} - True if field has a valid value
 */
function isFieldComplete(field, value) {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  // Handle arrays - must have at least one item
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  // Handle strings - must have at least one character
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  // Handle numbers - age must be > 0
  if (field === "age" && typeof value === "number") {
    return value > 0;
  }

  return true;
}

/**
 * Get the point value for a specific field if it's complete
 * @param {string} field - The field name
 * @param {*} value - The field value
 * @returns {number} - Points earned for this field (0 if field is incomplete)
 */
function getScoreForField(field, value) {
  const points = FIELD_POINTS[field] || 0;
  return isFieldComplete(field, value) ? points : 0;
}

/**
 * Calculate the PROFILE score based on a user object
 * This calculates score from profile completion fields only (0-15 points)
 * Does NOT include subscription score
 * @param {Object} user - The user object with all profile fields
 * @returns {number} - The total calculated profile score (0-15)
 */
function calculateScore(user) {
  if (!user || typeof user !== 'object') {
    return 0;
  }

  let totalScore = 0;

  // Calculate score for each defined field
  for (const [field, points] of Object.entries(FIELD_POINTS)) {
    if (user[field] !== undefined) {
      totalScore += getScoreForField(field, user[field]);
    }
  }

  return Math.min(totalScore, MINIMUM_SCORE);
}

/**
 * Calculate the TOTAL score including both profile and subscription
 * This is the primary function to use for displaying user's complete score
 * @param {Object} user - The user object
 * @returns {number} - Total score (profileScore + subscriptionScore)
 */
function calculateTotalScore(user) {
  if (!user || typeof user !== 'object') {
    return 0;
  }

  // Use the separated score fields if they exist
  const profileScore = typeof user.profileScore === 'number' 
    ? user.profileScore 
    : calculateScore(user);
    
  const subscriptionScore = user.subscriptionScore || 0;
  
  return profileScore + subscriptionScore;
}

/**
 * Get the completion percentage based on current score
 * @param {number} currentScore - The current user score
 * @returns {number} - Percentage of completion (0-100)
 */
function getCompletionPercentage(currentScore) {
  return Math.min((currentScore / MINIMUM_SCORE) * 100, 100);
}

/**
 * Get missing fields that would increase the score
 * @param {Object} user - The user object
 * @returns {Array} - Array of { field, points, description }
 */
function getMissingFields(user) {
  const missing = [];

  for (const [field, points] of Object.entries(FIELD_POINTS)) {
    if (!isFieldComplete(field, user[field])) {
      let description = "";
      switch (field) {
        case "first_name":
          description = "Add your first name";
          break;
        case "last_name":
          description = "Add your last name";
          break;
        case "cnic":
          description = "Add your CNIC";
          break;
        case "profile_picture":
          description = "Upload a profile picture";
          break;
        case "age":
          description = "Add your age";
          break;
        case "gender":
          description = "Select your gender";
          break;
        case "email":
          description = "Add your email";
          break;
        case "phone":
          description = "Add your phone number";
          break;
        case "addresses":
          description = "Add at least one address";
          break;
        case "bio":
          description = "Add a bio";
          break;
        case "skills":
          description = "Add your skills";
          break;
        case "experience":
          description = "Add your years of experience";
          break;
        case "cnic_front_image":
          description = "Upload CNIC front image";
          break;
        case "cnic_back_image":
          description = "Upload CNIC back image";
          break;
        default:
          description = `Complete ${field}`;
      }

      missing.push({
        field,
        points,
        description,
      });
    }
  }

  return missing.sort((a, b) => b.points - a.points);
}

/**
 * Get a summary of the user's profile completion status
 * @param {Object} user - The user object
 * @returns {Object} - Summary object with score, percentage, and missing fields
 */
function getProfileCompletionSummary(user) {
  const score = calculateScore(user);
  const percentage = getCompletionPercentage(score);
  const missing = getMissingFields(user);
  const isComplete = score >= MINIMUM_SCORE;

  return {
    score,
    percentage,
    isComplete,
    minimumScore: MINIMUM_SCORE,
    missing,
    totalMissingPoints: Math.max(0, MINIMUM_SCORE - score),
  };
}

module.exports = {
  FIELD_POINTS,
  MINIMUM_SCORE,
  isFieldComplete,
  getScoreForField,
  calculateScore,
  calculateTotalScore,
  getCompletionPercentage,
  getMissingFields,
  getProfileCompletionSummary,
};
