import React from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiShoppingBag, FiUserCheck, FiZap } from 'react-icons/fi';

const Home = () => {
  const features = [
    {
      icon: <FiUsers className="h-8 w-8" />,
      title: "Multi-Seller Platform",
      description: "Multiple sellers can list and manage their products independently"
    },
    {
      icon: <FiShoppingBag className="h-8 w-8" />,
      title: "Easy Shopping",
      description: "Buyers can browse all products, add to cart, and make purchase requests"
    },
    {
      icon: <FiUserCheck className="h-8 w-8" />,
      title: "Role-Based Access",
      description: "Separate dashboards and features for sellers and buyers"
    },
    {
      icon: <FiZap className="h-8 w-8" />,
      title: "Real-Time Requests",
      description: "Instant buy request notifications with buyer location and details"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="hero-gradient text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Welcome to <span className="text-yellow-300">FarmConnect</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200">
              Connecting farmers directly with consumers for fresh, quality produce
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="bg-white text-purple-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                I'm a Seller
              </Link>
              <Link
                to="/register"
                className="bg-primary-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-primary-700 transition-colors duration-200"
              >
                I'm a Buyer
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Start?
            </h2>
            <p className="text-xl text-gray-300">
              Choose your role and join our marketplace community
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="text-primary-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/products"
              className="bg-primary-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-primary-700 transition-colors duration-200 inline-block"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Join FarmConnect Today
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Start connecting with local farmers and fresh produce
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-primary-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              Get Started
            </Link>
            <Link
              to="/products"
              className="border-2 border-white text-white font-bold py-3 px-8 rounded-lg hover:bg-white hover:text-primary-600 transition-colors duration-200"
            >
              Explore Products
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
