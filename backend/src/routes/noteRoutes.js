'use strict';

/**
 * StudyGen AI — Note Routes
 *
 * Base path: /api/notes
 * All routes are protected and require authentication via sg_jwt cookie.
 */

const express = require('express');
const noteController = require('../controllers/noteController');
const { protect } = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.use(protect); // Enforce authentication on all note routes

router.post('/', noteController.createNote);
router.get('/', noteController.getNotes);
router.get('/:id', validateObjectId('id'), noteController.getNoteById);
router.put('/:id', validateObjectId('id'), noteController.updateNote);
router.delete('/:id', validateObjectId('id'), noteController.deleteNote);

module.exports = router;
