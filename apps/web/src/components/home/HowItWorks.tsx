import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Upload, Calendar, CreditCard, Star } from 'lucide-react';

const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: 1,
      title: 'Find or List',
      description: 'Search for items you need or list items you want to rent out',
      icon: <Search className="h-8 w-8" />,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      step: 2,
      title: 'Connect & Book',
      description: 'Message the owner, check availability, and book instantly',
      icon: <Calendar className="h-8 w-8" />,
      color: 'from-purple-500 to-pink-500',
    },
    {
      step: 3,
      title: 'Secure Payment',
      description: 'Pay through RentVerse escrow. Money held until you confirm delivery',
      icon: <CreditCard className="h-8 w-8" />,
      color: 'from-green-500 to-emerald-500',
    },
    {
      step: 4,
      title: 'Enjoy & Review',
      description: 'Use the item, return it, and leave a review for others',
      icon: <Star className="h-8 w-8" />,
      color: 'from-orange-500 to-red-500',
    },
  ];

  return (
    <div className="container-custom">
      <div className="text-center mb-12">
        <h2 className="section-title">How RentVerse Works</h2>
        <p className="section-subtitle max-w-2xl mx-auto">
          From listing to earning, we've made it simple and secure
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {steps.map((step) => (
          <div key={step.step} className="relative">
            {/* Step Number */}
            <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-primary-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {step.step}
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-lg h-full">
              {/* Icon */}
              <div className={`w-20 h-20 bg-gradient-to-r ${step.color} rounded-2xl flex items-center justify-center text-white mb-6 mx-auto`}>
                {step.icon}
              </div>
              
              {/* Content */}
              <h3 className="text-xl font-bold text-center mb-4">{step.title}</h3>
              <p className="text-gray-600 text-center">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* For Renters & Owners */}
      <div className="grid md:grid-cols-2 gap-8 mt-16">
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Search className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">For Renters</h3>
              <p className="text-gray-600">Find what you need, when you need it</p>
            </div>
          </div>
          
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 font-bold">✓</span>
              </div>
              <span>Access thousands of items at affordable rates</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 font-bold">✓</span>
              </div>
              <span>No long-term commitments. Rent by day, week, or month</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 font-bold">✓</span>
              </div>
              <span>100% money-back guarantee if not satisfied</span>
            </li>
          </ul>
          
          <Link
            to="/browse"
            className="w-full mt-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 block text-center"
          >
            Start Renting
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
              <Upload className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">For Owners</h3>
              <p className="text-gray-600">Turn idle items into income</p>
            </div>
          </div>
          
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 font-bold">✓</span>
              </div>
              <span>Earn up to PKR 30,000/month from items you already own</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 font-bold">✓</span>
              </div>
              <span>Full control over pricing, availability, and who rents</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 font-bold">✓</span>
              </div>
              <span>Insurance & security deposit protection included</span>
            </li>
          </ul>
          
          <Link
            to="/create-listing"
            className="w-full mt-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 block text-center"
          >
            Start Earning
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
