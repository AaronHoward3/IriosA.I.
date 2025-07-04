
import React from 'react';
import { Link } from 'react-router-dom';
import { GradientButton } from '@/components/ui/gradient-button';
import { ArrowRight } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { useTheme } from '@/contexts/ThemeContext';

const Home = () => {
  const { theme } = useTheme();

  return (
    <>
      <Navigation />
      <div className="relative min-h-screen overflow-hidden pt-16">
        {/* Conditional Background Image */}
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat w-full h-full"
          style={{ 
            backgroundImage: theme === 'dark' 
              ? `url(/lovable-uploads/a7f4769e-d4d7-484e-af11-ea25e93cf98e.png)`
              : `url(/lovable-uploads/8f705eeb-1097-41b5-a9f8-7fe34598da87.png)`
          }}
        />

        {/* Content */}
        <div className="relative z-20 min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-4xl mx-auto space-y-8">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight bg-gradient-to-r from-gradient-start to-gradient-end bg-clip-text text-transparent">
              SendAI
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed font-medium">
              Create beautiful, responsive email templates with AI-powered generation. 
              Transform your email marketing with professional designs that work across all devices.
            </p>

            <div className="pt-8">
              <Link to="/generator">
                <GradientButton variant="solid" size="xl" className="group font-bold">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </GradientButton>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
