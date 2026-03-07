import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Camera, 
  Car, 
  Home, 
  Music, 
  Dumbbell, 
  PartyPopper, 
  Briefcase, 
  Palette,
  Tv,
  Coffee,
  Smartphone,
  Gamepad2
} from 'lucide-react';
import { fetchActiveListingCategoryCounts } from '@/api/endpoints/listing';

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  aliases?: string[];
}

const CategoryGrid: React.FC = () => {
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);

  useEffect(() => {
    const loadCategoryCounts = async () => {
      try {
        const counts = await fetchActiveListingCategoryCounts();
        setCategoryCounts(counts);
      } catch {
        setCategoryCounts({});
      } finally {
        setIsLoadingCounts(false);
      }
    };

    void loadCategoryCounts();
  }, []);

  const categories: Category[] = [
    {
      id: 'electronics',
      name: 'Electronics',
      icon: <Smartphone className="h-8 w-8" />,
      description: 'Phones, laptops, cameras, gadgets',
      color: 'bg-blue-100 text-blue-600',
      aliases: ['electronics'],
    },
    {
      id: 'vehicles',
      name: 'Vehicles',
      icon: <Car className="h-8 w-8" />,
      description: 'Cars, bikes, scooters',
      color: 'bg-green-100 text-green-600',
      aliases: ['vehicles'],
    },
    {
      id: 'home',
      name: 'Home & Garden',
      icon: <Home className="h-8 w-8" />,
      description: 'Furniture, appliances, decor',
      color: 'bg-orange-100 text-orange-600',
      aliases: ['home'],
    },
    {
      id: 'entertainment',
      name: 'Entertainment',
      icon: <Tv className="h-8 w-8" />,
      description: 'TVs, projectors, gaming',
      color: 'bg-purple-100 text-purple-600',
      aliases: ['entertainment'],
    },
    {
      id: 'music',
      name: 'Music & Instruments',
      icon: <Music className="h-8 w-8" />,
      description: 'Guitars, keyboards, DJ gear',
      color: 'bg-pink-100 text-pink-600',
      aliases: ['music'],
    },
    {
      id: 'sports',
      name: 'Sports & Fitness',
      icon: <Dumbbell className="h-8 w-8" />,
      description: 'Gym equipment, camping gear',
      color: 'bg-red-100 text-red-600',
      aliases: ['sports'],
    },
    {
      id: 'events',
      name: 'Party & Events',
      icon: <PartyPopper className="h-8 w-8" />,
      description: 'Decorations, sound systems',
      color: 'bg-yellow-100 text-yellow-600',
      aliases: ['events', 'party'],
    },
    {
      id: 'tools',
      name: 'Tools & Equipment',
      icon: <Briefcase className="h-8 w-8" />,
      description: 'Power tools, garden equipment',
      color: 'bg-teal-100 text-teal-600',
      aliases: ['tools'],
    },
    {
      id: 'creative',
      name: 'Creative Arts',
      icon: <Palette className="h-8 w-8" />,
      description: 'Art supplies, cameras, lighting',
      color: 'bg-indigo-100 text-indigo-600',
      aliases: ['creative'],
    },
    {
      id: 'gaming',
      name: 'Gaming',
      icon: <Gamepad2 className="h-8 w-8" />,
      description: 'Consoles, VR, accessories',
      color: 'bg-cyan-100 text-cyan-600',
      aliases: ['gaming'],
    },
    {
      id: 'kitchen',
      name: 'Kitchen & Dining',
      icon: <Coffee className="h-8 w-8" />,
      description: 'Appliances, dinnerware',
      color: 'bg-amber-100 text-amber-600',
      aliases: ['kitchen'],
    },
    {
      id: 'photography',
      name: 'Photography',
      icon: <Camera className="h-8 w-8" />,
      description: 'Cameras, lenses, drones',
      color: 'bg-violet-100 text-violet-600',
      aliases: ['photography'],
    },
  ];

  const categoriesWithCounts = useMemo(
    () =>
      categories.map((category) => {
        const aliases = category.aliases && category.aliases.length > 0 ? category.aliases : [category.id];
        const itemCount = aliases.reduce((sum, alias) => sum + (categoryCounts[alias.toLowerCase()] || 0), 0);

        return {
          ...category,
          itemCount,
        };
      }),
    [categories, categoryCounts]
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {categoriesWithCounts.map((category) => (
        <Link
          key={category.id}
          to={`/browse?category=${category.id}`}
          className="group bg-white border border-gray-200 rounded-xl p-6 text-center hover:border-primary-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
        >
          <div className={`${category.color} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
            {category.icon}
          </div>
          
          <h3 className="font-bold text-gray-900 mb-2">{category.name}</h3>
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{category.description}</p>
          
          <div className="text-xs font-medium text-gray-500">
            {isLoadingCounts ? 'Loading...' : `${category.itemCount.toLocaleString()} items`}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs text-primary-600 font-medium group-hover:text-primary-700">
              Browse →
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default CategoryGrid;