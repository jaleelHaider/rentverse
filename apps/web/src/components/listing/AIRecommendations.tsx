import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Lightbulb, 
  Target,
  BarChart3,
  Zap,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';

interface AIRecommendationsProps {
  listingData?: {
    title?: string;
    description?: string;
    category?: string;
    condition?: string;
    price?: number;
    location?: string;
  };
  onApplyRecommendation?: (type: string, value: unknown) => void;
}

interface Recommendation {
  id: string;
  type: 'price' | 'title' | 'description' | 'tags' | 'availability' | 'photos';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  value: unknown;
  confidence: number; // 0-100
  estimatedImprovement?: string;
}

const AIRecommendations: React.FC<AIRecommendationsProps> = ({
  listingData,
  onApplyRecommendation,
}) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(true);
  const [appliedRecommendations, setAppliedRecommendations] = useState<string[]>([]);
  const [overallScore, setOverallScore] = useState<number>(65);

  // Mock AI analysis based on listing data
  const analyzeListing = async () => {
    setIsAnalyzing(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockRecommendations: Recommendation[] = [
      {
        id: 'price-1',
        type: 'price',
        title: 'Optimize Rental Price',
        description: 'Based on similar listings in your area, consider adjusting your price by ±15% for better competitiveness.',
        impact: 'high',
        value: { adjustment: 0.85, reason: 'market_analysis' },
        confidence: 88,
        estimatedImprovement: '20% more views',
      },
      {
        id: 'title-1',
        type: 'title',
        title: 'Improve Title Keywords',
        description: 'Add keywords like "Premium", "Professional", or "Like New" to attract more renters.',
        impact: 'high',
        value: { keywords: ['Premium', 'Professional Grade', 'Excellent Condition'] },
        confidence: 92,
        estimatedImprovement: '15% click-through rate',
      },
      {
        id: 'description-1',
        type: 'description',
        title: 'Enhance Description',
        description: 'Add more details about usage scenarios, included accessories, and special features.',
        impact: 'medium',
        value: { sections: ['Usage Scenarios', 'Included Accessories', 'Special Features'] },
        confidence: 76,
        estimatedImprovement: 'Better conversion',
      },
      {
        id: 'tags-1',
        type: 'tags',
        title: 'Add Relevant Tags',
        description: 'Include tags like "weekend-rental", "event-ready", "beginner-friendly" to improve discoverability.',
        impact: 'medium',
        value: { tags: ['weekend-rental', 'event-ready', 'beginner-friendly'] },
        confidence: 81,
        estimatedImprovement: '30% more searches',
      },
      {
        id: 'availability-1',
        type: 'availability',
        title: 'Increase Availability',
        description: 'Consider offering weekend availability – 85% of rentals in your category are booked on weekends.',
        impact: 'low',
        value: { days: ['Friday', 'Saturday', 'Sunday'] },
        confidence: 67,
        estimatedImprovement: 'More booking options',
      },
    ];
    
    setRecommendations(mockRecommendations);
    
    // Calculate overall score based on how many improvements can be made
    const baseScore = 65;
    const improvementPotential = mockRecommendations.filter(r => r.impact === 'high').length * 10;
    setOverallScore(Math.min(95, baseScore + improvementPotential));
    
    setIsAnalyzing(false);
  };

  const handleApplyRecommendation = (recommendation: Recommendation) => {
    if (onApplyRecommendation) {
      onApplyRecommendation(recommendation.type, recommendation.value);
    }
    setAppliedRecommendations([...appliedRecommendations, recommendation.id]);
  };

  const getImpactColor = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
    }
  };

  const getImpactLabel = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high': return 'High Impact';
      case 'medium': return 'Medium Impact';
      case 'low': return 'Low Impact';
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void analyzeListing();
    }, 0);

    return () => clearTimeout(timer);
  }, [listingData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Sparkles className="h-6 w-6 text-purple-600 mr-3" />
          <h3 className="text-lg font-medium text-gray-900">AI Recommendations</h3>
        </div>
        <div className="flex items-center">
          <BarChart3 className="h-5 w-5 text-gray-400 mr-2" />
          <span className="text-sm font-medium text-gray-700">
            Listing Score: <span className="text-blue-600">{overallScore}/100</span>
          </span>
        </div>
      </div>

      {/* Analysis Status */}
      {isAnalyzing ? (
        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Analyzing your listing...</p>
          <p className="text-sm text-gray-500 mt-2">
            Comparing with similar listings and market trends
          </p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Potential Improvement</p>
                  <p className="text-xl font-bold text-gray-900">{100 - overallScore} points</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <Zap className="h-8 w-8 text-yellow-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">High Impact Changes</p>
                  <p className="text-xl font-bold text-gray-900">
                    {recommendations.filter(r => r.impact === 'high').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Applied</p>
                  <p className="text-xl font-bold text-gray-900">
                    {appliedRecommendations.length}/{recommendations.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations List */}
          <div className="space-y-4">
            {recommendations.map((recommendation) => {
              const isApplied = appliedRecommendations.includes(recommendation.id);
              
              return (
                <div
                  key={recommendation.id}
                  className={`
                    p-4 border rounded-xl transition-all
                    ${isApplied 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200 hover:border-blue-300'}
                  `}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-4">
                      <div className={`p-2 rounded-full ${getImpactColor(recommendation.impact)}`}>
                        {recommendation.type === 'price' && <DollarSign className="h-5 w-5" />}
                        {recommendation.type === 'title' && <Target className="h-5 w-5" />}
                        {recommendation.type === 'description' && <Lightbulb className="h-5 w-5" />}
                        {recommendation.type === 'tags' && <Sparkles className="h-5 w-5" />}
                        {recommendation.type === 'availability' && <Calendar className="h-5 w-5" />}
                        {recommendation.type === 'photos' && <Sparkles className="h-5 w-5" />}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">
                          {recommendation.title}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getImpactColor(recommendation.impact)}`}>
                          {getImpactLabel(recommendation.impact)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        {recommendation.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center text-sm text-gray-500">
                            <Sparkles className="h-4 w-4 mr-1 text-purple-400" />
                            <span>{recommendation.confidence}% confidence</span>
                          </div>
                          
                          {recommendation.estimatedImprovement && (
                            <div className="flex items-center text-sm text-gray-500">
                              <TrendingUp className="h-4 w-4 mr-1 text-green-400" />
                              <span>{recommendation.estimatedImprovement}</span>
                            </div>
                          )}
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => handleApplyRecommendation(recommendation)}
                          disabled={isApplied}
                          className={`
                            px-4 py-2 text-sm font-medium rounded-lg transition-colors
                            ${isApplied
                              ? 'bg-green-100 text-green-700 cursor-default'
                              : 'bg-blue-600 text-white hover:bg-blue-700'}
                          `}
                        >
                          {isApplied ? (
                            <>
                              <CheckCircle className="h-4 w-4 inline mr-2" />
                              Applied
                            </>
                          ) : (
                            'Apply Suggestion'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Insights */}
          <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
            <div className="flex items-start">
              <Sparkles className="h-5 w-5 text-purple-600 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900">AI Insights</h4>
                <ul className="mt-2 space-y-2 text-sm text-purple-800">
                  <li className="flex items-start">
                    <Zap className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Your listing is in the <strong>top 40%</strong> of similar items</span>
                  </li>
                  <li className="flex items-start">
                    <Clock className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Best posting time: <strong>Thursday evenings</strong> for 35% more visibility</span>
                  </li>
                  <li className="flex items-start">
                    <TrendingUp className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Seasonal trend: Demand increases by <strong>40%</strong> in summer months</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Re-analyze Button */}
          <div className="text-center">
            <button
              type="button"
              onClick={analyzeListing}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-analyze with Updates
            </button>
          </div>
        </>
      )}

      {/* Disclaimer */}
      <div className="text-xs text-gray-400 text-center">
        <p>AI recommendations are based on market analysis and should be used as guidelines.</p>
        <p>Always use your best judgment when listing items for rent.</p>
      </div>
    </div>
  );
};

export default AIRecommendations;
