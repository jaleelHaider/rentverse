import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Users, DollarSign, Shield, Clock, Repeat } from 'lucide-react';

const StatsSection: React.FC = () => {
  const stats = [
    {
      icon: <TrendingUp className="h-8 w-8" />,
      value: '45%',
      label: 'Average Monthly Growth',
      description: 'Year-over-year user growth',
      color: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    },
    {
      icon: <Users className="h-8 w-8" />,
      value: '200K+',
      label: 'Active Community',
      description: 'Across 50+ cities in Pakistan',
      color: 'bg-gradient-to-r from-green-500 to-emerald-500',
    },
    {
      icon: <DollarSign className="h-8 w-8" />,
      value: 'Rs35Cr+',
      label: 'Total Transactions',
      description: 'Secure payments processed',
      color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    },
    {
      icon: <Shield className="h-8 w-8" />,
      value: '99.8%',
      label: 'Transaction Success',
      description: 'With zero fraud incidents',
      color: 'bg-gradient-to-r from-orange-500 to-red-500',
    },
  ];

  const features = [
    {
      icon: <Clock className="h-6 w-6" />,
      title: 'Quick Setup',
      description: 'List items in under 2 minutes',
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Full Protection',
      description: 'AI-powered fraud detection',
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: 'Smart Pricing',
      description: 'AI suggests optimal rates',
    },
    {
      icon: <Repeat className="h-6 w-6" />,
      title: 'Easy Returns',
      description: 'Simple pickup & drop-off',
    },
  ];

  return (
    <div className="py-16 bg-gray-900">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Numbers That Speak
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Join Pakistan's fastest-growing rental economy
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-gray-800 rounded-2xl p-6 hover:bg-gray-700 transition-colors group"
            >
              <div className={`${stat.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <div className="text-white">{stat.icon}</div>
              </div>
              
              <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
              <div className="text-lg font-semibold text-gray-200 mb-2">{stat.label}</div>
              <div className="text-gray-400 text-sm">{stat.description}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="bg-gray-800 rounded-3xl p-8 md:p-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-14 h-14 bg-gradient-to-r from-primary-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <div className="text-white">{feature.icon}</div>
                </div>
                <h4 className="text-xl font-bold text-white mb-2">{feature.title}</h4>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 pt-8 border-t border-gray-700 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              Ready to join the sharing economy revolution?
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/browse"
                className="px-8 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg block text-center"
              >
                Start Renting
              </Link>
              <Link
                to="/how-it-works"
                className="px-8 py-3 border-2 border-gray-600 text-gray-300 rounded-xl font-bold hover:bg-gray-700 block text-center"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>

        {/* Environmental Impact */}
        <div className="mt-12 bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-3xl p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">
            ♻️ Sustainable Choice
          </h3>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            By renting instead of buying, our community has prevented over 15,000 tons of e-waste
            and saved 45,000+ items from landfills. Join us in building a circular economy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatsSection;
