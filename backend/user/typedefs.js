const typedefs = `
  type User {
    _id: String
    first_name: String
    last_name: String
    email: String
    age: Int
    role: String
    gender: String
    cnic: String
    profile_picture: String
    cnic_front_image: String
    cnic_back_image: String
    street: String
    state: String
    postal_code: String
    country: String
    city: String
    addresses: [Address]
    location: UserLocation
    timings: [UserTimings]
    phone: String
    avatar: String
    bio: String
    created_at: String
    updated_at: String
    status: String
    account_status: String
    skills: [Service]
    avg_rating: Float
    verified: [String]
    job_counts: Int
    experience: Int
    isFeatured: Boolean
    student_id: String
    school_id: String
    skills_rating: [SkillsRating]
    online: Boolean 
    lastSeen: String
    deviceTokens:[String]
    score: Int
    profileScore: Int
    subscriptionScore: Int
    totalScore: Int
    activeSubscription: ActiveSubscription
    profileCompletion: ProfileCompletion
  }
  
  type ActiveSubscription {
    planId: String
    planName: String
    tier: String  
    points: Int
    activatedAt: String
    expiresAt: String
    status: String
  }


  type SkillsRating {
  school_id: Int
  student_id: Int
  section_id: String
  rating: Float
  skill_id: Service
  }

  input SkillsRatingInput {
  school_id: Int
  student_id: Int
  section_id: String
  rating: Float
  skill_id: String
  }


  type Address {
    _id: String
    city: String
    flat: String
    full_address: String
    is_default: Boolean
    location: UserLocation
  }

  input AddressInput {
    city: String
    flat: String
    full_address: String
    is_default: Boolean
    location: UserLocationInput
  }

  input UpdateAddressInput {
    id: String
    city: String
    flat: String
    full_address: String
    is_default: Boolean
    location: UserLocationInput
  }

  type UserLocation {
    type: String
    coordinates: [Float]
  }

  input UserLocationInput {
    type: String
    coordinates: [Float]
  }

  type UserTimings {
    day: String
    from: String
    to: String
  }

  input UserTimingsInput {
    day: String
    from: String
    to: String
  }

  type UserUpdateUserResponse {
    success: Boolean
    message: String
    data: User
  }

  type UserCreateUserResponse {
    success: Boolean!
    message: String!
    data: String!
  }

  type UserTokenResponse {
    success: Boolean
    message: String
    data: String
  }

  type UserGetUserTokenResponse {
    success: Boolean
    message: String
    data: UserLoginUserResponse
  }

  type UserLoginUserResponse {
    verified: [String]
    token: String
  }

  type GetAllUsersResponse {
    success: Boolean!
    message: String!
    data: [User]
    pageInfo: PageInfo
  }

  type PageInfo {
    totalRecords: Int
    totalPages: Int
    currentPage: Int
    hasNextPage: Boolean
    hasPreviousPage: Boolean
  }

  input UserFilterInput {
    first_name: String
    email: String
    role: String
    verified: [String]
    status: String
    skills: [String]
    isFeatured: Boolean
    job_counts: Int
    dateRange: String
  }

  type GetUserResponse {
    success: Boolean
    message: String
    data: User
  }

  type MissingField {
    field: String!
    points: Int!
    description: String!
  }

  type ProfileCompletion {
    score: Int!
    percentage: Float!
    isComplete: Boolean!
    minimumScore: Int!
    totalMissingPoints: Int!
    missing: [MissingField!]!
  }

   type GetAllNearbyTradesmanResponse {
  success: Boolean!
  message: String!
  data: [User]!
  pageInfo: PageInfo
}
   type Notification {
   id: String!
   message: String!
   userId: String!
   createdAt: String!
}

   type NotificationResponse {
   success: Boolean!
   message: String!
   data: Notification
}

  type PurchaseSubscriptionResponse {
    success: Boolean!
    message: String!
    data: SubscriptionPurchase
  }

  type SubscriptionPurchase {
    userId: String!
    planId: String!
    tier: String
    pointsAdded: Int!
    newScore: Int!
    purchasedAt: String!
  }
`;

module.exports.typedefs = typedefs;
