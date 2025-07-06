import asyncHandler from 'express-async-handler';
import Content from '../models/Content.js';
import Enrollment from '../models/Enrollment.js';
import Notification from '../models/Notification.js';

// @desc    Update playback position for a video content
// @route   POST /api/v1/content/:contentId/playback
// @access  Private (Student)
const updatePlaybackPosition = asyncHandler(async (req, res) => {
  const { contentId } = req.params;
  const { position, completed } = req.body;

  // Validate input
  if (position === undefined || isNaN(position) || position < 0) {
    res.status(400);
    throw new Error('Valid position (in seconds) is required');
  }

  // Find the content
  const content = await Content.findById(contentId);
  if (!content || content.type !== 'video') {
    res.status(404);
    throw new Error('Video content not found');
  }

  // Verify user is enrolled in the course
  const enrollment = await Enrollment.findOne({
    student: req.user._id,
    course: content.course,
    status: 'active'
  });

  if (!enrollment) {
    res.status(403);
    throw new Error('User is not enrolled in this course');
  }

  // Update or create playback position
  const playbackEntry = content.playbackPositions.find(
    (entry) => entry.student.toString() === req.user._id.toString()
  );

  if (playbackEntry) {
    // Update existing entry
    playbackEntry.position = position;
    playbackEntry.lastAccessed = Date.now();
    if (completed !== undefined) {
      playbackEntry.completed = completed;
    }
  } else {
    // Create new entry
    content.playbackPositions.push({
      student: req.user._id,
      position,
      lastAccessed: Date.now(),
      completed: completed || false
    });
  }

  await content.save();

  // Create notification if video is completed
  if (completed && !playbackEntry?.completed) {
    await Notification.create({
      user: req.user._id,
      title: 'Video Lesson Completed',
      message: `You have completed the video "${content.title}" in your course.`,
      type: 'course',
      relatedEntity: content.course,
      relatedEntityModel: 'Course',
      actionUrl: `http://localhost:6600/courses/${content.course}/content/${contentId}`
    });
  }

  res.status(200).json({
    success: true,
    message: 'Playback position updated',
    data: {
      contentId,
      position,
      completed: completed || playbackEntry?.completed || false
    }
  });
});

// @desc    Get playback position for a video content
// @route   GET /api/v1/content/:contentId/playback
// @access  Private (Student)
const getPlaybackPosition = asyncHandler(async (req, res) => {
  const { contentId } = req.params;

  // Find the content
  const content = await Content.findById(contentId).select('playbackPositions course type');
  if (!content || content.type !== 'video') {
    res.status(404);
    throw new Error('Video content not found');
  }

  // Verify user is enrolled in the course
  const enrollment = await Enrollment.findOne({
    student: req.user._id,
    course: content.course,
    status: 'active'
  });

  if (!enrollment) {
    res.status(403);
    throw new Error('User is not enrolled in this course');
  }

  // Find playback position
  const playbackEntry = content.playbackPositions.find(
    (entry) => entry.student.toString() === req.user._id.toString()
  );

  res.status(200).json({
    success: true,
    data: {
      contentId,
      position: playbackEntry ? playbackEntry.position : 0,
      completed: playbackEntry ? playbackEntry.completed : false,
      lastAccessed: playbackEntry ? playbackEntry.lastAccessed : null
    }
  });
});

export {
  updatePlaybackPosition,
  getPlaybackPosition
};