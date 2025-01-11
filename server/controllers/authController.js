const EmailValidateCheck = require("../helpers/emailValidate");
const userModel = require("../model/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const SendOtp = require("../helpers/sendOtp");

const registrationController = async (req, res) => {
  let { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(404).send({ error: "Field Is Required" });
  }

  if (!EmailValidateCheck(email)) {
    return res.status(404).send({ error: "Invalid Email" });
  }
  const existingUser = await userModel.findOne({ email });

  if (existingUser) {
    return res.status(404).send({ error: "Email Already In Use" });
  }

  try {
    bcrypt.hash(password, 10, async function (err, hash) {
      const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
      if (err) {
        console.log(err);
      } else {
        const user = new userModel({
          name,
          email,
          password: hash,
          role,
        });
        await user.save();
        let sendOtp = await userModel.findOneAndUpdate(
          { email },
          { $set: { otp: verifyCode } },
          { new: true }
        );
        setTimeout(async () => {
          let sendOtp = await userModel.findOneAndUpdate(
            { email },
            { $set: { otp: null } },
            { new: true }
          );
        }, 10000);
        SendOtp(email, verifyCode);
        return res
          .status(201)
          .send({ success: true, message: "Signup Successfully", data: user });
      }
    });
  } catch (error) {
    return res.status(404).send({ error });
  }
};
const loginController = async (req, res) => {
  let { email, password } = req.body;
  const existingUser = await userModel.findOne({ email });
  if (existingUser) {
    bcrypt.compare(password, existingUser.password, function (err, result) {
      if (result) {
        if (existingUser.role === "user") {
          let loginUserInfo = {
            id: existingUser._id,
            name: existingUser.name,
            email: existingUser.email,
            role: existingUser.role,
          };

          const token = jwt.sign({ loginUserInfo }, process.env.PRV_TOKEN, {
            expiresIn: "24h",
          });
          res.cookie("token", token, {
            httpOnly: true,
            secure: false,
          });
          return res.status(200).send({
            success: "User Login Successfully",
            data: loginUserInfo,
            token,
          });
        } else if (existingUser.role === "admin") {
          let loginUserInfo = {
            id: existingUser._id,
            name: existingUser.name,
            email: existingUser.email,
            role: existingUser.role,
          };

          const token = jwt.sign({ loginUserInfo }, process.env.PRV_TOKEN, {
            expiresIn: "1m",
          });
          res.cookie("token", token, {
            httpOnly: true,
            secure: false,
          });
          return res.status(200).send({
            success: "Admin Login Successfully",
            data: loginUserInfo,
            token,
          });
        }
      } else {
        return res.status(404).send({ error: "Invalid Email or Password" });
      }
    });
  } else {
    return res.status(404).send({ error: "You Have Don't Any Account" });
  }
};
const allUser = async (req, res) => {
  let allUser = await userModel.find({});
  return res
    .status(200)
    .send({ success: true, message: "All User Patch", data: allUser });
};
module.exports = { registrationController, loginController, allUser };
