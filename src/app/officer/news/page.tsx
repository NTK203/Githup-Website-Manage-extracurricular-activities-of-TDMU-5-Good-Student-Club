'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import OfficerNav from '@/components/officer/OfficerNav';
import {
  Newspaper,
  Plus,
  Heart,
  MessageCircle,
  Share2,
  Sparkles,
  Loader2,
  Edit,
  Trash2,
  Search,
  Filter,
  Calendar,
  User,
  Image as ImageIcon,
  X as XIcon,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Clock,
  Send,
  Edit2,
  MoreVertical,
  Camera,
  Download
} from 'lucide-react';

interface NewsPost {
  _id: string;
  title: string;
  content: string;
  imageUrl?: string; // Deprecated, use imageUrls instead
  imageUrls?: string[]; // Array of image URLs (max 10)
  pdfUrl?: string;
  author: {
    _id: string;
    name: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
}

interface Comment {
  _id: string;
  content: string;
  imageUrl?: string;
  author: {
    _id: string;
    name: string;
    avatarUrl?: string;
  };
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
  replies?: Comment[];
}

export default function OfficerNewsPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageUrl: '',
    isPinned: false
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Interaction states
  const [interactingPosts, setInteractingPosts] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [postComments, setPostComments] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, string>>({});
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [showCommentMenu, setShowCommentMenu] = useState<string | null>(null);
  const [showReplyMenu, setShowReplyMenu] = useState<string | null>(null);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [editReplyImages, setEditReplyImages] = useState<Record<string, File | null>>({});
  const [editReplyImagePreviews, setEditReplyImagePreviews] = useState<Record<string, string>>({});
  const [commentImages, setCommentImages] = useState<Record<string, File | null>>({});
  const [commentImagePreviews, setCommentImagePreviews] = useState<Record<string, string>>({});
  const [replyImages, setReplyImages] = useState<Record<string, File | null>>({});
  const [replyImagePreviews, setReplyImagePreviews] = useState<Record<string, string>>({});
  const [editCommentImages, setEditCommentImages] = useState<Record<string, File | null>>({});
  const [editCommentImagePreviews, setEditCommentImagePreviews] = useState<Record<string, string>>({});
  const [postLikes, setPostLikes] = useState<Record<string, Array<{ _id: string; name: string; avatarUrl?: string }>>>({});
  const [showLikesTooltip, setShowLikesTooltip] = useState<string | null>(null);
  const [commentLikes, setCommentLikes] = useState<Record<string, Array<{ _id: string; name: string; avatarUrl?: string }>>>({});
  const [showCommentLikesTooltip, setShowCommentLikesTooltip] = useState<string | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState<string | null>(null);

  // Load theme
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  // Load news posts
  const loadNewsPosts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/news?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.posts) {
          setNewsPosts(data.data.posts);
        }
      } else {
        // For now, use empty array if API doesn't exist
        setNewsPosts([]);
      }
    } catch (error) {
      console.error('Error loading news posts:', error);
      setNewsPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadNewsPosts();
    }
  }, [isAuthenticated]);

  // Auto load comments for all posts when news posts are loaded
  useEffect(() => {
    if (newsPosts.length > 0) {
      // Load comments for all posts with comments in parallel
      const postsWithComments = newsPosts.filter(post => 
        post.commentsCount > 0 && !postComments[post._id]
      );
      
      postsWithComments.forEach(post => {
        loadComments(post._id);
      });
    }
  }, [newsPosts]);

  // Load post likes
  const loadPostLikes = async (postId: string) => {
    try {
      const response = await fetch(`/api/news/${postId}/likes`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.likes) {
          setPostLikes(prev => ({
            ...prev,
            [postId]: data.data.likes
          }));
        }
      }
    } catch (error) {
      console.error('Error loading post likes:', error);
    }
  };

  // Load comment likes
  const loadCommentLikes = async (postId: string, commentId: string) => {
    try {
      const response = await fetch(`/api/news/${postId}/comments/${commentId}/likes`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.users) {
          const key = `${postId}-${commentId}`;
          setCommentLikes(prev => ({
            ...prev,
            [key]: data.data.users
          }));
        }
      }
    } catch (error) {
      console.error('Error loading comment likes:', error);
    }
  };

  // Handle like/unlike post
  const handleLikePost = async (postId: string, isLiked: boolean) => {
    if (interactingPosts.has(postId)) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Vui lòng đăng nhập để thích bài viết');
        return;
      }
      
      setInteractingPosts(prev => new Set(prev).add(postId));

      const response = await fetch(`/api/news/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNewsPosts(prev =>
            prev.map(post =>
              post._id === postId
                ? {
                    ...post,
                    isLiked: !isLiked,
                    likesCount: data.data.likesCount
                  }
                : post
            )
          );
          if (showLikesTooltip === postId) {
            loadPostLikes(postId);
          }
        }
      }
    } catch (error) {
      console.error('Error liking post:', error);
    } finally {
      setInteractingPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  // Load comments for a post
  const loadComments = async (postId: string) => {
    try {
      const token = localStorage.getItem('token');
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/news/${postId}/comments`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.comments) {
          setPostComments(prev => ({
            ...prev,
            [postId]: data.data.comments
          }));
        }
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  // Toggle comments visibility
  const toggleComments = (postId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
        if (!postComments[postId]) {
          loadComments(postId);
        }
        setTimeout(() => {
          const commentsElement = document.getElementById(`comments-${postId}`);
          if (commentsElement) {
            commentsElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
      }
      return newSet;
    });
  };

  // Handle image select for comment
  const handleCommentImageSelect = (postId: string, parentId?: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước ảnh không được vượt quá 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file ảnh');
        return;
      }

      const key = parentId ? `${postId}-${parentId}` : postId;
      
      if (parentId) {
        setReplyImages(prev => ({ ...prev, [key]: file }));
        const preview = URL.createObjectURL(file);
        setReplyImagePreviews(prev => ({ ...prev, [key]: preview }));
      } else {
        setCommentImages(prev => ({ ...prev, [key]: file }));
        const preview = URL.createObjectURL(file);
        setCommentImagePreviews(prev => ({ ...prev, [key]: preview }));
      }
    };
    input.click();
  };

  // Handle remove image from comment
  const handleRemoveCommentImage = (postId: string, parentId?: string) => {
    const key = parentId ? `${postId}-${parentId}` : postId;
    
    if (parentId) {
      setReplyImages(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
      setReplyImagePreviews(prev => {
        const updated = { ...prev };
        if (updated[key]) {
          URL.revokeObjectURL(updated[key]);
        }
        delete updated[key];
        return updated;
      });
    } else {
      setCommentImages(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
      setCommentImagePreviews(prev => {
        const updated = { ...prev };
        if (updated[key]) {
          URL.revokeObjectURL(updated[key]);
        }
        delete updated[key];
        return updated;
      });
    }
  };


  // Handle add comment
  const handleAddComment = async (postId: string, parentId?: string) => {
    const commentText = parentId 
      ? replyingTo[`${postId}-${parentId}`] || ''
      : commentInputs[postId] || '';

    const key = parentId ? `${postId}-${parentId}` : postId;
    const imageFile = parentId ? replyImages[key] : commentImages[key];

    if (!commentText.trim() && !imageFile) {
      alert('Vui lòng nhập nội dung hoặc chọn ảnh');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Vui lòng đăng nhập để bình luận');
        return;
      }

      let imageUrl: string | undefined = undefined;

      if (imageFile) {
        const uploadedUrl = await uploadFile(imageFile, 'image');
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          alert('Lỗi khi tải ảnh lên. Vui lòng thử lại.');
          return;
        }
      }

      const requestBody = {
        content: commentText.trim() || '',
        ...(imageUrl && { imageUrl }),
        ...(parentId && { parentId })
      };

      const response = await fetch(`/api/news/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await loadComments(postId);
          if (parentId) {
            setReplyingTo(prev => {
              const updated = { ...prev };
              delete updated[`${postId}-${parentId}`];
              return updated;
            });
            handleRemoveCommentImage(postId, parentId);
          } else {
            setCommentInputs(prev => {
              const updated = { ...prev };
              delete updated[postId];
              return updated;
            });
            handleRemoveCommentImage(postId);
          }
          setNewsPosts(prev =>
            prev.map(post =>
              post._id === postId
                ? { ...post, commentsCount: post.commentsCount + 1 }
                : post
            )
          );
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Có lỗi xảy ra khi thêm bình luận');
    }
  };

  // Handle delete comment
  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Vui lòng đăng nhập để xóa bình luận');
        return;
      }

      const response = await fetch(`/api/news/${postId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await loadComments(postId);
          setNewsPosts(prev =>
            prev.map(post =>
              post._id === postId
                ? { ...post, commentsCount: Math.max(0, post.commentsCount - 1) }
                : post
            )
          );
        }
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Có lỗi xảy ra khi xóa bình luận');
    }
  };

  // Handle like comment
  const handleLikeComment = async (postId: string, commentId: string, isLiked: boolean) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Vui lòng đăng nhập để thích bình luận');
        return;
      }

      const response = await fetch(`/api/news/${postId}/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await loadComments(postId);
        }
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  // Handle share
  const handleShare = async (postId: string) => {
    const url = `${window.location.origin}/officer/news#${postId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Bản tin CLB',
          text: 'Xem bản tin này từ CLB Sinh viên 5 Tốt TDMU',
          url: url
        });
      } catch (error) {
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Đã sao chép link vào clipboard!');
    }).catch(() => {
      alert('Không thể sao chép link');
    });
  };

  // Filter posts
  const filteredPosts = newsPosts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle image selection (multiple images, max 10)
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      
      if (imageFiles.length === 0) {
        alert('Vui lòng chọn file ảnh hợp lệ');
        return;
      }

      // Check total images (existing + new)
      const totalImages = selectedImages.length + imageFiles.length;
      if (totalImages > 10) {
        alert(`Tối đa 10 ảnh. Bạn đã chọn ${selectedImages.length} ảnh, chỉ có thể thêm ${10 - selectedImages.length} ảnh nữa.`);
        // Only add up to 10 images
        const remainingSlots = 10 - selectedImages.length;
        imageFiles.splice(remainingSlots);
      }

      // Add new images
      const newImages = [...selectedImages, ...imageFiles];
      setSelectedImages(newImages);

      // Create previews for new images
      imageFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Remove image from selection
  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Handle PDF selection
  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        setSelectedPdf(file);
      } else {
        alert('Vui lòng chọn file PDF hợp lệ');
      }
    }
  };

  // Upload file to server
  const uploadFile = async (file: File, type: 'image' | 'pdf'): Promise<string | null> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        return data.data?.secure_url || data.data?.url || null;
      }
      return null;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  // Handle create/edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      let finalImageUrls: string[] = [];
      let pdfUrl: string | undefined = undefined;

      // Upload images if selected
      if (selectedImages.length > 0) {
        for (const imageFile of selectedImages) {
          const uploadedImageUrl = await uploadFile(imageFile, 'image');
          if (uploadedImageUrl) {
            finalImageUrls.push(uploadedImageUrl);
          } else {
            alert('Lỗi khi tải ảnh lên. Vui lòng thử lại.');
            setUploading(false);
            return;
          }
        }
      }

      // If editing and has existing imageUrl, keep it for backward compatibility
      let finalImageUrl: string | undefined = undefined;
      if (editingPost && editingPost.imageUrl && !editingPost.imageUrls) {
        finalImageUrl = editingPost.imageUrl;
      }

      // Upload PDF if selected
      if (selectedPdf) {
        const uploadedPdfUrl = await uploadFile(selectedPdf, 'pdf');
        if (uploadedPdfUrl) {
          pdfUrl = uploadedPdfUrl;
        } else {
          alert('Lỗi khi tải PDF lên. Vui lòng thử lại.');
          setUploading(false);
          return;
        }
      }

      const url = editingPost ? `/api/news/${editingPost._id}` : '/api/news';
      const method = editingPost ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          imageUrl: finalImageUrl || undefined,
          imageUrls: finalImageUrls.length > 0 ? finalImageUrls : undefined,
          pdfUrl: pdfUrl || undefined
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await loadNewsPosts();
        setShowCreateModal(false);
        setEditingPost(null);
        setFormData({ title: '', content: '', imageUrl: '', isPinned: false });
        setSelectedImages([]);
        setSelectedPdf(null);
        setImagePreviews([]);
        const imageInput = document.getElementById('image-upload') as HTMLInputElement;
        const pdfInput = document.getElementById('pdf-upload') as HTMLInputElement;
        if (imageInput) imageInput.value = '';
        if (pdfInput) pdfInput.value = '';
        alert(editingPost ? 'Cập nhật bản tin thành công!' : 'Tạo bản tin thành công!');
      } else {
        alert(data.error || 'Có lỗi xảy ra khi lưu bản tin');
      }
    } catch (error) {
      console.error('Error saving post:', error);
      alert('Có lỗi xảy ra khi lưu bản tin');
    } finally {
      setUploading(false);
    }
  };

  // Handle delete
  const handleDelete = async (postId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bản tin này?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/news/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await loadNewsPosts();
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  // Handle edit
  const handleEdit = (post: NewsPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      imageUrl: post.imageUrl || '',
      isPinned: post.isPinned
    });
    setSelectedImages([]);
    setSelectedPdf(null);
    // Set previews from existing images
    const existingImages = post.imageUrls || (post.imageUrl ? [post.imageUrl] : []);
    setImagePreviews(existingImages);
    setShowCreateModal(true);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <OfficerNav />
      
      <main 
        className={`${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen transition-all duration-300 px-2 sm:px-3 lg:px-4 py-3 sm:py-4 overflow-x-hidden min-w-0`}
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                  <Newspaper className={`w-6 h-6 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Quản lý Bản tin
                  </h1>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Tạo và quản lý các bản tin cho CLB
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingPost(null);
                  setFormData({ title: '', content: '', imageUrl: '', isPinned: false });
                  setShowCreateModal(true);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                <Plus size={18} />
                Tạo bản tin mới
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="Tìm kiếm bản tin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-purple-500`}
              />
            </div>
          </div>

          {/* Posts List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className={`text-center py-12 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <Newspaper className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {searchQuery ? 'Không tìm thấy bản tin nào' : 'Chưa có bản tin nào'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => {
                    setEditingPost(null);
                    setFormData({ title: '', content: '', imageUrl: '', isPinned: false });
                    setShowCreateModal(true);
                  }}
                  className={`mt-4 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isDarkMode
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  Tạo bản tin đầu tiên
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4 max-w-2xl mx-auto">
              {filteredPosts.map((post) => (
                <div
                  key={post._id}
                  className={`rounded-lg overflow-hidden transition-all duration-200 ${
                    isDarkMode ? 'bg-gray-800' : 'bg-white'
                  } ${post.isPinned ? 'ring-2 ring-yellow-500/50' : ''} shadow-sm`}
                >
                  {/* Header - Facebook style */}
                  <div className="px-4 pt-3 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {post.author?.avatarUrl ? (
                          <img
                            src={post.author.avatarUrl}
                            alt={post.author.name}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                          }`}>
                            <User className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {post.author?.name || 'Admin'}
                            </p>
                            {post.isPinned && (
                              <Sparkles className={`w-3.5 h-3.5 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {new Date(post.createdAt).toLocaleString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(post)}
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            isDarkMode
                              ? 'hover:bg-gray-700 text-gray-400 hover:text-purple-400'
                              : 'hover:bg-gray-100 text-gray-500 hover:text-purple-600'
                          }`}
                          title="Chỉnh sửa"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(post._id)}
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            isDarkMode
                              ? 'hover:bg-red-900/20 text-red-400 hover:text-red-300'
                              : 'hover:bg-red-50 text-red-500 hover:text-red-700'
                          }`}
                          title="Xóa"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Content Text */}
                  <div className="px-4 pb-3">
                    <h3 className={`text-base font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {post.title}
                    </h3>
                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {post.content}
                    </p>
                  </div>

                  {/* Images - Display multiple images */}
                  {(post.imageUrls && post.imageUrls.length > 0) || post.imageUrl ? (
                    <div className="w-full space-y-2">
                      {post.imageUrls && post.imageUrls.length > 0 ? (
                        // Display multiple images
                        post.imageUrls.length === 1 ? (
                          <img
                            src={post.imageUrls[0]}
                            alt={post.title}
                            className="w-full h-auto max-h-[400px] object-contain cursor-pointer hover:opacity-90 transition-opacity rounded-lg"
                            onClick={() => setShowImageModal(post.imageUrls![0])}
                          />
                        ) : (
                          <div className={`grid gap-2 ${
                            post.imageUrls.length === 2 ? 'grid-cols-2' :
                            post.imageUrls.length === 3 ? 'grid-cols-3' :
                            post.imageUrls.length === 4 ? 'grid-cols-2' :
                            'grid-cols-2 sm:grid-cols-3'
                          }`}>
                            {post.imageUrls.map((imageUrl, index) => (
                              <div key={index} className="relative">
                                <img
                                  src={imageUrl}
                                  alt={`${post.title} - Ảnh ${index + 1}`}
                                  className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => setShowImageModal(imageUrl)}
                                />
                                {post.imageUrls!.length > 4 && index === 3 && (
                                  <div 
                                    className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center cursor-pointer hover:bg-black/60 transition-colors"
                                    onClick={() => setShowImageModal(post.imageUrls![0])}
                                  >
                                    <span className="text-white font-semibold text-lg">
                                      +{post.imageUrls!.length - 4}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      ) : post.imageUrl ? (
                        // Fallback to single imageUrl for backward compatibility
                        <img
                          src={post.imageUrl}
                          alt={post.title}
                          className="w-full h-auto max-h-[400px] object-contain cursor-pointer hover:opacity-90 transition-opacity rounded-lg"
                          onClick={() => setShowImageModal(post.imageUrl || null)}
                        />
                      ) : null}
                    </div>
                  ) : null}

                  {/* PDF Attachment */}
                  {post.pdfUrl && (
                    <div className={`mx-4 my-3 p-3 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowPdfViewer(post._id);
                        }}
                        type="button"
                        className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity"
                      >
                        <div className={`p-2 rounded ${isDarkMode ? 'bg-red-600/20' : 'bg-red-100'}`}>
                          <FileText className={`w-5 h-5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            File đính kèm PDF
                          </p>
                          <p className={`text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            Nhấn để xem
                          </p>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Reactions and Comments Count */}
                  <div className={`px-4 py-2 border-t ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 relative">
                        <div className={`flex items-center -space-x-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                        </div>
                        <span 
                          className={`cursor-pointer hover:underline ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                          onMouseEnter={() => {
                            if (post.likesCount > 0) {
                              setShowLikesTooltip(post._id);
                              if (!postLikes[post._id]) {
                                loadPostLikes(post._id);
                              }
                            }
                          }}
                          onMouseLeave={() => setShowLikesTooltip(null)}
                        >
                          {post.likesCount || 0}
                        </span>
                        {showLikesTooltip === post._id && postLikes[post._id] && (
                          <div className={`absolute bottom-full left-0 mb-2 z-50 w-64 max-h-80 overflow-y-auto rounded-lg shadow-lg border ${
                            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                          }`}>
                            {postLikes[post._id] && postLikes[post._id].length > 0 ? (
                              <>
                                <div className={`p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {postLikes[post._id].length} người đã thích
                                  </p>
                                </div>
                                <div className="p-2">
                                  {postLikes[post._id]
                                    .sort((a, b) => {
                                      if (a._id === user?._id) return -1;
                                      if (b._id === user?._id) return 1;
                                      return 0;
                                    })
                                    .map((userItem) => (
                                      <div key={userItem._id} className="flex items-center gap-2 p-1.5 rounded hover:bg-opacity-50 ${
                                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                                      }">
                                        {userItem.avatarUrl ? (
                                          <img
                                            src={userItem.avatarUrl}
                                            alt={userItem.name}
                                            className="w-8 h-8 rounded-full object-cover"
                                          />
                                        ) : (
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                            isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                                          }`}>
                                            <User className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                          </div>
                                        )}
                                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} ${
                                          userItem._id === user?._id ? 'font-semibold' : ''
                                        }`}>
                                          {userItem._id === user?._id ? 'Bạn' : userItem.name}
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              </>
                            ) : null}
                          </div>
                        )}
                      </div>
                      <div className={`flex items-center gap-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span 
                          className="cursor-pointer hover:underline"
                          onClick={() => {
                            // Scroll to comments section
                            const commentsElement = document.getElementById(`comments-${post._id}`);
                            if (commentsElement) {
                              commentsElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            } else {
                              // Load comments if not loaded and scroll
                              if (!postComments[post._id] && post.commentsCount > 0) {
                                loadComments(post._id);
                                setTimeout(() => {
                                  const element = document.getElementById(`comments-${post._id}`);
                                  if (element) {
                                    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                  }
                                }, 300);
                              }
                            }
                          }}
                        >
                          {post.commentsCount || 0} bình luận
                        </span>
                        <span>0 lượt chia sẻ</span>
                      </div>
                    </div>
                  </div>

                  {/* Interaction Buttons - Facebook style */}
                  <div className={`px-2 border-t ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <div className="grid grid-cols-3">
                      <button
                        onClick={() => handleLikePost(post._id, post.isLiked || false)}
                        disabled={interactingPosts.has(post._id)}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                          post.isLiked
                            ? isDarkMode
                              ? 'text-red-400'
                              : 'text-red-600'
                            : isDarkMode
                              ? 'text-gray-400 hover:bg-gray-700'
                              : 'text-gray-600 hover:bg-gray-100'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} />
                        <span>Thích</span>
                      </button>
                      <button
                        onClick={() => {
                          // Scroll to comments section instead of toggling
                          const commentsElement = document.getElementById(`comments-${post._id}`);
                          if (commentsElement) {
                            commentsElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          } else {
                            // Load comments if not loaded and scroll
                            if (!postComments[post._id] && post.commentsCount > 0) {
                              loadComments(post._id);
                              setTimeout(() => {
                                const element = document.getElementById(`comments-${post._id}`);
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }
                              }, 300);
                            }
                          }
                        }}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                          isDarkMode
                            ? 'text-gray-400 hover:bg-gray-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span>Bình luận</span>
                      </button>
                      <button
                        onClick={() => handleShare(post._id)}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                          isDarkMode
                            ? 'text-gray-400 hover:bg-gray-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Share2 className="w-5 h-5" />
                        <span>Chia sẻ</span>
                      </button>
                    </div>
                  </div>

                  {/* Comments Section - Always Visible */}
                  <div 
                    id={`comments-${post._id}`}
                    className={`border-t ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}
                  >
                    {/* Comments List */}
                    <div className="px-4 py-3 max-h-[500px] overflow-y-auto">
                      {(() => {
                        const comments = postComments[post._id];
                        
                        // Show loading state if comments count > 0 but comments not loaded yet
                        if (post.commentsCount > 0 && !comments) {
                          return (
                            <div className="flex items-center justify-center py-4">
                              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Đang tải bình luận...
                              </div>
                            </div>
                          );
                        }
                        
                        // Show comments if available
                        if (comments && comments.length > 0) {
                          return (
                            <div className="space-y-4">
                              {comments.map((comment) => (
                              <div key={comment._id} className="space-y-2">
                                {/* Main Comment */}
                                <div className="flex gap-2">
                                  {comment.author?.avatarUrl ? (
                                    <img
                                      src={comment.author.avatarUrl}
                                      alt={comment.author?.name || 'User'}
                                      className="w-8 h-8 rounded-full object-cover"
                                      style={{ flexShrink: 0 }}
                                    />
                                  ) : (
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} style={{ flexShrink: 0 }}>
                                      <User className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className={`rounded-lg px-3 py-2 ${
                                      isDarkMode ? 'bg-gray-700' : 'bg-white'
                                    }`}>
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                          {comment.author?.name || 'User'}
                                        </p>
                                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                          {new Date(comment.createdAt).toLocaleString('vi-VN', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </p>
                                        {(user?._id === comment.author?._id || user?._id === post.author?._id) && (
                                          <div className="relative ml-auto">
                                            <button
                                              onClick={() => setShowCommentMenu(
                                                showCommentMenu === comment._id ? null : comment._id
                                              )}
                                              className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}
                                            >
                                              <MoreVertical className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                            </button>
                                            {showCommentMenu === comment._id && (
                                              <div className={`absolute right-0 top-8 z-10 rounded-lg shadow-lg ${
                                                isDarkMode ? 'bg-gray-700' : 'bg-white'
                                              } border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                                {user?._id === comment.author?._id && (
                                                  <button
                                                    onClick={() => {
                                                      setEditingComment(comment._id);
                                                      setCommentInputs(prev => ({
                                                        ...prev,
                                                        [`edit-${comment._id}`]: comment.content
                                                      }));
                                                      if (comment.imageUrl) {
                                                        setEditCommentImagePreviews(prev => ({
                                                          ...prev,
                                                          [`edit-${comment._id}`]: comment.imageUrl!
                                                        }));
                                                      }
                                                      setShowCommentMenu(null);
                                                    }}
                                                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                                                      isDarkMode
                                                        ? 'hover:bg-gray-600 text-gray-300'
                                                        : 'hover:bg-gray-100 text-gray-700'
                                                    }`}
                                                  >
                                                    <Edit2 className="w-4 h-4" />
                                                    Chỉnh sửa
                                                  </button>
                                                )}
                                                <button
                                                  onClick={() => {
                                                    handleDeleteComment(post._id, comment._id);
                                                    setShowCommentMenu(null);
                                                  }}
                                                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                                                    isDarkMode
                                                      ? 'hover:bg-gray-600 text-red-400'
                                                      : 'hover:bg-gray-100 text-red-600'
                                                  }`}
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                  {user?._id === post.author?._id && user?._id !== comment.author?._id 
                                                    ? 'Xóa bình luận' 
                                                    : 'Xóa'}
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      {editingComment === comment._id ? (
                                        <div className="space-y-2">
                                          <textarea
                                            value={commentInputs[`edit-${comment._id}`] || comment.content}
                                            onChange={(e) => setCommentInputs(prev => ({
                                              ...prev,
                                              [`edit-${comment._id}`]: e.target.value
                                            }))}
                                            className={`w-full px-3 py-2 rounded-lg text-sm resize-none ${
                                              isDarkMode
                                                ? 'bg-gray-800 border-gray-600 text-white'
                                                : 'bg-white border-gray-300 text-gray-900'
                                            } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                            rows={2}
                                          />
                                          {editCommentImagePreviews[`edit-${comment._id}`] && (
                                            <div className="relative inline-block">
                                              <img
                                                src={editCommentImagePreviews[`edit-${comment._id}`]}
                                                alt="Preview"
                                                className="max-h-[200px] rounded-lg object-contain"
                                              />
                                              <button
                                                onClick={() => {
                                                  setEditCommentImages(prev => {
                                                    const updated = { ...prev };
                                                    delete updated[`edit-${comment._id}`];
                                                    return updated;
                                                  });
                                                  setEditCommentImagePreviews(prev => {
                                                    const updated = { ...prev };
                                                    if (updated[`edit-${comment._id}`] && updated[`edit-${comment._id}`].startsWith('blob:')) {
                                                      URL.revokeObjectURL(updated[`edit-${comment._id}`]);
                                                    }
                                                    delete updated[`edit-${comment._id}`];
                                                    return updated;
                                                  });
                                                }}
                                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                              >
                                                <XIcon className="w-4 h-4" />
                                              </button>
                                            </div>
                                          )}
                                          <div className="flex gap-2 items-center">
                                            <button
                                              onClick={() => {
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.accept = 'image/*';
                                                input.onchange = async (e) => {
                                                  const file = (e.target as HTMLInputElement).files?.[0];
                                                  if (!file) return;
                                                  if (file.size > 5 * 1024 * 1024) {
                                                    alert('Kích thước ảnh không được vượt quá 5MB');
                                                    return;
                                                  }
                                                  if (!file.type.startsWith('image/')) {
                                                    alert('Vui lòng chọn file ảnh');
                                                    return;
                                                  }
                                                  setEditCommentImages(prev => ({ ...prev, [`edit-${comment._id}`]: file }));
                                                  const preview = URL.createObjectURL(file);
                                                  setEditCommentImagePreviews(prev => ({ ...prev, [`edit-${comment._id}`]: preview }));
                                                };
                                                input.click();
                                              }}
                                              className={`p-2 rounded-lg transition-colors ${
                                                isDarkMode
                                                  ? 'bg-gray-700 hover:bg-gray-600 text-blue-400 hover:text-blue-300'
                                                  : 'bg-gray-200 hover:bg-gray-300 text-blue-600 hover:text-blue-700'
                                              }`}
                                              title="Thêm/Thay đổi ảnh"
                                            >
                                              <Camera className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={async () => {
                                                const token = localStorage.getItem('token');
                                                if (!token) return;
                                                const editText = commentInputs[`edit-${comment._id}`] || '';
                                                const editImageFile = editCommentImages[`edit-${comment._id}`];
                                                const currentImageUrl = editCommentImagePreviews[`edit-${comment._id}`];

                                                if (!editText.trim() && !editImageFile && !currentImageUrl) {
                                                  alert('Vui lòng nhập nội dung hoặc chọn ảnh');
                                                  return;
                                                }

                                                try {
                                                  let imageUrl: string | undefined = currentImageUrl && !currentImageUrl.startsWith('blob:') ? currentImageUrl : undefined;

                                                  if (editImageFile) {
                                                    const uploadedUrl = await uploadFile(editImageFile, 'image');
                                                    if (uploadedUrl) {
                                                      imageUrl = uploadedUrl;
                                                    } else {
                                                      alert('Lỗi khi tải ảnh lên. Vui lòng thử lại.');
                                                      return;
                                                    }
                                                  }

                                                  const requestBody: any = {
                                                    content: editText.trim() || ''
                                                  };
                                                  if (imageUrl !== undefined) {
                                                    requestBody.imageUrl = imageUrl;
                                                  } else if (editImageFile === null && !currentImageUrl && comment.imageUrl) {
                                                    requestBody.imageUrl = '';
                                                  }

                                                  const response = await fetch(`/api/news/${post._id}/comments/${comment._id}`, {
                                                    method: 'PUT',
                                                    headers: {
                                                      'Authorization': `Bearer ${token}`,
                                                      'Content-Type': 'application/json'
                                                    },
                                                    body: JSON.stringify(requestBody)
                                                  });

                                                  if (response.ok) {
                                                    await loadComments(post._id);
                                                    setEditingComment(null);
                                                    setCommentInputs(prev => {
                                                      const updated = { ...prev };
                                                      delete updated[`edit-${comment._id}`];
                                                      return updated;
                                                    });
                                                    setEditCommentImages(prev => {
                                                      const updated = { ...prev };
                                                      delete updated[`edit-${comment._id}`];
                                                      return updated;
                                                    });
                                                    setEditCommentImagePreviews(prev => {
                                                      const updated = { ...prev };
                                                      if (updated[`edit-${comment._id}`] && updated[`edit-${comment._id}`].startsWith('blob:')) {
                                                        URL.revokeObjectURL(updated[`edit-${comment._id}`]);
                                                      }
                                                      delete updated[`edit-${comment._id}`];
                                                      return updated;
                                                    });
                                                  }
                                                } catch (error) {
                                                  console.error('Error updating comment:', error);
                                                }
                                              }}
                                              className={`px-3 py-1 rounded text-sm font-medium ${
                                                isDarkMode
                                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                                              }`}
                                            >
                                              Lưu
                                            </button>
                                            <button
                                              onClick={() => {
                                                setEditingComment(null);
                                                setCommentInputs(prev => {
                                                  const updated = { ...prev };
                                                  delete updated[`edit-${comment._id}`];
                                                  return updated;
                                                });
                                                setEditCommentImages(prev => {
                                                  const updated = { ...prev };
                                                  delete updated[`edit-${comment._id}`];
                                                  return updated;
                                                });
                                                setEditCommentImagePreviews(prev => {
                                                  const updated = { ...prev };
                                                  if (updated[`edit-${comment._id}`] && updated[`edit-${comment._id}`].startsWith('blob:')) {
                                                    URL.revokeObjectURL(updated[`edit-${comment._id}`]);
                                                  }
                                                  delete updated[`edit-${comment._id}`];
                                                  return updated;
                                                });
                                              }}
                                              className={`px-3 py-1 rounded text-sm font-medium ${
                                                isDarkMode
                                                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                              }`}
                                            >
                                              Hủy
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          {comment.content && (
                                            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                              {comment.content}
                                            </p>
                                          )}
                                          {comment.imageUrl && (
                                            <div className="mt-2">
                                              <img
                                                src={comment.imageUrl}
                                                alt="Comment attachment"
                                                className="max-w-full max-h-[300px] rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                                onClick={() => setShowImageModal(comment.imageUrl || null)}
                                              />
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-4 mt-1 ml-11">
                                      <div className="relative">
                                        <button
                                          onClick={() => handleLikeComment(post._id, comment._id, comment.isLiked)}
                                          onMouseEnter={() => {
                                            if (comment.likesCount > 0) {
                                              const key = `${post._id}-${comment._id}`;
                                              setShowCommentLikesTooltip(key);
                                              if (!commentLikes[key]) {
                                                loadCommentLikes(post._id, comment._id);
                                              }
                                            }
                                          }}
                                          onMouseLeave={() => setShowCommentLikesTooltip(null)}
                                          className={`flex items-center gap-1 text-xs ${
                                            comment.isLiked
                                              ? isDarkMode ? 'text-red-400' : 'text-red-600'
                                              : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                          }`}
                                        >
                                          <Heart className={`w-3.5 h-3.5 ${comment.isLiked ? 'fill-current' : ''}`} />
                                          <span>{comment.likesCount}</span>
                                        </button>
                                        {showCommentLikesTooltip === `${post._id}-${comment._id}` && commentLikes[`${post._id}-${comment._id}`] && (
                                          <div className={`absolute bottom-full left-0 mb-2 z-50 w-64 max-h-80 overflow-y-auto rounded-lg shadow-lg border ${
                                            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                                          }`}>
                                            {commentLikes[`${post._id}-${comment._id}`] && commentLikes[`${post._id}-${comment._id}`].length > 0 ? (
                                              <>
                                                <div className={`p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                    {commentLikes[`${post._id}-${comment._id}`].length} người đã thích
                                                  </p>
                                                </div>
                                                <div className="p-2">
                                                  {commentLikes[`${post._id}-${comment._id}`]
                                                    .sort((a, b) => {
                                                      if (a._id === user?._id) return -1;
                                                      if (b._id === user?._id) return 1;
                                                      return 0;
                                                    })
                                                    .map((userItem) => (
                                                      <div key={userItem._id} className="flex items-center gap-2 p-1.5 rounded hover:bg-opacity-50 ${
                                                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                                                      }">
                                                        {userItem.avatarUrl ? (
                                                          <img
                                                            src={userItem.avatarUrl}
                                                            alt={userItem.name}
                                                            className="w-8 h-8 rounded-full object-cover"
                                                          />
                                                        ) : (
                                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                            isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                                                          }`}>
                                                            <User className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                                          </div>
                                                        )}
                                                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} ${
                                                          userItem._id === user?._id ? 'font-semibold' : ''
                                                        }`}>
                                                          {userItem._id === user?._id ? 'Bạn' : userItem.name}
                                                        </span>
                                                      </div>
                                                    ))}
                                                </div>
                                              </>
                                            ) : null}
                                          </div>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => setReplyingTo(prev => ({
                                          ...prev,
                                          [`${post._id}-${comment._id}`]: ''
                                        }))}
                                        className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                                      >
                                        Phản hồi
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Reply Input */}
                                {replyingTo[`${post._id}-${comment._id}`] !== undefined && (
                                  <div className="ml-10">
                                    {/* Reply Header - Show who you're replying to */}
                                    <div className={`mb-2 px-3 py-1.5 rounded-lg flex items-center justify-between ${
                                      isDarkMode ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
                                    }`}>
                                      <div className="flex items-center gap-2">
                                        <MessageCircle className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                                        <span className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                                          Đang trả lời comment của <span className="font-semibold">@{comment.author?.name || 'User'}</span>
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => {
                                          setReplyingTo(prev => {
                                            const updated = { ...prev };
                                            delete updated[`${post._id}-${comment._id}`];
                                            return updated;
                                          });
                                          handleRemoveCommentImage(post._id, comment._id);
                                        }}
                                        className={`p-1 rounded hover:bg-opacity-20 ${isDarkMode ? 'hover:bg-white' : 'hover:bg-blue-200'}`}
                                        title="Hủy"
                                      >
                                        <XIcon className={`w-3.5 h-3.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                                      </button>
                                    </div>
                                    {replyImagePreviews[`${post._id}-${comment._id}`] && (
                                      <div className="mb-2 relative inline-block">
                                        <img
                                          src={replyImagePreviews[`${post._id}-${comment._id}`]}
                                          alt="Preview"
                                          className="max-h-[200px] rounded-lg object-contain"
                                        />
                                        <button
                                          onClick={() => handleRemoveCommentImage(post._id, comment._id)}
                                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                        >
                                          <XIcon className="w-4 h-4" />
                                        </button>
                                      </div>
                                    )}
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        value={replyingTo[`${post._id}-${comment._id}`] || ''}
                                        onChange={(e) => setReplyingTo(prev => ({
                                          ...prev,
                                          [`${post._id}-${comment._id}`]: e.target.value
                                        }))}
                                        placeholder={`Trả lời @${comment.author?.name || 'User'}...`}
                                        className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                                          isDarkMode
                                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                        } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                        onKeyPress={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAddComment(post._id, comment._id);
                                          }
                                        }}
                                      />
                                      <button
                                        onClick={() => handleCommentImageSelect(post._id, comment._id)}
                                        className={`p-2 rounded-lg transition-colors ${
                                          isDarkMode
                                            ? 'bg-gray-700 hover:bg-gray-600 text-blue-400 hover:text-blue-300'
                                            : 'bg-gray-200 hover:bg-gray-300 text-blue-600 hover:text-blue-700'
                                        }`}
                                        title="Thêm ảnh"
                                      >
                                        <Camera className="w-5 h-5" />
                                      </button>
                                      <button
                                        onClick={() => handleAddComment(post._id, comment._id)}
                                        disabled={!replyingTo[`${post._id}-${comment._id}`]?.trim() && !replyImages[`${post._id}-${comment._id}`]}
                                        className={`p-2 rounded-lg ${
                                          isDarkMode
                                            ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-700 disabled:text-gray-500'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500'
                                        } disabled:cursor-not-allowed`}
                                      >
                                        <Send className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Replies */}
                                {comment.replies && comment.replies.length > 0 && (
                                  <div className="ml-10 space-y-2">
                                    {comment.replies.map((reply) => (
                                      <div key={reply._id}>
                                        <div className="flex gap-2">
                                        {reply.author?.avatarUrl ? (
                                          <img
                                            src={reply.author.avatarUrl}
                                            alt={reply.author?.name || 'User'}
                                            className="w-7 h-7 rounded-full object-cover"
                                            style={{ flexShrink: 0 }}
                                          />
                                        ) : (
                                          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} style={{ flexShrink: 0 }}>
                                            <User className={`w-3.5 h-3.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className={`rounded-lg px-3 py-2 ${
                                            isDarkMode ? 'bg-gray-700' : 'bg-white'
                                          }`}>
                                            <div className="flex items-center gap-2 mb-1">
                                              <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                {reply.author?.name || 'User'}
                                              </p>
                                              <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                                                trả lời
                                              </span>
                                              <p className={`text-sm font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                                @{comment.author?.name || 'User'}
                                              </p>
                                              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {new Date(reply.createdAt).toLocaleString('vi-VN', {
                                                  day: '2-digit',
                                                  month: '2-digit',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                })}
                                              </p>
                                              {(user?._id === reply.author?._id || user?._id === post.author?._id) && (
                                                <div className="relative ml-auto">
                                                  <button
                                                    onClick={() => setShowReplyMenu(
                                                      showReplyMenu === reply._id ? null : reply._id
                                                    )}
                                                    className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}
                                                  >
                                                    <MoreVertical className={`w-3.5 h-3.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                                  </button>
                                                  {showReplyMenu === reply._id && (
                                                    <div className={`absolute right-0 top-8 z-10 rounded-lg shadow-lg ${
                                                      isDarkMode ? 'bg-gray-700' : 'bg-white'
                                                    } border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                                      {user?._id === reply.author?._id && (
                                                        <button
                                                          onClick={() => {
                                                            setEditingReply(reply._id);
                                                            setReplyInputs(prev => ({
                                                              ...prev,
                                                              [`edit-${reply._id}`]: reply.content || ''
                                                            }));
                                                            if (reply.imageUrl) {
                                                              setEditReplyImagePreviews(prev => ({
                                                                ...prev,
                                                                [`edit-${reply._id}`]: reply.imageUrl!
                                                              }));
                                                            }
                                                            setShowReplyMenu(null);
                                                          }}
                                                          className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                                                            isDarkMode
                                                              ? 'hover:bg-gray-600 text-gray-300'
                                                              : 'hover:bg-gray-100 text-gray-700'
                                                          }`}
                                                        >
                                                          <Edit2 className="w-4 h-4" />
                                                          Chỉnh sửa
                                                        </button>
                                                      )}
                                                      <button
                                                        onClick={() => {
                                                          handleDeleteComment(post._id, reply._id);
                                                          setShowReplyMenu(null);
                                                        }}
                                                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                                                          isDarkMode
                                                            ? 'hover:bg-gray-600 text-red-400'
                                                            : 'hover:bg-gray-100 text-red-600'
                                                        }`}
                                                      >
                                                        <Trash2 className="w-4 h-4" />
                                                        {user?._id === post.author?._id && user?._id !== reply.author?._id 
                                                          ? 'Xóa phản hồi' 
                                                          : 'Xóa'}
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                            {editingReply === reply._id ? (
                                              <div className="space-y-2">
                                                <textarea
                                                  value={replyInputs[`edit-${reply._id}`] || reply.content || ''}
                                                  onChange={(e) => setReplyInputs(prev => ({
                                                    ...prev,
                                                    [`edit-${reply._id}`]: e.target.value
                                                  }))}
                                                  className={`w-full px-3 py-2 rounded-lg text-sm resize-none ${
                                                    isDarkMode
                                                      ? 'bg-gray-800 border-gray-600 text-white'
                                                      : 'bg-white border-gray-300 text-gray-900'
                                                  } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                  rows={2}
                                                />
                                                {editReplyImagePreviews[`edit-${reply._id}`] && (
                                                  <div className="relative inline-block">
                                                    <img
                                                      src={editReplyImagePreviews[`edit-${reply._id}`]}
                                                      alt="Preview"
                                                      className="max-h-[200px] rounded-lg object-contain"
                                                    />
                                                    <button
                                                      onClick={() => {
                                                        setEditReplyImages(prev => {
                                                          const updated = { ...prev };
                                                          delete updated[`edit-${reply._id}`];
                                                          return updated;
                                                        });
                                                        setEditReplyImagePreviews(prev => {
                                                          const updated = { ...prev };
                                                          if (updated[`edit-${reply._id}`] && updated[`edit-${reply._id}`].startsWith('blob:')) {
                                                            URL.revokeObjectURL(updated[`edit-${reply._id}`]);
                                                          }
                                                          delete updated[`edit-${reply._id}`];
                                                          return updated;
                                                        });
                                                      }}
                                                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                    >
                                                      <XIcon className="w-4 h-4" />
                                                    </button>
                                                  </div>
                                                )}
                                                <div className="flex gap-2 items-center">
                                                  <button
                                                    onClick={() => {
                                                      const input = document.createElement('input');
                                                      input.type = 'file';
                                                      input.accept = 'image/*';
                                                      input.onchange = async (e) => {
                                                        const file = (e.target as HTMLInputElement).files?.[0];
                                                        if (!file) return;
                                                        if (file.size > 5 * 1024 * 1024) {
                                                          alert('Kích thước ảnh không được vượt quá 5MB');
                                                          return;
                                                        }
                                                        if (!file.type.startsWith('image/')) {
                                                          alert('Vui lòng chọn file ảnh');
                                                          return;
                                                        }
                                                        setEditReplyImages(prev => ({ ...prev, [`edit-${reply._id}`]: file }));
                                                        const preview = URL.createObjectURL(file);
                                                        setEditReplyImagePreviews(prev => ({ ...prev, [`edit-${reply._id}`]: preview }));
                                                      };
                                                      input.click();
                                                    }}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                      isDarkMode
                                                        ? 'bg-gray-700 hover:bg-gray-600 text-blue-400 hover:text-blue-300'
                                                        : 'bg-gray-200 hover:bg-gray-300 text-blue-600 hover:text-blue-700'
                                                    }`}
                                                    title="Thêm/Thay đổi ảnh"
                                                  >
                                                    <Camera className="w-4 h-4" />
                                                  </button>
                                                  <button
                                                    onClick={async () => {
                                                      const token = localStorage.getItem('token');
                                                      if (!token) return;
                                                      const editText = replyInputs[`edit-${reply._id}`] || '';
                                                      const editImageFile = editReplyImages[`edit-${reply._id}`];
                                                      const currentImageUrl = editReplyImagePreviews[`edit-${reply._id}`];

                                                      if (!editText.trim() && !editImageFile && !currentImageUrl) {
                                                        alert('Vui lòng nhập nội dung hoặc chọn ảnh');
                                                        return;
                                                      }

                                                      try {
                                                        let imageUrl: string | undefined = currentImageUrl && !currentImageUrl.startsWith('blob:') ? currentImageUrl : undefined;

                                                        if (editImageFile) {
                                                          const uploadedUrl = await uploadFile(editImageFile, 'image');
                                                          if (uploadedUrl) {
                                                            imageUrl = uploadedUrl;
                                                          } else {
                                                            alert('Lỗi khi tải ảnh lên. Vui lòng thử lại.');
                                                            return;
                                                          }
                                                        }

                                                        const requestBody: any = {
                                                          content: editText.trim() || ''
                                                        };
                                                        if (imageUrl !== undefined) {
                                                          requestBody.imageUrl = imageUrl;
                                                        } else if (editImageFile === null && !currentImageUrl && reply.imageUrl) {
                                                          requestBody.imageUrl = '';
                                                        }

                                                        const response = await fetch(`/api/news/${post._id}/comments/${reply._id}`, {
                                                          method: 'PUT',
                                                          headers: {
                                                            'Authorization': `Bearer ${token}`,
                                                            'Content-Type': 'application/json'
                                                          },
                                                          body: JSON.stringify(requestBody)
                                                        });

                                                        if (response.ok) {
                                                          await loadComments(post._id);
                                                          setEditingReply(null);
                                                          setReplyInputs(prev => {
                                                            const updated = { ...prev };
                                                            delete updated[`edit-${reply._id}`];
                                                            return updated;
                                                          });
                                                          setEditReplyImages(prev => {
                                                            const updated = { ...prev };
                                                            delete updated[`edit-${reply._id}`];
                                                            return updated;
                                                          });
                                                          setEditReplyImagePreviews(prev => {
                                                            const updated = { ...prev };
                                                            if (updated[`edit-${reply._id}`] && updated[`edit-${reply._id}`].startsWith('blob:')) {
                                                              URL.revokeObjectURL(updated[`edit-${reply._id}`]);
                                                            }
                                                            delete updated[`edit-${reply._id}`];
                                                            return updated;
                                                          });
                                                        }
                                                      } catch (error) {
                                                        console.error('Error updating reply:', error);
                                                      }
                                                    }}
                                                    className={`px-3 py-1 rounded text-sm font-medium ${
                                                      isDarkMode
                                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                                    }`}
                                                  >
                                                    Lưu
                                                  </button>
                                                  <button
                                                    onClick={() => {
                                                      setEditingReply(null);
                                                      setReplyInputs(prev => {
                                                        const updated = { ...prev };
                                                        delete updated[`edit-${reply._id}`];
                                                        return updated;
                                                      });
                                                      setEditReplyImages(prev => {
                                                        const updated = { ...prev };
                                                        delete updated[`edit-${reply._id}`];
                                                        return updated;
                                                      });
                                                      setEditReplyImagePreviews(prev => {
                                                        const updated = { ...prev };
                                                        if (updated[`edit-${reply._id}`] && updated[`edit-${reply._id}`].startsWith('blob:')) {
                                                          URL.revokeObjectURL(updated[`edit-${reply._id}`]);
                                                        }
                                                        delete updated[`edit-${reply._id}`];
                                                        return updated;
                                                      });
                                                    }}
                                                    className={`px-3 py-1 rounded text-sm font-medium ${
                                                      isDarkMode
                                                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                                    }`}
                                                  >
                                                    Hủy
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <>
                                                {reply.content && (
                                                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    {reply.content}
                                                  </p>
                                                )}
                                                {reply.imageUrl && (
                                                  <div className="mt-2">
                                                    <img
                                                      src={reply.imageUrl}
                                                      alt="Reply attachment"
                                                      className="max-w-full max-h-[300px] rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                                      onClick={() => setShowImageModal(reply.imageUrl || null)}
                                                    />
                                                  </div>
                                                )}
                                              </>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-4 mt-1">
                                            <div className="relative">
                                              <button
                                                onClick={() => handleLikeComment(post._id, reply._id, reply.isLiked)}
                                                onMouseEnter={() => {
                                                  if (reply.likesCount > 0) {
                                                    const key = `${post._id}-${reply._id}`;
                                                    setShowCommentLikesTooltip(key);
                                                    if (!commentLikes[key]) {
                                                      loadCommentLikes(post._id, reply._id);
                                                    }
                                                  }
                                                }}
                                                onMouseLeave={() => setShowCommentLikesTooltip(null)}
                                                className={`flex items-center gap-1 text-xs ${
                                                  reply.isLiked
                                                    ? isDarkMode ? 'text-red-400' : 'text-red-600'
                                                    : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                }`}
                                              >
                                                <Heart className={`w-3.5 h-3.5 ${reply.isLiked ? 'fill-current' : ''}`} />
                                                <span>{reply.likesCount}</span>
                                              </button>
                                              {showCommentLikesTooltip === `${post._id}-${reply._id}` && commentLikes[`${post._id}-${reply._id}`] && (
                                                <div className={`absolute bottom-full left-0 mb-2 z-50 w-64 max-h-80 overflow-y-auto rounded-lg shadow-lg border ${
                                                  isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                                                }`}>
                                                  {commentLikes[`${post._id}-${reply._id}`] && commentLikes[`${post._id}-${reply._id}`].length > 0 ? (
                                                    <>
                                                      <div className={`p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                                        <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                          {commentLikes[`${post._id}-${reply._id}`].length} người đã thích
                                                        </p>
                                                      </div>
                                                      <div className="p-2">
                                                        {commentLikes[`${post._id}-${reply._id}`]
                                                          .sort((a, b) => {
                                                            if (a._id === user?._id) return -1;
                                                            if (b._id === user?._id) return 1;
                                                            return 0;
                                                          })
                                                          .map((userItem) => (
                                                            <div key={userItem._id} className="flex items-center gap-2 p-1.5 rounded hover:bg-opacity-50 ${
                                                              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                                                            }">
                                                              {userItem.avatarUrl ? (
                                                                <img
                                                                  src={userItem.avatarUrl}
                                                                  alt={userItem.name}
                                                                  className="w-8 h-8 rounded-full object-cover"
                                                                />
                                                              ) : (
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                                  isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                                                                }`}>
                                                                  <User className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                                                </div>
                                                              )}
                                                              <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} ${
                                                                userItem._id === user?._id ? 'font-semibold' : ''
                                                              }`}>
                                                                {userItem._id === user?._id ? 'Bạn' : userItem.name}
                                                              </span>
                                                            </div>
                                                          ))}
                                                      </div>
                                                    </>
                                                  ) : null}
                                                </div>
                                              )}
                                            </div>
                                            <button
                                              onClick={() => setReplyingTo(prev => ({
                                                ...prev,
                                                [`${post._id}-${reply._id}`]: ''
                                              }))}
                                              className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                                            >
                                              Phản hồi
                                            </button>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Reply to Reply Input */}
                                      {replyingTo[`${post._id}-${reply._id}`] !== undefined && (
                                        <div className="ml-10 mt-2">
                                          {/* Reply Header - Show who you're replying to */}
                                          <div className={`mb-2 px-3 py-1.5 rounded-lg flex items-center justify-between ${
                                            isDarkMode ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
                                          }`}>
                                            <div className="flex items-center gap-2">
                                              <MessageCircle className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                                              <span className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                                                Đang trả lời reply của <span className="font-semibold">@{reply.author?.name || 'User'}</span>
                                              </span>
                                            </div>
                                            <button
                                              onClick={() => {
                                                setReplyingTo(prev => {
                                                  const updated = { ...prev };
                                                  delete updated[`${post._id}-${reply._id}`];
                                                  return updated;
                                                });
                                                handleRemoveCommentImage(post._id, reply._id);
                                              }}
                                              className={`p-1 rounded hover:bg-opacity-20 ${isDarkMode ? 'hover:bg-white' : 'hover:bg-blue-200'}`}
                                              title="Hủy"
                                            >
                                              <XIcon className={`w-3.5 h-3.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                                            </button>
                                          </div>
                                          {replyImagePreviews[`${post._id}-${reply._id}`] && (
                                            <div className="mb-2 relative inline-block">
                                              <img
                                                src={replyImagePreviews[`${post._id}-${reply._id}`]}
                                                alt="Preview"
                                                className="max-h-[200px] rounded-lg object-contain"
                                              />
                                              <button
                                                onClick={() => handleRemoveCommentImage(post._id, reply._id)}
                                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                              >
                                                <XIcon className="w-4 h-4" />
                                              </button>
                                            </div>
                                          )}
                                          <div className="flex gap-2">
                                            <input
                                              type="text"
                                              value={replyingTo[`${post._id}-${reply._id}`] || ''}
                                              onChange={(e) => setReplyingTo(prev => ({
                                                ...prev,
                                                [`${post._id}-${reply._id}`]: e.target.value
                                              }))}
                                              placeholder={`Trả lời @${reply.author?.name || 'User'}...`}
                                              className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                                                isDarkMode
                                                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                              } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                              onKeyPress={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                  e.preventDefault();
                                                  handleAddComment(post._id, reply._id);
                                                }
                                              }}
                                            />
                                            <button
                                              onClick={() => handleCommentImageSelect(post._id, reply._id)}
                                              className={`p-2 rounded-lg transition-colors ${
                                                isDarkMode
                                                  ? 'bg-gray-700 hover:bg-gray-600 text-blue-400 hover:text-blue-300'
                                                  : 'bg-gray-200 hover:bg-gray-300 text-blue-600 hover:text-blue-700'
                                              }`}
                                              title="Thêm ảnh"
                                            >
                                              <Camera className="w-5 h-5" />
                                            </button>
                                            <button
                                              onClick={() => handleAddComment(post._id, reply._id)}
                                              disabled={!replyingTo[`${post._id}-${reply._id}`]?.trim() && !replyImages[`${post._id}-${reply._id}`]}
                                              className={`p-2 rounded-lg ${
                                                isDarkMode
                                                  ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-700 disabled:text-gray-500'
                                                  : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500'
                                              } disabled:cursor-not-allowed`}
                                            >
                                              <Send className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {/* Nested Replies (replies to replies) */}
                                      {reply.replies && reply.replies.length > 0 && (
                                        <div className="ml-10 mt-2 space-y-2">
                                          {reply.replies.map((nestedReply) => (
                                            <div key={nestedReply._id} className="flex gap-2">
                                              {nestedReply.author?.avatarUrl ? (
                                                <img
                                                  src={nestedReply.author.avatarUrl}
                                                  alt={nestedReply.author?.name || 'User'}
                                                  className="w-6 h-6 rounded-full object-cover"
                                                  style={{ flexShrink: 0 }}
                                                />
                                              ) : (
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} style={{ flexShrink: 0 }}>
                                                  <User className={`w-3 h-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                                </div>
                                              )}
                                              <div className="flex-1 min-w-0">
                                                <div className={`rounded-lg px-2.5 py-1.5 ${
                                                  isDarkMode ? 'bg-gray-700' : 'bg-white'
                                                }`}>
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <p className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                      {nestedReply.author?.name || 'User'}
                                                    </p>
                                                    <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                                                      trả lời
                                                    </span>
                                                    <p className={`text-xs font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                                      @{reply.author?.name || 'User'}
                                                    </p>
                                                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                      {new Date(nestedReply.createdAt).toLocaleString('vi-VN', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                      })}
                                                    </p>
                                                  </div>
                                                  {nestedReply.content && (
                                                    <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                      {nestedReply.content}
                                                    </p>
                                                  )}
                                                  {nestedReply.imageUrl && (
                                                    <div className="mt-1">
                                                      <img
                                                        src={nestedReply.imageUrl}
                                                        alt="Nested reply attachment"
                                                        className="max-w-full max-h-[200px] rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                                        onClick={() => setShowImageModal(nestedReply.imageUrl || null)}
                                                      />
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                  <div className="relative">
                                                    <button
                                                      onClick={() => handleLikeComment(post._id, nestedReply._id, nestedReply.isLiked)}
                                                      onMouseEnter={() => {
                                                        if (nestedReply.likesCount > 0) {
                                                          const key = `${post._id}-${nestedReply._id}`;
                                                          setShowCommentLikesTooltip(key);
                                                          if (!commentLikes[key]) {
                                                            loadCommentLikes(post._id, nestedReply._id);
                                                          }
                                                        }
                                                      }}
                                                      onMouseLeave={() => setShowCommentLikesTooltip(null)}
                                                      className={`flex items-center gap-1 text-xs ${
                                                        nestedReply.isLiked
                                                          ? isDarkMode ? 'text-red-400' : 'text-red-600'
                                                          : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                      }`}
                                                    >
                                                      <Heart className={`w-3 h-3 ${nestedReply.isLiked ? 'fill-current' : ''}`} />
                                                      <span>{nestedReply.likesCount}</span>
                                                    </button>
                                                    {showCommentLikesTooltip === `${post._id}-${nestedReply._id}` && commentLikes[`${post._id}-${nestedReply._id}`] && (
                                                      <div className={`absolute bottom-full left-0 mb-2 z-50 w-64 max-h-80 overflow-y-auto rounded-lg shadow-lg border ${
                                                        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                                                      }`}>
                                                        {commentLikes[`${post._id}-${nestedReply._id}`] && commentLikes[`${post._id}-${nestedReply._id}`].length > 0 ? (
                                                          <>
                                                            <div className={`p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                                              <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                                {commentLikes[`${post._id}-${nestedReply._id}`].length} người đã thích
                                                              </p>
                                                            </div>
                                                            <div className="p-2">
                                                              {commentLikes[`${post._id}-${nestedReply._id}`]
                                                                .sort((a, b) => {
                                                                  if (a._id === user?._id) return -1;
                                                                  if (b._id === user?._id) return 1;
                                                                  return 0;
                                                                })
                                                                .map((userItem) => (
                                                                  <div key={userItem._id} className="flex items-center gap-2 p-1.5 rounded hover:bg-opacity-50 ${
                                                                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                                                                  }">
                                                                    {userItem.avatarUrl ? (
                                                                      <img
                                                                        src={userItem.avatarUrl}
                                                                        alt={userItem.name}
                                                                        className="w-8 h-8 rounded-full object-cover"
                                                                      />
                                                                    ) : (
                                                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                                        isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                                                                      }`}>
                                                                        <User className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                                                      </div>
                                                                    )}
                                                                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} ${
                                                                      userItem._id === user?._id ? 'font-semibold' : ''
                                                                    }`}>
                                                                      {userItem._id === user?._id ? 'Bạn' : userItem.name}
                                                                    </span>
                                                                  </div>
                                                                ))}
                                                            </div>
                                                          </>
                                                        ) : null}
                                                      </div>
                                                    )}
                                                  </div>
                                                  <button
                                                    onClick={() => setReplyingTo(prev => ({
                                                      ...prev,
                                                      [`${post._id}-${nestedReply._id}`]: ''
                                                    }))}
                                                    className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                                                  >
                                                    Phản hồi
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          );
                        }
                        
                        // Show empty state if no comments
                        return (
                          <div className="flex items-center justify-center py-6">
                            <p className={`text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {post.commentsCount === 0 
                                ? 'Chưa có bình luận nào. Hãy là người đầu tiên bình luận!' 
                                : 'Đang tải bình luận...'}
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Add Comment Input */}
                    <div className={`px-4 py-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex gap-2">
                          {user?.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="w-8 h-8 rounded-full object-cover"
                              style={{ flexShrink: 0 }}
                            />
                          ) : (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} style={{ flexShrink: 0 }}>
                              <User className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                            </div>
                          )}
                          <div className="flex-1">
                            {commentImagePreviews[post._id] && (
                              <div className="mb-2 relative inline-block">
                                <img
                                  src={commentImagePreviews[post._id]}
                                  alt="Preview"
                                  className="max-h-[200px] rounded-lg object-contain"
                                />
                                <button
                                  onClick={() => handleRemoveCommentImage(post._id)}
                                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                >
                                  <XIcon className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={commentInputs[post._id] || ''}
                                onChange={(e) => setCommentInputs(prev => ({
                                  ...prev,
                                  [post._id]: e.target.value
                                }))}
                                placeholder="Viết bình luận..."
                                className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                                  isDarkMode
                                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddComment(post._id);
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleCommentImageSelect(post._id)}
                                className={`p-2 rounded-lg transition-colors ${
                                  isDarkMode
                                    ? 'bg-gray-700 hover:bg-gray-600 text-blue-400 hover:text-blue-300'
                                    : 'bg-gray-200 hover:bg-gray-300 text-blue-600 hover:text-blue-700'
                                }`}
                                title="Thêm ảnh"
                              >
                                <Camera className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleAddComment(post._id)}
                                disabled={!commentInputs[post._id]?.trim() && !commentImages[post._id]}
                                className={`p-2 rounded-lg transition-colors ${
                                  isDarkMode
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-700 disabled:text-gray-500'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500'
                                } disabled:cursor-not-allowed`}
                                title="Gửi"
                              >
                                <Send className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* PDF Viewer Modal */}
      {showPdfViewer && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setShowPdfViewer(null)}
        >
          <div 
            className={`relative w-full h-full max-w-6xl max-h-[90vh] m-4 rounded-lg shadow-2xl ${
              isDarkMode ? 'bg-gray-900' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between p-4 border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Xem PDF
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={newsPosts.find(p => p._id === showPdfViewer)?.pdfUrl}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'hover:bg-gray-700 text-gray-300' 
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Tải xuống"
                >
                  <Download className="w-5 h-5" />
                </a>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPdfViewer(null);
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'hover:bg-gray-700 text-gray-300' 
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="relative w-full h-[calc(90vh-80px)] bg-gray-100">
              {(() => {
                const currentPost = newsPosts.find(p => p._id === showPdfViewer);
                const pdfUrl = currentPost?.pdfUrl;
                if (!pdfUrl) {
                  return (
                    <div className="flex items-center justify-center h-full">
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Không tìm thấy file PDF
                      </p>
                    </div>
                  );
                }
                
                const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
                
                return (
                  <div className="w-full h-full">
                    <iframe
                      key={pdfUrl}
                      src={viewerUrl}
                      className="w-full h-full rounded-b-lg border-0"
                      title="PDF Viewer"
                      allow="fullscreen"
                      allowFullScreen
                    />
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setShowImageModal(null)}
        >
          <div
            className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowImageModal(null)}
              className={`absolute top-4 right-4 z-10 p-2 rounded-full ${
                isDarkMode
                  ? 'bg-gray-800 hover:bg-gray-700 text-white'
                  : 'bg-white hover:bg-gray-100 text-gray-700'
              } transition-colors`}
            >
              <XIcon className="w-6 h-6" />
            </button>
            <img
              src={showImageModal}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} max-h-[90vh] overflow-y-auto`}>
            <div className={`sticky top-0 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between`}>
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {editingPost ? 'Chỉnh sửa bản tin' : 'Tạo bản tin mới'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingPost(null);
                  setFormData({ title: '', content: '', imageUrl: '', isPinned: false });
                }}
                className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <XIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Tiêu đề *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  placeholder="Nhập tiêu đề bản tin..."
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Nội dung *
                </label>
                <textarea
                  required
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  placeholder="Nhập nội dung bản tin..."
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Ảnh đại diện
                </label>
                <div className="space-y-3">
                  {/* File input for images (multiple, max 10) */}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200 ${
                        isDarkMode
                          ? 'border-gray-600 hover:border-purple-500 bg-gray-700/50 hover:bg-gray-700'
                          : 'border-gray-300 hover:border-purple-500 bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <ImageIcon className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {selectedImages.length > 0 
                          ? `Đã chọn ${selectedImages.length}/10 ảnh` 
                          : 'Chọn ảnh từ máy tính (tối đa 10 ảnh)'}
                      </span>
                    </label>
                    {selectedImages.length > 0 && (
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Có thể chọn thêm {10 - selectedImages.length} ảnh nữa
                      </p>
                    )}
                  </div>

                  {/* Images preview grid */}
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className={`absolute top-1 right-1 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                              isDarkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'
                            } text-white`}
                          >
                            <XIcon size={14} />
                          </button>
                          <div className={`absolute bottom-1 left-1 px-2 py-0.5 rounded text-xs font-medium ${
                            isDarkMode ? 'bg-black/50 text-white' : 'bg-white/80 text-gray-700'
                          }`}>
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Or use URL */}
                  <div className="text-center">
                    <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>hoặc</span>
                  </div>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    placeholder="Nhập URL ảnh (tùy chọn)"
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  File PDF đính kèm (tùy chọn)
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfSelect}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label
                    htmlFor="pdf-upload"
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200 ${
                      isDarkMode
                        ? 'border-gray-600 hover:border-purple-500 bg-gray-700/50 hover:bg-gray-700'
                        : 'border-gray-300 hover:border-purple-500 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <FileText className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {selectedPdf ? selectedPdf.name : 'Chọn file PDF'}
                    </span>
                  </label>
                  {selectedPdf && (
                    <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <div className="flex items-center gap-2">
                        <FileText className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {selectedPdf.name} ({(selectedPdf.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPdf(null);
                          const input = document.getElementById('pdf-upload') as HTMLInputElement;
                          if (input) input.value = '';
                        }}
                        className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                      >
                        <XIcon size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPinned"
                  checked={formData.isPinned}
                  onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="isPinned" className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Ghim bản tin này
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    isDarkMode
                      ? 'bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang tải lên...
                    </>
                  ) : (
                    editingPost ? 'Cập nhật' : 'Tạo bản tin'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingPost(null);
                    setFormData({ title: '', content: '', imageUrl: '', isPinned: false });
                    setSelectedImages([]);
                    setSelectedPdf(null);
                    setImagePreviews([]);
                    const imageInput = document.getElementById('image-upload') as HTMLInputElement;
                    const pdfInput = document.getElementById('pdf-upload') as HTMLInputElement;
                    if (imageInput) imageInput.value = '';
                    if (pdfInput) pdfInput.value = '';
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

