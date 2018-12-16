import express from 'express'
import User from '../models/user'
import CrudRouter from './crud'
import {authmiddleware} from '../middlewares/auth'

// eslint-disable-next-line
const router = express.Router()
router.use(authmiddleware({
    'private': [
    ],
    'root': [
        {method: /GET/},
        {method: /POST/},
        {method: /PUT/}
    ],
    'none': [
        {method: /DELETE/}
    ]
}))
router.use(CrudRouter(User))

export default router
