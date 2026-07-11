require('dotenv').config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../src/models/User');

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

/* =========================
   GOOGLE LOGIN
========================= */

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {

      let user = await User.findOne({ email: profile.emails[0].value });
      if (!user) {
        user = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          password: 'oauth', // placeholder
          role: 'customer', avatar: {
            url: profile.photos?.[0]?.value,
            public_id: 'google'
          },

          googleId: profile.id // Lưu googleId
        });
      } else {
        // Nếu user đã tồn tại nhưng chưa có googleId, cập nhật
        if (!user.googleId) {
          user.googleId = profile.id;
          await user.save();
        }
      }

      return done(null, user);

    } catch (err) {
      return done(err, null);
    }
  }));


module.exports = passport;