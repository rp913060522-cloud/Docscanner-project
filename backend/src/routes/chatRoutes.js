'use strict';

/**
 * StudyGen AI — Chat Routes
 *
 * Base path: /api/chats
 * All routes protected.
 */

const express = require('express');
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.use(protect);

router.post('/', chatController.createChat);
router.get('/', chatController.getChats);
router.get('/:id', validateObjectId('id'), chatController.getChatById);
router.post('/:id/messages', validateObjectId('id'), chatController.addMessage);
router.delete('/:id', validateObjectId('id'), chatController.deleteChat);

module.exports = router;
