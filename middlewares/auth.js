import log4js from 'log4js'

const logger = log4js.getLogger('AUTH')
logger.level = 'debug'

exports.isAdmin = function(req, res, next) {
    if(req.user.isAdmin) {
        return next()
    } else {
        return res.status(401).json({
            message: 'Unauthorized'
        })
    }
}

