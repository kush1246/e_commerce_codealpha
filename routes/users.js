const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

const router = express.Router();

// Get user profile by username
router.get('/:username', auth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password')
      .populate('followers', 'username avatar')
      .populate('following', 'username avatar');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user's posts
    const posts = await Post.find({ author: user._id })
      .populate('author', 'username avatar')
      .populate('likes', 'username')
      .sort({ createdAt: -1 });
    
    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        followers: user.followers,
        following: user.following,
        followersCount: user.followers.length,
        followingCount: user.following.length
      },
      posts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Follow/Unfollow user
router.post('/:id/follow', auth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }
    
    const currentUser = await User.findById(req.user._id);
    
    const followingIndex = currentUser.following.indexOf(targetUser._id);
    
    if (followingIndex === -1) {
      // Follow
      currentUser.following.push(targetUser._id);
      targetUser.followers.push(currentUser._id);
    } else {
      // Unfollow
      currentUser.following.splice(followingIndex, 1);
      const followerIndex = targetUser.followers.indexOf(currentUser._id);
      if (followerIndex !== -1) {
        targetUser.followers.splice(followerIndex, 1);
      }
    }
    
    await currentUser.save();
    await targetUser.save();
    
    await currentUser.populate('following', 'username avatar');
    await targetUser.populate('followers', 'username avatar');
    
    res.json({
      following: currentUser.following,
      followers: targetUser.followers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { bio, avatar } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;
    
    await user.save();
    
    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (for discovery)
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .limit(20);
    
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
