'use strict';

/**
 * StudyGen AI — History Routes
 *
 * Base path: /api/history
 * All routes protected.
 */

const express = require('express');
const historyController = require('../controllers/historyController');
const { protect } = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.use(protect);

router.get('/', historyController.getHistory);
router.get('/:id', validateObjectId('id'), historyController.getHistoryById);
router.delete('/:id', validateObjectId('id'), historyController.deleteHistory);

module.exports = router;
