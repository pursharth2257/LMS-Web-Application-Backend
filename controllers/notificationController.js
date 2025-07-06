import asyncHandler from 'express-async-handler';
import Notification from '../models/Notification.js';
import Enrollment from '../models/Enrollment.js';

// @desc    Create a new notification
// @route   POST /api/v1/notifications
// @access  Private (Admin/Instructor)
const createNotification = asyncHandler(async (req, res) => {
  const { user, title, message, type, relatedEntity, relatedEntityModel, actionUrl } = req.body;

  const notification = await Notification.create({
    user,
    title,
    message,
    type,
    relatedEntity,
    relatedEntityModel,
    actionUrl
  });

  res.status(201).json({
    success: true,
    data: notification
  });
});


const createCourseNotification = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { title, message, type, actionUrl } = req.body;

  // Validate input
  if (!title || !message || !type) {
    res.status(400);
    throw new Error('Title, message, and type are required');
  }

  // Ensure type is valid
  if (!['system', 'course', 'payment', 'support', 'announcement'].includes(type)) {
    res.status(400);
    throw new Error('Invalid notification type');
  }

  // Find all enrolled students for the course
  const enrollments = await Enrollment.find({ course: courseId, status: 'active' })
    .select('student');

  if (!enrollments.length) {
    res.status(404);
    throw new Error('No students enrolled in this course');
  }

  // Create notifications for each enrolled student
  const notifications = enrollments.map(enrollment => ({
    user: enrollment.student,
    title,
    message,
    type,
    relatedEntity: courseId,
    relatedEntityModel: 'Course',
    actionUrl: actionUrl || `http://localhost:6600/courses/${courseId}`
  }));

  // Bulk insert notifications
  const createdNotifications = await Notification.insertMany(notifications);

  res.status(201).json({
    success: true,
    data: createdNotifications,
    message: `Notifications created for ${createdNotifications.length} students`
  });
});

// @desc    Get all notifications for a user
// @route   GET /api/v1/notifications
// @access  Private
const getUserNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, isRead } = req.query;
  const query = { user: req.user._id };

  if (isRead !== undefined) {
    query.isRead = isRead === 'true';
  }

  const notifications = await Notification.find(query)
    .populate('user', 'firstName lastName')
    .populate('relatedEntity')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Notification.countDocuments(query);

  res.status(200).json({
    success: true,
    data: notifications,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  });
});


// @desc    Get notifications for a specific course for the authenticated user
// @route   GET /api/v1/notifications/course/:courseId
// @access  Private
const getCourseNotifications = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { page = 1, limit = 10, isRead } = req.query;

  // Verify user is enrolled in the course
  const enrollment = await Enrollment.findOne({
    course: courseId,
    student: req.user._id,
    status: 'active'
  });

  if (!enrollment) {
    res.status(403);
    throw new Error('User is not enrolled in this course');
  }

  const query = {
    user: req.user._id,
    relatedEntity: courseId,
    relatedEntityModel: 'Course'
  };

  if (isRead !== undefined) {
    query.isRead = isRead === 'true';
  }

  const notifications = await Notification.find(query)
    .populate('user', 'firstName lastName')
    .populate('relatedEntity', 'title')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Notification.countDocuments(query);

  res.status(200).json({
    success: true,
    data: notifications,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Mark a notification as read
// @route   PUT /api/v1/notifications/:id
// @access  Private
const markNotificationAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }

  if (notification.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this notification');
  }

  notification.isRead = true;
  notification.readAt = Date.now();
  await notification.save();

  res.status(200).json({
    success: true,
    data: notification
  });
});

// @desc    Mark all notifications as read for a user
// @route   PUT /api/v1/notifications/mark-all-read
// @access  Private
const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { isRead: true, readAt: Date.now() }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read'
  });
});

// @desc    Delete a notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }

  if (notification.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this notification');
  }

  await Notification.deleteOne({ _id: req.params.id });

  res.status(200).json({
    success: true,
    message: 'Notification deleted'
  });
});

// @desc    Delete all notifications for a user
// @route   DELETE /api/v1/notifications/delete-all
// @access  Private
const deleteAllNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ user: req.user._id });

  res.status(200).json({
    success: true,
    message: 'All notifications deleted'
  });
});

export {
  createNotification,
  createCourseNotification,
  getUserNotifications,
  getCourseNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications
};