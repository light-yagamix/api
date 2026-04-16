const JWT = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  try {
    const token = req.headers["token"];

    if (token) {
      const decoded = JWT.verify(token, process.env.JWT_SECRET);
      if (decoded) {
        req.user = {
          _id: decoded._id,
          email: decoded.email,
          role: decoded.role,
        };
      } else {
        req.user = null;
      }
    }

    next();
  } catch (err) {
    console.log(err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authenticate;
