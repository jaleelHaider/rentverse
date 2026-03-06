import React, { useState } from 'react';
import { Star, Award, Shield, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

interface ConditionSelectorProps {
  value?: string;
  onChange?: (condition: string, rating: number) => void;
  showQualityScore?: boolean;
}

const ConditionSelector: React.FC<ConditionSelectorProps> = ({
  value,
  onChange,
  showQualityScore = true,
}) => {
  const [selectedCondition, setSelectedCondition] = useState<string>(value || '');
  const [qualityScore, setQualityScore] = useState<number>(85); // 0-100
  const [conditionDetails, setConditionDetails] = useState<{
    scratches: boolean;
    stains: boolean;
    wear: boolean;
    repairs: boolean;
  }>({
    scratches: false,
    stains: false,
    wear: false,
    repairs: false,
  });

  const conditions = [
    {
      id: 'new',
      name: 'Brand New',
      description: 'Never used, with original packaging',
      icon: <Award className="h-6 w-6" />,
      color: 'bg-green-100 text-green-800',
      score: 100,
    },
    {
      id: 'excellent',
      name: 'Like New',
      description: 'Used gently, barely shows any wear',
      icon: <Star className="h-6 w-6" />,
      color: 'bg-blue-100 text-blue-800',
      score: 90,
    },
    {
      id: 'good',
      name: 'Good',
      description: 'Normal wear and tear, fully functional',
      icon: <CheckCircle className="h-6 w-6" />,
      color: 'bg-teal-100 text-teal-800',
      score: 75,
    },
    {
      id: 'fair',
      name: 'Fair',
      description: 'Visible wear but works perfectly',
      icon: <RefreshCw className="h-6 w-6" />,
      color: 'bg-yellow-100 text-yellow-800',
      score: 60,
    },
    {
      id: 'poor',
      name: 'Needs Work',
      description: 'Functional but needs repairs or cleaning',
      icon: <AlertTriangle className="h-6 w-6" />,
      color: 'bg-orange-100 text-orange-800',
      score: 40,
    },
  ];

  const conditionIssues = [
    { id: 'scratches', label: 'Minor scratches', impact: -5 },
    { id: 'stains', label: 'Stains or marks', impact: -10 },
    { id: 'wear', label: 'Visible wear', impact: -15 },
    { id: 'repairs', label: 'Previous repairs', impact: -20 },
  ];

  const handleConditionSelect = (conditionId: string) => {
    setSelectedCondition(conditionId);
    const condition = conditions.find(c => c.id === conditionId);
    if (condition && onChange) {
      let score = condition.score;
      
      // Adjust score based on selected issues
      Object.entries(conditionDetails).forEach(([key, value]) => {
        if (value) {
          const issue = conditionIssues.find(i => i.id === key);
          if (issue) {
            score += issue.impact;
          }
        }
      });
      
      // Ensure score is between 0 and 100
      score = Math.max(0, Math.min(100, score));
      setQualityScore(score);
      onChange(conditionId, score);
    }
  };

  const handleIssueToggle = (issueId: string) => {
    const updatedDetails = {
      ...conditionDetails,
      [issueId]: !conditionDetails[issueId as keyof typeof conditionDetails],
    };
    
    setConditionDetails(updatedDetails);
    
    if (selectedCondition && onChange) {
      const condition = conditions.find(c => c.id === selectedCondition);
      if (condition) {
        let score = condition.score;
        
        Object.entries(updatedDetails).forEach(([key, value]) => {
          if (value) {
            const issue = conditionIssues.find(i => i.id === key);
            if (issue) {
              score += issue.impact;
            }
          }
        });
        
        score = Math.max(0, Math.min(100, score));
        setQualityScore(score);
        onChange(selectedCondition, score);
      }
    }
  };

  const getConditionDescription = () => {
    const condition = conditions.find(c => c.id === selectedCondition);
    if (!condition) return null;
    
    const issueCount = Object.values(conditionDetails).filter(Boolean).length;
    
    return {
      main: condition.description,
      issues: issueCount > 0 
        ? `Has ${issueCount} issue${issueCount === 1 ? '' : 's'} noted below`
        : 'No specific issues noted',
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Item Condition</h3>
        {showQualityScore && selectedCondition && (
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-blue-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">
              Quality Score: <span className="text-blue-600">{qualityScore}/100</span>
            </span>
          </div>
        )}
      </div>

      {/* Condition Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {conditions.map((condition) => (
          <button
            key={condition.id}
            type="button"
            onClick={() => handleConditionSelect(condition.id)}
            className={`
              flex items-start p-4 border-2 rounded-xl text-left transition-all
              hover:border-blue-400 hover:shadow-sm
              ${selectedCondition === condition.id 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200'}
            `}
          >
            <div className={`p-3 rounded-full mr-4 ${condition.color}`}>
              {condition.icon}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{condition.name}</h4>
              <p className="text-sm text-gray-500 mt-1">{condition.description}</p>
              <div className="flex items-center mt-3">
                <div className="flex-1">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${condition.color.split(' ')[0]}`}
                      style={{ width: `${condition.score}%` }}
                    />
                  </div>
                </div>
                <span className={`ml-3 text-sm font-medium ${condition.color.split(' ')[1]}`}>
                  {condition.score}%
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Condition Issues */}
      {selectedCondition && (
        <div className="pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-4">
            Specific Issues (Optional)
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {conditionIssues.map((issue) => (
              <label
                key={issue.id}
                className={`
                  flex items-center p-3 border rounded-lg cursor-pointer transition-colors
                  ${conditionDetails[issue.id as keyof typeof conditionDetails]
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 hover:bg-gray-50'}
                `}
              >
                <input
                  type="checkbox"
                  checked={conditionDetails[issue.id as keyof typeof conditionDetails]}
                  onChange={() => handleIssueToggle(issue.id)}
                  className="h-4 w-4 text-red-600 rounded focus:ring-red-500"
                />
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-900">
                    {issue.label}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">
                    Reduces quality by {Math.abs(issue.impact)} points
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Condition Summary */}
      {selectedCondition && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className={`p-2 rounded-full ${conditions.find(c => c.id === selectedCondition)?.color}`}>
                {conditions.find(c => c.id === selectedCondition)?.icon}
              </div>
            </div>
            <div className="ml-4">
              <h4 className="font-medium text-gray-900">
                {conditions.find(c => c.id === selectedCondition)?.name} Condition
              </h4>
              {getConditionDescription() && (
                <>
                  <p className="text-sm text-gray-600 mt-1">
                    {getConditionDescription()?.main}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {getConditionDescription()?.issues}
                  </p>
                </>
              )}
              
              {showQualityScore && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      Overall Quality:
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {qualityScore}/100
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        qualityScore >= 80 ? 'bg-green-500' :
                        qualityScore >= 60 ? 'bg-yellow-500' :
                        qualityScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${qualityScore}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Poor</span>
                    <span>Fair</span>
                    <span>Good</span>
                    <span>Excellent</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500">
        <p className="mb-1">• Be honest about condition to avoid disputes</p>
        <p className="mb-1">• Include photos that show any wear or damage</p>
        <p>• Better condition typically means higher rental rates</p>
      </div>
    </div>
  );
};

export default ConditionSelector;