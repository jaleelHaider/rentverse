import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Target, 
  Users, 
  Shield, 
  Zap
} from 'lucide-react'

const About: React.FC = () => {
  const team = [
    { name: 'Ali Khan', role: 'CEO & Founder', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ali' },
    { name: 'Sara Ahmed', role: 'Head of Product', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sara' },
    { name: 'Ahmed Raza', role: 'Tech Lead', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed' },
    { name: 'Fatima Malik', role: 'Community Manager', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fatima' },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-r from-primary-600 to-purple-600 text-white py-20">
        <div className="container-custom text-center">
          <h1 className="text-5xl font-bold mb-6">About RentVerse</h1>
          <p className="text-xl text-primary-100 max-w-3xl mx-auto">
            We're on a mission to revolutionize how Pakistan buys, sells, and rents items 
            by building the most trusted, intelligent marketplace in the country.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 bg-white">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full mb-6">
              <Target size={20} />
              <span className="font-medium">Our Mission</span>
            </div>
            <h2 className="text-3xl font-bold mb-6">
              Building a Smarter, Safer Marketplace for Pakistan
            </h2>
            <p className="text-lg text-gray-600">
              We believe in a future where anyone can easily rent what they need, 
              earn from what they own, and buy pre-loved items with complete confidence. 
              By combining AI technology with community trust, we're creating an ecosystem 
              that benefits everyone.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="text-blue-600" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">Trust First</h3>
              <p className="text-gray-600">
                Escrow payments, verified users, and AI-powered fraud detection 
                ensure every transaction is secure.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="text-green-600" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">AI-Powered</h3>
              <p className="text-gray-600">
                Smart pricing, image verification, and personalized recommendations 
                make every interaction intelligent.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="text-purple-600" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">Community Driven</h3>
              <p className="text-gray-600">
                Built by Pakistanis, for Pakistanis. We're growing with our 
                community's needs and feedback.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-gray-50">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">50,000+</div>
              <div className="text-gray-600">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">200,000+</div>
              <div className="text-gray-600">Listings</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">PKR 10Cr+</div>
              <div className="text-gray-600">Transaction Value</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">98%</div>
              <div className="text-gray-600">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 bg-white">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Meet Our Team</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              A passionate team of innovators, builders, and problem-solvers 
              dedicated to transforming Pakistan's marketplace.
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <div key={index} className="text-center">
                <img 
                  src={member.image} 
                  alt={member.name}
                  className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white shadow-lg"
                />
                <h3 className="font-bold text-lg">{member.name}</h3>
                <p className="text-gray-600">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-purple-600">
        <div className="container-custom text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Join Our Journey
          </h2>
          <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
            Whether you're looking to rent, sell, or buy, there's a place for 
            you in the RentVerse community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/register" 
              className="bg-white text-primary-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100"
            >
              Join Free Now
            </Link>
            <Link 
              to="/contact" 
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default About
