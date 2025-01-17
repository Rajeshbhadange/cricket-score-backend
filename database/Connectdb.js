const mongoose = require("mongoose");

const connectToDB = () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then((data) => {
      console.log("connected to database");
    })
    .catch((err) => {
      console.log(err.message);
    });
};

module.exports = connectToDB;
