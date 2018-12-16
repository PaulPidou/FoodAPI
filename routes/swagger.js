import fs from 'fs'
import express from 'express'
import swaggerUi from 'swagger-ui-dist'
import swaggerFile from '../api'
const router = express.Router()
const pathToSwaggerUi = swaggerUi.absolutePath()
const indexContent = fs.readFileSync(`${pathToSwaggerUi}/index.html`).
    toString().
    replace('https://petstore.swagger.io/v2/swagger.json', 'api.json')


router.get(['', '/', '/index.html'], (req, res) => res.send(indexContent))
router.use(express.static(pathToSwaggerUi))
router.use('/api.json', (req, res) => res.send(swaggerFile))

export default router
