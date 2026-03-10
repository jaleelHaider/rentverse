import { Listing, Category } from '@/types'

export const mockListings: Listing[] = [
  {
    id: '1',
    title: 'Sony A7III Camera with 24-70mm Lens',
    description: 'Professional full-frame mirrorless camera in excellent condition. Perfect for photography and videography. Includes original box, charger, 2 batteries, and lens hood.',
    type: 'both',
    category: 'Electronics',
    subCategory: 'Cameras',
    condition: 'like_new',
    price: {
      buy: 285000,
      rent: {
        daily: 3000,
        weekly: 15000,
        monthly: 45000
      },
      securityDeposit: 50000
    },
    images: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w-800',
      'https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?w=800'
    ],
    location: {
      city: 'Karachi',
      area: 'DHA Phase 6',
      address: 'Near Ocean Mall'
    },
    specifications: {
      'Brand': 'Sony',
      'Model': 'A7III',
      'Sensor': 'Full Frame',
      'Megapixels': '24.2MP',
      'Lens Included': '24-70mm f/2.8',
      'Condition': 'Like New',
      'Age': '8 months'
    },
    features: [
      '4K Video Recording',
      'Image Stabilization',
      'WiFi & Bluetooth',
      'Weather Sealed',
      'Touch Screen',
      'Fast Autofocus'
    ],
    seller: {
      id: 'seller-1',
      name: 'Ahmed Raza',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed',
      rating: 4.8,
      verified: true,
      trustScore: 95,
      responseRate: 98
    },
    availability: {
      forRent: true,
      forSale: true,
      totalForRent: 10,
      availableForRent: 6,
      totalForSale: 4,
      availableForSale: 3,
      rentalCalendar: {
        '2024-01-15': true,
        '2024-01-16': true,
        '2024-01-17': false,
        '2024-01-18': true,
      }
    },
    aiMetadata: {
      qualityScore: 9.2,
      priceFairness: 8.7,
      fraudRisk: 12,
      categoryConfidence: 98
    },
    views: 1245,
    saves: 67,
    createdAt: '2024-01-10',
    updatedAt: '2024-01-10',
    status: 'active'
  },
  // Add more mock listings...
]

export const categories: Category[] = [
  {
    id: 'electronics',
    name: 'Electronics',
    icon: '📱',
    subCategories: ['Phones', 'Laptops', 'Cameras', 'TVs', 'Audio'],
    count: 12500,
    popular: true
  },
  // Add more categories...
]