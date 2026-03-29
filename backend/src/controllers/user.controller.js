import { User } from "../models/user.model.js";
import httpStatus from "http-status";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Meeting } from "../models/meeting.model.js";

// Keep this in environment variables in production deployments.
const JWT_SECRET = process.env.JWT_SECRET || "replace-this-in-production";
const JWT_EXPIRES_IN = "7d";

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .json({ message: "email and password are required" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "user not found for this email" });
    }
    let isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (isPasswordCorrect) {
      // Issue a signed JWT instead of persisting random tokens in DB.
      const token = jwt.sign(
        {
          userId: user._id.toString(),
          username: user.username,
          email: user.email,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return res.status(httpStatus.OK).json({ token });
    } else {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .json({ message: "invalid email or password" });
    }
  } catch (e) {
    return res.status(500).json({ message: `something went wrong ${e}` });
  }
};

const register = async (req, res) => {
  const { email, username, password } = req.body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !username || !password) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .json({ message: "email, username and password are required" });
  }

  if (!emailRegex.test(email)) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .json({ message: "please provide a valid email" });
  }

  try {
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (existingUser) {
      return res
        .status(httpStatus.FOUND)
        .json({ message: "user already exists with this username or email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email: email,
      username: username,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(httpStatus.CREATED).json({ message: "User registered" });
  } catch (e) {
    res.json({ message: `something went wrong ${e}` });
  }
};

const getUserHistory = async (req, res) => {
  try {
    // req.user is populated by JWT middleware.
    const meetings = await Meeting.find({ user_id: req.user.username });
    res.json(meetings);
  } catch (e) {
    res.json({ message: `something went wrong ${e}` });
  }
};
const addToHistory = async (req, res) => {
  const { meeting_code } = req.body;

  try {
    const newMeeting = new Meeting({
      user_id: req.user.username,
      meetingCode: meeting_code,
    });
    await newMeeting.save();
    res.status(httpStatus.CREATED).json({ message: "Added to history" });
  } catch (e) {
    res.json({ message: `something went wrong ${e}` });
  }
};
export { login, register, getUserHistory, addToHistory };
