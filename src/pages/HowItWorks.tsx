import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Search, 
  Calendar, 
  Shield, 
  DollarSign, 
  MessageCircle,
  CheckCircle,
  UserPlus,
  Package,
  Star,
  Clock,
  TrendingUp,
  Users
} from 'lucide-react'

const HowItWorks: React.FC = () => {
  const buyerSteps = [
    {
      icon: <Search size={32} />,
      title: 'Browse & Search',
      description: 'Find exactly what you need using our AI-powered search and filters',
      details: 'Filter by category, location, price range, and rental duration'
    },
    {
      icon: <Calendar size={32} />,
      title: 'Select Dates & Book',
      description: 'Choose your rental dates or make a purchase offer',
      details: 'Check real-time availability and set your preferred dates'
    },
    {
      icon: <Shield size={32} />,
      title: 'Secure Payment',
      description: 'Pay through our escrow system for complete protection',
      details: 'Funds held securely until you confirm item delivery'
    },
    {
      icon: <Package size={32} />,
      title: 'Receive & Enjoy',
      description: 'Get your item delivered or pick it up safely',
      details: 'Use in-app OTP verification for secure handover'
    }
  ]

  const sellerSteps = [
    {
      icon: <UserPlus size={32} />,
      title: 'Create Account',
      description: 'Sign up and verify your profile to build trust',
      details: 'Complete your profile with ID verification for higher trust score'
    },
    {
      icon: <Package size={32} />,
      title: 'List Your Item',
      description: 'Add photos, description, and set your price',
      details: 'Use our AI suggestions for optimal pricing and description'
    },
    {
      icon: <MessageCircle size={32} />,
      title: 'Manage Inquiries',
      description: 'Chat with potential buyers/renters in the app',
      details: 'Respond quickly to boost your response rate and visibility'
    },
    {
      icon: <DollarSign size={32} />,
      title: 'Get Paid Securely',
      description: 'Receive payments directly to your account',
      details: 'Choose from multiple withdrawal options including bank transfer'
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-purple-50 py-20">
        <div className="container-custom text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            How RentVerse Works
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A simple, secure way to rent, buy, and sell items in Pakistan. 
            Whether you're looking to earn from idle items or rent what you need, we've got you covered.
          </p>
        </div>
      </section>

      {/* Tabs Section */}
      <section className="py-16 bg-white">
        <div className="container-custom">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full mb-4">
              <TrendingUp size={20} />
              <span className="font-medium">Dual Marketplace</span>
            </div>
            <h2 className="text-3xl font-bold mb-4">Two Sides, One Platform</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              RentVerse serves both buyers/renters and sellers equally with specialized workflows
            </p>
          </div>

          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-gray-100 rounded-full p-1">
              <button className="px-8 py-3 rounded-full bg-white shadow-sm font-semibold">
                For Buyers & Renters
              </button>
              <button className="px-8 py-3 rounded-full font-semibold text-gray-600 hover:text-gray-900">
                For Sellers
              </button>
            </div>
          </div>

          {/* Buyer Steps */}
          <div className="mb-20">
            <h3 className="text-2xl font-bold mb-10 text-center">How to Rent or Buy</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {buyerSteps.map((step, index) => (
                <div key={index} className="relative">
                  <div className="card p-8 text-center h-full">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <div className="text-blue-600">
                        {step.icon}
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-bold mb-3">
                        {index + 1}
                      </div>
                      <h4 className="text-xl font-bold mb-3">{step.title}</h4>
                      <p className="text-gray-700 mb-4">{step.description}</p>
                      <p className="text-sm text-gray-500">{step.details}</p>
                    </div>
                  </div>
                  {index < buyerSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2">
                      <div className="w-8 h-0.5 bg-gray-300"></div>
                      <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-0 border-l-0 transform rotate-45"></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Seller Steps */}
          <div>
            <h3 className="text-2xl font-bold mb-10 text-center">How to Sell or Rent Out</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {sellerSteps.map((step, index) => (
                <div key={index} className="relative">
                  <div className="card p-8 text-center h-full">
                    <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <div className="text-green-600">
                        {step.icon}
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="inline-flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full text-sm font-bold mb-3">
                        {index + 1}
                      </div>
                      <h4 className="text-xl font-bold mb-3">{step.title}</h4>
                      <p className="text-gray-700 mb-4">{step.description}</p>
                      <p className="text-sm text-gray-500">{step.details}</p>
                    </div>
                  </div>
                  {index < sellerSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2">
                      <div className="w-8 h-0.5 bg-gray-300"></div>
                      <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-0 border-l-0 transform rotate-45"></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-16 bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Built-in Security & Trust</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We've implemented multiple layers of protection for every transaction
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Shield className="text-purple-600" size={24} />
                </div>
                <h3 className="text-xl font-bold">Escrow Protection</h3>
              </div>
              <p className="text-gray-600">
                Payments are held securely in escrow until both parties confirm successful transaction completion.
                No more worrying about scams or fraudulent sellers.
              </p>
            </div>
            
            <div className="card p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Star className="text-blue-600" size={24} />
                </div>
                <h3 className="text-xl font-bold">Verified Profiles</h3>
              </div>
              <p className="text-gray-600">
                Users can verify their identity with CNIC and phone verification. 
                Build your trust score with successful transactions and positive reviews.
              </p>
            </div>
            
            <div className="card p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="text-green-600" size={24} />
                </div>
                <h3 className="text-xl font-bold">AI Fraud Detection</h3>
              </div>
              <p className="text-gray-600">
                Our AI system analyzes listings, images, and user behavior to flag potential scams 
                and maintain a safe marketplace environment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-600">Quick answers to common questions</p>
          </div>
          
          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                q: 'How does the escrow payment system work?',
                a: 'When you make a payment, funds are held securely by RentVerse. The seller is notified to prepare the item. Once you receive and confirm the item is as described, we release the payment to the seller. For rentals, security deposits are refunded after safe return.'
              },
              {
                q: 'What fees does RentVerse charge?',
                a: 'We charge a 5% service fee on rental transactions and 3% on sales. These fees help us maintain the platform, provide customer support, and invest in security features like escrow protection.'
              },
              {
                q: 'How do I ensure safe meetups for transactions?',
                a: 'We recommend meeting in public places during daylight hours. Use our in-app chat for communication and never share personal banking details. For high-value items, consider using our partner delivery services.'
              },
              {
                q: 'What happens if the item is damaged during rental?',
                a: 'The security deposit covers minor damages. For significant damage, our dispute resolution team will review the case based on photos and evidence from both parties before making a fair decision.'
              }
            ].map((faq, index) => (
              <div key={index} className="card p-6">
                <h4 className="font-bold text-lg mb-3">{faq.q}</h4>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-purple-600">
        <div className="container-custom text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
            Join thousands of Pakistanis who are already buying, selling, and renting smarter.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/register" 
              className="bg-white text-primary-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors"
            >
              Create Free Account
            </Link>
            <Link 
              to="/browse" 
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-colors"
            >
              Browse Listings
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HowItWorks