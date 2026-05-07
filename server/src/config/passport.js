const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  try {
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) return done(null, false, { message: 'Invalid email or password' });
    const ok = await user.comparePassword(password);
    if (!ok)   return done(null, false, { message: 'Invalid email or password' });
    user.lastLoginAt = new Date();
    await user.save();
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try { done(null, await User.findById(id)); }
  catch (err) { done(err); }
});

module.exports = passport;
