require("dotenv").config(); // must be first, before anything else

const express = require("express");
const cors = require("cors");
const compression = require("compression");
const { expressMiddleware } = require("@apollo/server/express4");
const { createApolloGraphqlServer, context } = require("./backend/graphqlServer");
const authenticate = require("./backend/middleware");

const init = async () => {
  try {
    const app = express();

    app.use(express.json({ limit: "50mb" }));
    app.use(express.urlencoded({ limit: "50mb", extended: true }));

    app.use(
      cors({
        origin: function (origin, callback) {
          if (!origin) return callback(null, true);
          return callback(null, true);
        },
        credentials: true,
      })
    );

    app.use(compression({ threshold: 10 * 1024 }));

    app.get("/", (req, res) => {
      res.json({ message: "Server is up and running" });
    });

    app.use(authenticate);

    const apolloServer = await createApolloGraphqlServer();
    app.use("/graphql", expressMiddleware(apolloServer, context));

    const PORT = process.env.PORT || 8000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Error during initialization", err);
    process.exit(1);
  }
};

init();
