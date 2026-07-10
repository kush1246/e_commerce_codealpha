const express = require('express');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

const router = express.Router();

// Get comments for a post
router.get('/post/:postId', auth, async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate('author', 'username avatar')
      .populate('likes', 'username')
      .sort({ createdAt: -1 });
    
    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create comment
router.post('/', auth, async (req, res) => {
  try {
    const { content, postId } = req.body;
    
    if (!content || !postId) {
      return res.status(400).json({ message: 'Content and postId are required' });
    }
    
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const comment = new Comment({
      content,
      author: req.user._id,
      post: postId
    });
    
    await comment.save();
    
    // Add comment to post
    post.comments.push(comment._id);
    await post.save();
    
    await comment.populate('author', 'username avatar');
    
    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update comment
router.put('/:id', auth, async (req, res) => {
  try {
    const { content } = req.body;
    
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Check if user is the author
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this comment' });
    }
    
    comment.content = content;
    await comment.save();
    await comment.populate('author', 'username avatar');
    
    res.json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete comment
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Check if user is the author
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }
    
    // Remove comment from post
    await Post.findByIdAndUpdate(comment.post, { $pull: { comments: comment._id } });
    
    await Comment.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Like/Unlike comment
router.post('/:id/like', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    const likeIndex = comment.likes.indexOf(req.user._id);
    
    if (likeIndex === -1) {
      // Like
      comment.likes.push(req.user._id);
    } else {
      // Unlike
      comment.likes.splice(likeIndex, 1);
    }
    
    await comment.save();
    await comment.populate('author', 'username avatar');
    await comment.populate('likes', 'username');
    
    res.json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
