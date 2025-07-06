import axios from 'axios';
import dotenv from "dotenv";
import LiveClass from '../models/LiveClass.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import User from '../models/User.js';
import { createCourseNotification } from './notificationController.js';

dotenv.config();

// Generate Zoom OAuth Access Token
const generateZoomToken = async () => {
  try {
    if (!process.env.ZOOM_CLIENT_ID || !process.env.ZOOM_CLIENT_SECRET || !process.env.ZOOM_ACCOUNT_ID) {
      throw new Error('ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, or ZOOM_ACCOUNT_ID is missing in .env');
    }
    const response = await axios.post(
      'https://zoom.us/oauth/token',
      null,
      {
        params: {
          grant_type: 'account_credentials',
          account_id: process.env.ZOOM_ACCOUNT_ID,
        },
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    const token = response.data.access_token;
    
    return token;
  } catch (error) {
    console.error('Error generating Zoom OAuth token:', JSON.stringify(error.response?.data || error.message, null, 2));
    throw new Error(`Failed to generate Zoom OAuth token: ${error.response?.data?.message || error.message}`);
  }
};

// Create a live class
export const createLiveClass = async (req, res) => {
  try {
    const { courseId, title, description, startTime, duration } = req.body;
    const instructor = req.user;

    // Validate request body
    if (!courseId || !title || !startTime || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: courseId, title, startTime, duration',
      });
    }

    // Check if user is authorized (Admin or Instructor)
    if (!['admin', 'instructor'].includes(instructor.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only Admins or Instructors can create live classes',
      });
    }

    // Verify course and instructor
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }
    if (instructor.role === 'instructor' && course.instructor.toString() !== instructor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not the instructor of this course',
      });
    }

    // Create Zoom meeting
    const token = await generateZoomToken();
    let zoomResponse;
    try {
      
      zoomResponse = await axios.post(
        'https://api.zoom.us/v2/users/me/meetings',
        {
          topic: title,
          type: 2, // Scheduled meeting
          start_time: new Date(startTime).toISOString(),
          duration: duration,
          timezone: 'UTC',
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: true,
            mute_upon_entry: false,
            watermark: false,
            use_pmi: false,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
    } catch (zoomError) {
      console.error('Zoom API error details:', JSON.stringify(zoomError.response?.data || zoomError.message, null, 2));
      return res.status(500).json({
        success: false,
        message: `Zoom API error: ${zoomError.response?.status || 500} - ${zoomError.response?.data?.message || zoomError.message}`,
      });
    }

    // Create live class in database
    const liveClass = await LiveClass.create({
      course: courseId,
      instructor: instructor._id,
      title,
      description,
      zoomMeetingId: zoomResponse.data.id.toString(),
      startUrl: zoomResponse.data.start_url,
      joinUrl: zoomResponse.data.join_url,
      startTime: new Date(startTime),
      duration,
    });

    // Generate notifications for enrolled students
    try {
      const notificationData = {
        title: `New Live Class: ${title}`,
        message: `A new live class "${title}" has been scheduled for ${course.title} on ${new Date(startTime).toLocaleString()}. Join the class to participate!`,
        type: 'course',
        actionUrl: liveClass.joinUrl // Use Zoom joinUrl directly
      };

      // Call createCourseNotification and capture the response
      const notificationResponse = await new Promise((resolve, reject) => {
        createCourseNotification(
          { 
            params: { courseId }, 
            body: notificationData,
            user: req.user 
          },
          { 
            status: () => ({
              json: (data) => resolve(data) // Capture the response data
            })
          },
          (error) => reject(error)
        );
      });

      
    } catch (notificationError) {
      console.error('Failed to create notifications for live class:', JSON.stringify(notificationError, null, 2));
      // Note: Not throwing an error to allow live class creation to succeed even if notifications fail
    }

    res.status(201).json({
      success: true,
      data: liveClass,
      message: 'Live class created successfully',
    });
  } catch (error) {
    console.error('Create live class error:', JSON.stringify(error, null, 2));
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create live class',
    });
  }
};

// Get live classes for a course
export const getLiveClasses = async (req, res) => {
  try {
    const { courseId } = req.params;
    const user = req.user;

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check if user is authorized (Admin, Instructor, or enrolled Student)
    const isAuthorized =
      user.role === 'admin' ||
      (user.role === 'instructor' && course.instructor.toString() === user._id.toString()) ||
      (user.role === 'student' &&
        (await Enrollment.findOne({ course: courseId, student: user._id, status: { $in: ['active', 'completed'] } })));

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view live classes for this course',
      });
    }

    const liveClasses = await LiveClass.find({ course: courseId })
      .populate('instructor', 'firstName lastName')
      .sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      data: liveClasses,
      message: 'Live classes retrieved successfully',
    });
  } catch (error) {
    console.error('Get live classes error:', JSON.stringify(error, null, 2));
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve live classes',
    });
  }
};

// Join a live class
export const joinLiveClass = async (req, res) => {
  try {
    const { liveClassId } = req.params;
    const user = req.user;

    const liveClass = await LiveClass.findById(liveClassId).populate('course');
    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found',
      });
    }

    // Check if user is authorized (Admin, Instructor, or enrolled Student with status 'active' or 'completed')
    const isAuthorized =
      user.role === 'admin' ||
      user.role === 'instructor' ||
      (user.role === 'student' &&
        (await Enrollment.findOne({
          course: liveClass.course._id,
          student: user._id,
          status: { $in: ['active', 'completed'] },
        })));

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to join this live class',
      });
    }

    // Return startUrl for instructor/admin, joinUrl for student
    const url = user.role === 'instructor' || user.role === 'admin' ? liveClass.startUrl : liveClass.joinUrl;

    res.status(200).json({
      success: true,
      data: { url },
      message: 'Live class join URL retrieved successfully',
    });
  } catch (error) {
    console.error('Join live class error:', JSON.stringify(error, null, 2));
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to join live class',
    });
  }
};
