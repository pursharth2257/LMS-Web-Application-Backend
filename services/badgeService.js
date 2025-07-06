import Badge from '../models/Badge.js';
import User from '../models/User.js';

export const checkAndAssignBadges = async (userId) => {
  const user = await User.findById(userId)
    .populate('completedCourses', '_id')  
    .populate('badges', '_id')           
    .lean();                             

  if (!user) return;

  const allBadges = await Badge.find({ isActive: true });
  const earnedBadgeIds = user.badges.map(b => b._id.toString());
  const completedCourses = user.completedCourses?.map(c => c._id.toString()) || [];
  const assessmentResults = user.assessmentResults || [];

  const newlyEarnedBadges = [];

  for (const badge of allBadges) {
    if (earnedBadgeIds.includes(badge._id.toString())) continue;

    let qualifies = false;

    
    if (badge.criteria === 'course_completion') {
      if (badge.course) {
        if (completedCourses.includes(badge.course.toString())) {
          qualifies = true;
        }
      } else {
        if (completedCourses.length >= badge.threshold) {
          qualifies = true;
        }
      }
    }

    else if (badge.criteria === 'assessment_score') {
      const passedCount = assessmentResults.filter(result => {
        if (!result.totalPoints || result.totalPoints === 0) return false;
        const percentage = (result.score / result.totalPoints) * 100;

        const meetsScore = badge.minScore ? percentage >= badge.minScore : true;
        const courseMatch = badge.course ? result.course.toString() === badge.course.toString() : true;

        return result.passed && meetsScore && courseMatch;
      }).length;

      if (passedCount >= badge.threshold) {
        qualifies = true;
      }
    }
    if (qualifies) {
      newlyEarnedBadges.push(badge._id);
      console.log(`Badge assigned: ${badge.name} to user ${userId}`);
    }
  }

  if (newlyEarnedBadges.length > 0) {
    await User.findByIdAndUpdate(userId, {
      $addToSet: { badges: { $each: newlyEarnedBadges } }
    });
  }
};
