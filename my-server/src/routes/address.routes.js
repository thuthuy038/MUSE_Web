const express = require('express')
const router = express.Router()

const addressController = require('../../controllers/addressController')

router.post('/add/:userId', addressController.addAddress)

module.exports = router