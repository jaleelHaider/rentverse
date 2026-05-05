import React, { useEffect, useState } from 'react';
import { Star, Award, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { CONDITION_DESCRIPTIONS, CONDITION_ISSUES_OPTIONS } from '../../utils/conditionDescriptions';

interface ConditionSelectorProps {
  value?: string;
  initialIssues?: string[];
  initialNote?: string;
  onConditionChange?: (condition: string, issues: string[], note: string) => void;
}

const ConditionSelector: React.FC<ConditionSelectorProps> = ({
  value,
  initialIssues = [],
  initialNote = '',
  onConditionChange,
}) => {
  const [selectedCondition, setSelectedCondition] = useState<string>(value || '');
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set(initialIssues));
  const [customNote, setCustomNote] = useState<string>(initialNote);

  useEffect(() => {
    setSelectedCondition(value || '');
  }, [value]);

  useEffect(() => {
    setSelectedIssues(new Set(initialIssues));
  }, [initialIssues]);

  useEffect(() => {
    setCustomNote(initialNote);
  }, [initialNote]);

  const conditions = [
    {
      id: 'new',
      name: 'Brand New',
      description: 'Never used, with original packaging',
      icon: <Award className="h-6 w-6" />,
      color: 'bg-green-100 text-green-800',
    },
    {
      id: 'like_new',
      name: 'Like New',
      description: 'Used gently, barely shows any wear',
      icon: <Star className="h-6 w-6" />,
      color: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'good',
      name: 'Good',
      description: 'Normal wear and tear, fully functional',
      icon: <CheckCircle className="h-6 w-6" />,
      color: 'bg-teal-100 text-teal-800',
    },
    {
      id: 'fair',
      name: 'Fair',
      description: 'Visible wear but works perfectly',
      icon: <RefreshCw className="h-6 w-6" />,
      color: 'bg-yellow-100 text-yellow-800',
    },
    {
      id: 'poor',
      name: 'Needs Work',
      description: 'Functional but needs repairs or cleaning',
      icon: <AlertTriangle className="h-6 w-6" />,
      color: 'bg-orange-100 text-orange-800',
    },
  ];

  const handleConditionSelect = (conditionId: string) => {
    setSelectedCondition(conditionId);
    if (onConditionChange) {
      onConditionChange(conditionId, Array.from(selectedIssues), customNote);
    }
  };

  const handleIssueToggle = (issueId: string) => {
    const newIssues = new Set(selectedIssues);
    if (newIssues.has(issueId)) {
      newIssues.delete(issueId);
    } else {
      newIssues.add(issueId);
    }
    setSelectedIssues(newIssues);

    if (selectedCondition && onConditionChange) {
      onConditionChange(selectedCondition, Array.from(newIssues), customNote);
    }
  };

  const getConditionInfo = (conditionId: string) => {
    return CONDITION_DESCRIPTIONS[conditionId];
  };

  const selectedConditionInfo = selectedCondition ? conditions.find(c => c.id === selectedCondition) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Item Condition</h3>
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
            </div>
          </button>
        ))}
      </div>

      {/* Condition Issues */}
      {selectedCondition && (
        <div className="pt-6 border-t border-gray-200 space-y-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">
              Specific Issues (Optional)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {CONDITION_ISSUES_OPTIONS.map((issue) => (
                <label
                  key={issue.id}
                  className={`
                    flex items-center p-3 border rounded-lg cursor-pointer transition-colors
                    ${selectedIssues.has(issue.id)
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-200 hover:bg-gray-50'}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedIssues.has(issue.id)}
                    onChange={() => handleIssueToggle(issue.id)}
                    className="h-4 w-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-900">
                      {issue.label}
                    </span>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {issue.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Product Details/Notes */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Note (Optional)
            </h4>
            <p className="text-xs text-gray-500 mb-3">
              Add one short custom note buyers should see on the listing.
            </p>
            <textarea
              value={customNote}
              onChange={(e) => {
                const nextNote = e.target.value;
                setCustomNote(nextNote);
                if (selectedCondition && onConditionChange) {
                  onConditionChange(selectedCondition, Array.from(selectedIssues), nextNote);
                }
              }}
              rows={3}
              placeholder="e.g., Original charger included"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Condition Summary with Detailed Description */}
      {selectedCondition && selectedConditionInfo && (
        <div className={`p-4 ${selectedConditionInfo.color.split(' ')[1]} rounded-lg border-2 ${selectedConditionInfo.color.split(' ')[1]}`}>
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-4">
              <span className="text-2xl">{getConditionInfo(selectedCondition)?.icon}</span>
            </div>
            <div className="flex-1">
              <h4 className={`font-semibold ${selectedConditionInfo.color.split(' ')[1]}`}>
                {selectedConditionInfo.name} Condition
              </h4>
              <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                {getConditionInfo(selectedCondition)?.fullDescription}
              </p>
              
              {selectedIssues.size > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Issues noted:</span> {Array.from(selectedIssues).map(id => {
                    const issue = CONDITION_ISSUES_OPTIONS.find(i => i.id === id);
                    return issue?.label;
                  }).join(', ')}
                </p>
              )}

              {customNote.trim() ? (
                <p className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Note:</span> {customNote.trim()}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Be honest about condition to avoid disputes</p>
        <p>• Include photos showing any wear or damage</p>
        <p>• Add detailed product information to increase buyer confidence</p>
      </div>
    </div>
  );
};

export default ConditionSelector;

