import log from 'log4js'

const logger = log.getLogger()
logger.level = 'debug'

export default function (req, res, next) {
    req.logger = logger
    logger.info(req.method + " " + req.originalUrl)
    next()
}
