import React, { useState } from 'react';
import { Star, Quote, TrendingUp, Shield } from 'lucide-react';

const Testimonials: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'renters' | 'owners'>('renters');

  const renterTestimonials = [
    {
      id: 1,
      name: 'Ahmed Ali',
      role: 'Photographer, Lahore',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      content: 'Rented a professional camera for my wedding shoot. Saved Rs50,000 vs buying and got perfect equipment!',
      rating: 5,
      stats: 'Saved Rs50,000',
    },
    {
      id: 2,
      name: 'Mishal Malik',
      role: 'Event Planner, Rawalpindi',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786',
      content: 'The sound system I rented for a corporate event was flawless. Easy booking and great support throughout.',
      rating: 5,
      stats: '6 events served',
    },
    {
      id: 3,
      name: 'Kamran Raza',
      role: 'Student, Lahore',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
      content: 'As a student, I can\'t afford a gaming console. RentVerse lets me enjoy gaming on weekends affordably.',
      rating: 4,
      stats: 'Saved Rs40,000',
    },
  ];

  const ownerTestimonials = [
    {
      id: 1,
      name: 'Sara Khan',
      role: 'Camera Owner, Islamabad',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e',
      content: 'My camera was sitting idle. Now it earns Rs15,000/month! RentVerse handles payments and protection.',
      rating: 5,
      stats: 'Rs1.8L earned',
    },
    {
      id: 2,
      name: 'Nadia Hussain',
      role: 'Home Decor Owner, Faisalabad',
      image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f',
      content: 'Renting out my party tent and decorations has become a side business. Earned Rs75,000 in 6 months.',
      rating: 5,
      stats: 'Rs75,000 earned',
    },
    {
      id: 3,
      name: 'Bilal Ahmed',
      role: 'Tools Owner, Multan',
      image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d',
      content: 'My power tools were collecting dust. Now they pay for themselves through rentals. Great platform!',
      rating: 5,
      stats: 'Rs60,000 earned',
    },
  ];

  const activeTestimonials = activeTab === 'renters' ? renterTestimonials : ownerTestimonials;

  return (
    <div className="container-custom">
      <div className="text-center mb-12">
        <h2 className="section-title">Trusted by Thousands</h2>
        <p className="section-subtitle max-w-2xl mx-auto">
          See what our community has to say about their RentVerse experience
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex bg-gray-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('renters')}
            className={`px-8 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'renters'
                ? 'bg-white shadow-lg text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Renters
            </span>
          </button>
          <button
            onClick={() => setActiveTab('owners')}
            className={`px-8 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'owners'
                ? 'bg-white shadow-lg text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Owners
            </span>
          </button>
        </div>
      </div>

      {/* Testimonials Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        {activeTestimonials.map((testimonial) => (
          <div
            key={testimonial.id}
            className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl transition-shadow relative"
          >
            {/* Quote Icon */}
            <div className="absolute top-6 right-6 text-gray-100">
              <Quote className="h-12 w-12" />
            </div>

            {/* Profile */}
            <div className="flex items-center gap-4 mb-6">
              <img
                src={testimonial.image}
                alt={testimonial.name}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div>
                <h4 className="font-bold text-lg">{testimonial.name}</h4>
                <p className="text-gray-600">{testimonial.role}</p>
                <div className="flex items-center gap-1 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < testimonial.rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Content */}
            <p className="text-gray-700 mb-6 italic">"{testimonial.content}"</p>

            {/* Stats */}
            <div className="pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Active member for 1+ year</span>
                </div>
                <div className="px-4 py-2 bg-gradient-to-r from-primary-50 to-purple-50 rounded-full">
                  <span className="font-bold text-primary-700">{testimonial.stats}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="text-center">
          <div className="text-4xl font-bold text-primary-600 mb-2">4.9/5</div>
          <div className="text-gray-600">Average Rating</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-primary-600 mb-2">50K+</div>
          <div className="text-gray-600">Happy Users</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-primary-600 mb-2">Rs10Cr+</div>
          <div className="text-gray-600">Saved by Renters</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-primary-600 mb-2">Rs25Cr+</div>
          <div className="text-gray-600">Earned by Owners</div>
        </div>
      </div>
    </div>
  );
};

export default Testimonials;
