import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import passport from "passport"
import log from 'log4js'
import logger from './middlewares/logger'
import './middlewares/passport'
import { isAdmin } from './middlewares/auth'

import swagger from './routes/swagger'
import api_user from './routes/api_user'
import api_public from './routes/api_public'
import api_admin from './routes/api_admin'


// mongoose
const mongodb = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017'

const options = {
    dbName: 'food_db',
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    autoIndex: false, // Don't build indexes
    poolSize: 10, // Maintain up to 10 socket connections
    // If not connected, return errors immediately rather than waiting for reconnect
    bufferMaxEntries: 0,
    family: 4 // Use IPv4, skip trying IPv6,
}

const connectWithRetry = () => {
    log.getLogger().info('MongoDB connection with retry')
    mongoose.connect(mongodb, options).then(() => {
        log.getLogger().info('MongoDB is connected')
    }).catch(err => {
        log.getLogger().info('MongoDB connection unsuccessful, retry after 5 seconds.')
        log.getLogger().info(err)
        setTimeout(connectWithRetry, 5000)
    })
}

connectWithRetry()

const app = express()

app.use(logger)
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(passport.initialize())

// routes
const router = express.Router()
router.head('', function(req, res) { res.json() })
app.use('/', router)

app.use('/swagger', swagger)
app.use('/api/public', api_public)
app.use('/api/user', passport.authenticate('jwt', {session: false}), api_user)
app.use('/api/admin', [passport.authenticate('jwt', {session: false}), isAdmin], api_admin)


// eslint-disable-next-line no-unused-vars
app.use(function (err, req, res, next) {
    req.logger.error(err.stack)
    res.status(500).send('Something broke!')
})

export default app
