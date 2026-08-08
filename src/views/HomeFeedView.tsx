import React, { useState, useEffect } from 'react';
import { useAgroStore } from '../store/useAgroStore';
import { StoryBar, FarmerStory } from '../components/home/StoryBar';
import { RegionFilter } from '../components/home/RegionFilter';
import { CategoryFilter } from '../components/home/CategoryFilter';
import { FeedCard } from '../components/FeedCard';
import { LoadingSkeleton } from '../components/home/LoadingSkeleton';
import { EmptyState } from '../components/home/EmptyState';

export const HomeFeedView: React.FC = () => {
  const { posts, followedSellerIds } = useAgroStore();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedSeller, setSelectedSeller] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Short initial skeleton delay
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  // Verified farmers list for StoryBar
  const farmers: FarmerStory[] = Array.from(
    new Map(
      posts.map((p) => [
        p.sellerId,
        {
          id: p.sellerId,
          name: p.sellerName,
          avatar: p.sellerAvatar,
          verified: p.verified,
          online: true,
        },
      ])
    ).values()
  );

  const filteredPosts = posts.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesRegion =
      selectedRegion === 'all' || p.location.includes(selectedRegion);
    const matchesSeller = !selectedSeller || p.sellerId === selectedSeller;
    return matchesCategory && matchesRegion && matchesSeller;
  });

  // Deduplicate posts by id to prevent accidental double renders
  const dedupedPosts = Array.from(new Map(filteredPosts.map((p) => [p.id, p])).values());

  return (
    <div className="w-full max-w-170 mx-auto px-0 sm:px-4 py-1.5 sm:py-2 space-y-2.5 sm:space-y-3.5">
      {/* 1. Obunalar (Fermerlar Yangi E'lonlari) StoryBar */}
      <StoryBar
        farmers={farmers}
        followedSellerIds={followedSellerIds}
        selectedSeller={selectedSeller}
        onSelectSeller={(sellerId) => setSelectedSeller(sellerId)}
        onOpenFarmerReels={(sellerId) => {
          const sellerPosts = posts.filter((p) => p.sellerId === sellerId && p.type === 'video');
          if (sellerPosts.length > 0) {
            useAgroStore.getState().openVideoViewer(sellerPosts, 0);
          }
        }}
      />

      {/* 2. Filters Container */}
      <div className="relative self-start w-full z-50 bg-[#F8FAFC]/95 backdrop-blur-md py-2 -mx-2 sm:-mx-4 px-2 sm:px-4 border-b border-slate-200/60 lg:transform-[translateZ(0)]">
        <div className="space-y-2">
          <CategoryFilter
            selectedCategory={selectedCategory}
            onSelectCategory={(catId) => setSelectedCategory(catId)}
          />
          <RegionFilter
            selectedRegion={selectedRegion}
            onSelectRegion={(reg) => setSelectedRegion(reg)}
          />
        </div>
      </div>

      {/* 3. Feed Cards list or Skeleton or EmptyState */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : dedupedPosts.length > 0 ? (
        <div>
          {dedupedPosts.map((post, index) => (
            <FeedCard
              key={post.id}
              post={post}
              allPosts={dedupedPosts}
              index={index}
            />
          ))}

          {/* End of Feed Indicator */}
          <div className="py-10 flex flex-col items-center gap-2 text-slate-400">
            <div className="w-10 h-1 bg-slate-200 rounded-full" />
            <p className="text-[12px] font-extrabold text-slate-400 mt-1">
              Barcha agro e'lonlar ko'rib chiqildi
            </p>
          </div>
        </div>
      ) : (
        <EmptyState
          onReset={() => {
            setSelectedCategory('all');
            setSelectedRegion('all');
            setSelectedSeller(null);
          }}
        />
      )}
    </div>
  );
};
