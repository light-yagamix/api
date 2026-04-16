const { User } = require("./user");
const { Service } = require("./service");
const { Category } = require("./category");
const { SubCategory } = require("./sub-category");
const { Addon } = require("./addon");
const { Booking } = require("./booking");
const { TimeSlot } = require("./timeslot");
const { Payment } = require("./payment");
const { Blog } = require("./blog");
const { s3Service } = require("./s3Service");
const { Notification } = require("./notification");
const { Rating } = require("./rating");
const Subscription = require("./subscription");
const { Assistant } = require("./assistant");
const AIChat = require("./aiChat");
const TradesmanChat = require("./tradesmanChat");


const schema = {
  typeDefs: `#graphql
     
    ${User.typedefs} 

    ${Service.typedefs}

    ${Addon.typedefs}

    ${Category.typedefs}

    ${SubCategory.typedefs}

    ${Booking.typedefs}

    ${TimeSlot.typedefs}

    
    ${Payment.typedefs}

    ${Blog.typedefs}

    ${Notification.typedefs}

    ${Rating.typedefs}

    ${Subscription.typedefs}

    ${Assistant.typedefs}

    ${AIChat.typedefs}

    ${TradesmanChat.typedefs}
 


    type Response {
      success: Boolean
      message: String 
    }

    type Query {
      ${User.queries} 
      ${Service.queries}
      ${Addon.queries}
      ${Category.queries}
      ${SubCategory.queries}
      ${Booking.queries}
      ${TimeSlot.queries}
      ${Payment.queries}
      ${Blog.queries} 
      ${Notification.queries}
      ${Rating.queries}
      ${Subscription.queries}
      ${Assistant.queries}
      ${AIChat.queries}
      ${TradesmanChat.queries}
    }

    type Mutation {
      ${User.mutations}
      ${Service.mutations}
      ${Addon.mutations}
      ${Category.mutations}
      ${SubCategory.mutations}
      ${Booking.mutations}
      ${TimeSlot.mutations}
      ${Payment.mutations}
      ${Blog.mutations}
      ${s3Service.mutations}
      ${Notification.mutations}
      ${Rating.mutations}
      ${Subscription.mutations}
      ${Assistant.mutations}
      ${AIChat.mutations}
      ${TradesmanChat.mutations}
    }
    `,

  resolvers: {
    Query: {
      ...User.resolvers.queries,
      ...Service.resolvers.queries,
      ...Addon.resolvers.queries,
      ...Category.resolvers.queries,
      ...SubCategory.resolvers.queries,
      ...Booking.resolvers.queries,
      ...TimeSlot.resolvers.queries,
      ...Payment.resolvers.queries,
      ...Blog.resolvers.queries,
      ...Notification.resolvers.queries,
      ...Rating.resolvers.queries,
      ...Subscription.resolvers.Query,
      ...Assistant.resolvers.queries,
      ...AIChat.resolvers.queries,
      ...TradesmanChat.resolvers.queries,
    },
    Mutation: {
      ...User.resolvers.mutations,
      ...Service.resolvers.mutations,
      ...Addon.resolvers.mutations,
      ...Category.resolvers.mutations,
      ...SubCategory.resolvers.mutations,
      ...Booking.resolvers.mutations,
      ...TimeSlot.resolvers.mutations,
      ...Payment.resolvers.mutations,
      ...Blog.resolvers.mutations,
      ...s3Service.resolvers.mutations,
      ...Notification.resolvers.mutations,
      ...Rating.resolvers.mutations,
      ...Subscription.resolvers.Mutation,
      ...Assistant.resolvers.mutations,
      ...AIChat.resolvers.mutations,
      ...TradesmanChat.resolvers.mutations,
    },
  },
  introspection: true,
  formatError: (err) => ({
    message: err.message,
    success: false,
  }),
};

module.exports = schema;
