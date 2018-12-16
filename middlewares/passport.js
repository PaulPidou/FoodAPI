import passport from 'passport'
import LocalStrategy from 'passport-local'
import passportJWT from 'passport-jwt'
import User from '../models/user'

import config from '../config'

const JWTStrategy   = passportJWT.Strategy
const ExtractJWT = passportJWT.ExtractJwt

passport.use(new LocalStrategy.Strategy({
        usernameField: 'email',
        passwordField: 'password'
    },
    function (email, password, done) {
        User.findOne({ email: email }, function(err, user) {
            if (err) { return done(err) }
            if (!user) {
                return done(null, false, { message: 'Incorrect username' })
            }
            user.comparePassword(password, function(err, isMatch) {
                if (err) throw err
                if (!isMatch) {
                    return done(null, false, { message: 'Incorrect password' })
                }
                return done(null, user)
            })
        })
    }
))

passport.use(new JWTStrategy({
        jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
        secretOrKey: config.secret
    },
    function (jwtPayload, cb) {
        return User.findOne({ email: jwtPayload.email })
            .then(user => {
                return cb(null, user)
            })
            .catch(err => {
                return cb(err)
            })
    }
))