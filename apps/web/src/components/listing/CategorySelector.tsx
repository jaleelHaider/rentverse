import React, { useState } from 'react';
import { 
  Home, 
  Car, 
  Briefcase, 
  Camera, 
  Dumbbell, 
  PartyPopper,
  Palette,
  MoreHorizontal
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  subcategories?: string[];
}

const categories: Category[] = [
  {
    id: 'electronics',
    name: 'Electronics',
    icon: <Camera className="h-6 w-6" />,
    description: 'Cameras, laptops, gadgets',
    subcategories: ['Cameras', 'Laptops', 'Phones', 'Gaming Consoles']
  },
  {
    id: 'vehicles',
    name: 'Vehicles',
    icon: <Car className="h-6 w-6" />,
    description: 'Cars, bikes, scooters',
    subcategories: ['Cars', 'Motorcycles', 'Bicycles', 'Scooters']
  },
  {
    id: 'tools',
    name: 'Tools & Equipment',
    icon: <Briefcase className="h-6 w-6" />,
    description: 'Power tools, garden equipment',
    subcategories: ['Power Tools', 'Hand Tools', 'Garden Equipment', 'Construction']
  },
  {
    id: 'party',
    name: 'Party & Events',
    icon: <PartyPopper className="h-6 w-6" />,
    description: 'Party supplies, decorations',
    subcategories: ['Tables & Chairs', 'Decorations', 'Sound Systems', 'Lighting']
  },
  {
    id: 'sports',
    name: 'Sports & Outdoors',
    icon: <Dumbbell className="h-6 w-6" />,
    description: 'Sporting gear, camping',
    subcategories: ['Camping Gear', 'Fitness Equipment', 'Water Sports', 'Winter Sports']
  },
  {
    id: 'creative',
    name: 'Creative',
    icon: <Palette className="h-6 w-6" />,
    description: 'Art supplies, musical instruments',
    subcategories: ['Musical Instruments', 'Art Supplies', 'Photography', 'DJ Equipment']
  },
  {
    id: 'home',
    name: 'Home & Garden',
    icon: <Home className="h-6 w-6" />,
    description: 'Furniture, appliances',
    subcategories: ['Furniture', 'Appliances', 'Garden Tools', 'Kitchenware']
  },
  {
    id: 'other',
    name: 'Other',
    icon: <MoreHorizontal className="h-6 w-6" />,
    description: 'Other items not listed',
  }
];

interface CategorySelectorProps {
  selectedCategory?: string;
  onCategoryChange?: (categoryId: string, subcategory?: string) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategory,
  onCategoryChange
}) => {
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');

  const handleCategorySelect = (categoryId: string) => {
    setSelectedSubcategory('');
    if (onCategoryChange) {
      onCategoryChange(categoryId);
    }
  };

  const handleSubcategorySelect = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    if (onCategoryChange && selectedCategory) {
      onCategoryChange(selectedCategory, subcategory);
    }
  };

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Category</h3>
        
        {/* Main Categories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => handleCategorySelect(category.id)}
              className={`
                flex flex-col items-center p-4 border-2 rounded-xl transition-all
                hover:border-blue-400 hover:bg-blue-50 hover:scale-[1.02]
                ${selectedCategory === category.id 
                  ? 'border-blue-500 bg-blue-50 shadow-sm' 
                  : 'border-gray-200'}
              `}
            >
              <div className={`
                p-3 rounded-full mb-3
                ${selectedCategory === category.id 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600'}
              `}>
                {category.icon}
              </div>
              <span className="font-medium text-gray-900">{category.name}</span>
              <span className="text-xs text-gray-500 mt-1 text-center">
                {category.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Subcategories */}
      {selectedCategoryData?.subcategories && (
        <div className="pt-6 border-t border-gray-200">
          <h4 className="text-md font-medium text-gray-700 mb-4">
            Select Subcategory for {selectedCategoryData.name}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {selectedCategoryData.subcategories.map((subcat) => (
              <button
                key={subcat}
                type="button"
                onClick={() => handleSubcategorySelect(subcat)}
                className={`
                  py-3 px-4 text-center border rounded-lg transition-colors
                  hover:border-blue-400 hover:bg-blue-50
                  ${selectedSubcategory === subcat 
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' 
                    : 'border-gray-200'}
                `}
              >
                {subcat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Category Summary */}
      {(selectedCategory || selectedSubcategory) && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Selected:</h4>
              <div className="mt-1">
                {selectedCategory && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    {categories.find(c => c.id === selectedCategory)?.name}
                  </span>
                )}
                {selectedSubcategory && (
                  <>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                      {selectedSubcategory}
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                handleCategorySelect('');
                setSelectedSubcategory('');
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySelector;
