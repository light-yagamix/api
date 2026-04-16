const mutations = `#graphql
  createUser(
    first_name: String,
    last_name: String,
    email: String,
    password: String,
    confirm_password: String,
    phone: String,
    age: Int,
    role: String,
    gender: String,
    cnic: String,
    profile_picture: String,
    cnic_front_image: String,
    cnic_back_image: String,
    street: String,
    state: String,
    postal_code: String,
    country: String,
    city: String,
    addresses: [AddressInput]
    location: UserLocationInput,
    website: String,
    company: String,
    avatar: String,
    bio: String,
    status: String,
    account_status: String,
    skills: [String],
    job_counts: Int,
    experience: Int,
    isFeatured: Boolean,
    student_id: String,
    school_id: String
    skills_rating: [SkillsRatingInput]
  ): UserCreateUserResponse

  addSkillsRating(input: SkillsRatingInput!, userId: String): Response

  addAddress(input: AddressInput!, userId: String): Response
  updateAddress(input: UpdateAddressInput!, userId: String): Response
  deleteAddressById(addressId: String!, userId: String): Response
  
  updateUser(
    _id: String!,
    first_name: String,
    last_name: String,
    email: String,
    password: String,
    confirm_password: String,
    phone: String,
    age: Int,
    role: String,
    gender: String,
    cnic: String,
    profile_picture: String,
    cnic_front_image: String,
    cnic_back_image: String,
    street: String,
    state: String,
    postal_code: String,
    country: String,
    city: String,
    addresses: [AddressInput]
    timings: [UserTimingsInput],
    location: UserLocationInput,
    website: String,
    company: String,
    avator: String,
    bio: String,
    status: String,
    account_status: String,
    skills: [String],
    job_counts: Int,
    experience: Int,
    isFeatured: Boolean,
    student_id: String,
    school_id: String
    verified: [String],
    skills_rating: [SkillsRatingInput]
  ): UserUpdateUserResponse

  setTradesmanOnlineStatus(online: Boolean!): Response
  setUserOnlineStatus(online: Boolean!): Response

  verifyUser(phone: String, email: String,): UserTokenResponse

  verifyOtp(phone: String, email: String, otp: String!): UserGetUserTokenResponse

  resendVerificationEmail(email: String!): Response

  forgotPassword(email: String!): Response

  resetPassword(email: String!, otp: String!, password: String!, confirm_password: String!): UserTokenResponse

  changePassword(old_password: String!, new_password: String!): Response

  deleteUserById(id: String!): Response
 
  getUserToken(email: String, phone: String, password: String): UserGetUserTokenResponse

  saveDeviceToken(token: String!): Response

  sendNotification(userId: String!, message: String!): NotificationResponse!

  purchaseSubscription(userId: String!, planId: String!): PurchaseSubscriptionResponse!
  
`;
module.exports.mutations = mutations;
