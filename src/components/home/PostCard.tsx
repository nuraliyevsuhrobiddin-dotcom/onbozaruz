import React from 'react';
import { motion } from 'framer-motion';
import { Post } from '../../data/mockAgroData';
import { useAgroStore } from '../../store/useAgroStore';
import { PostHeader } from './PostHeader';
import { PostMedia } from './PostMedia';
import { PostActions } from './PostActions';
import { PostFooter } from './PostFooter';
import { ContactButtons } from './ContactButtons';

interface PostCardProps {
  post: Post;
  allPosts: Post[];
  index?: number;
}

export const PostCard: React.FC<PostCardProps> = ({ post, allPosts, index = 0 }) => {
  const {
    toggleLikePost,
    toggleSavePost,
    toggleFollowSeller,
    setCommentPost,
    setSharePost,
    setContactSellerData,
    setProductDetail,
    likedPostIds,
    savedPostIds,
    followedSellerIds,
    openVideoViewer,
    currentUser,
  } = useAgroStore();

  const isLiked = likedPostIds.includes(post.id);
  const isSaved = savedPostIds.includes(post.id);
  const isFollowing = followedSellerIds.includes(post.sellerId);
  const isOwnPost = currentUser?.id === post.sellerId;

  const handleMediaClick = () => {
    const postIdx = allPosts.findIndex((p) => p.id === post.id);
    openVideoViewer(allPosts, postIdx !== -1 ? postIdx : 0);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[680px] mx-auto bg-white rounded-[18px] border border-slate-200/80 overflow-hidden mb-6 select-none p-0 shadow-sm"
    >
      <PostHeader
        sellerAvatar={post.sellerAvatar}
        sellerName={post.sellerName}
        verified={post.verified}
        location={post.location}
        date={post.date}
        categoryName={post.categoryName}
        isFollowing={isFollowing}
        onToggleFollow={isOwnPost ? undefined : () => toggleFollowSeller(post.sellerId, post.sellerName)}
        onMoreClick={() => setProductDetail(post)}
      />

      <PostMedia
        type={post.type}
        mediaUrl={post.mediaUrl}
        posterUrl={post.posterUrl}
        title={post.title}
        price={post.price}
        onDoubleTapLike={() => !isLiked && toggleLikePost(post.id)}
        onClickMedia={handleMediaClick}
      />

      <div className="p-4">
        <PostActions
          isLiked={isLiked}
          isSaved={isSaved}
          likesCount={post.likesCount}
          commentsCount={post.commentsCount}
          onLike={() => toggleLikePost(post.id)}
          onComment={() => setCommentPost(post)}
          onShare={() => setSharePost(post)}
          onSave={() => toggleSavePost(post.id)}
        />

        <PostFooter
          sellerName={post.sellerName}
          title={post.title}
          categoryName={post.categoryName}
          condition={post.condition}
          minOrder={post.minOrder}
          commentsCount={post.commentsCount}
          date={post.date}
          onCommentClick={() => setCommentPost(post)}
        />

        <div className="mt-3">
          <ContactButtons
            phone={post.phone}
            telegram={post.telegram}
            onContactClick={() =>
              setContactSellerData({
                name: post.sellerName,
                phone: post.phone,
                telegram: post.telegram,
                title: post.title,
              })
            }
          />
        </div>
      </div>
    </motion.article>
  );
};
