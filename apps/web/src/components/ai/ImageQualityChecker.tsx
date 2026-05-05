import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Loader } from 'lucide-react';
import { checkImageQuality, didImagePass, type ImageQualityCheckResponse } from '@/api/ai/imagecheck';

interface ImageQualityCheckerProps {
  onCheck?: (file: File, result: ImageQualityCheckResponse) => void;
  onError?: (error: string) => void;
}

const ImageQualityChecker: React.FC<ImageQualityCheckerProps> = ({ onCheck, onError }) => {
  const [result, setResult] = useState<ImageQualityCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      onError?.('Please select a valid image file');
      return;
    }

    setSelectedFile(file);
    setLoading(true);

    try {
      const checkResult = await checkImageQuality(file);
      setResult(checkResult);
      onCheck?.(file, checkResult);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const getVerdictColor = (verdict: string): string => {
    if (verdict === 'accept') return 'text-green-600';
    if (verdict === 'warn') return 'text-yellow-600';
    return 'text-red-600';
  };

  const getVerdictIcon = (verdict: string) => {
    if (verdict === 'accept') return <CheckCircle className="w-6 h-6" />;
    if (verdict === 'warn') return <AlertTriangle className="w-6 h-6" />;
    return <XCircle className="w-6 h-6" />;
  };

  return (
    <div className="w-full max-w-md">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition cursor-pointer"
      >
        <input
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
          className="hidden"
          id="image-input"
        />
        <label htmlFor="image-input" className="cursor-pointer block">
          <p className="text-sm text-gray-600 font-medium">Drag and drop an image here</p>
          <p className="text-xs text-gray-400 mt-1">or click to select</p>
        </label>
      </div>

      {/* Results */}
      {loading && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Loader className="w-5 h-5 animate-spin text-primary-600" />
          <span className="text-sm text-gray-600">Checking image quality...</span>
        </div>
      )}

      {result && !loading && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
          {/* Verdict */}
          <div className={`flex items-center gap-2 ${getVerdictColor(result.verdict)}`}>
            {getVerdictIcon(result.verdict)}
            <span className="font-semibold capitalize">{result.verdict}</span>
          </div>

          {/* Score */}
          <div>
            <p className="text-xs text-gray-600">Quality Score</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className={`h-2 rounded-full transition-all ${
                  result.score >= 0.7 ? 'bg-green-500' : result.score >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${result.score * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-1">{Math.round(result.score * 100)}%</p>
          </div>

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-yellow-700">Warnings:</p>
              <ul className="text-xs text-yellow-700 space-y-1 mt-1">
                {result.warnings.map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Failures */}
          {result.failures && result.failures.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-700">Issues:</p>
              <ul className="text-xs text-red-700 space-y-1 mt-1">
                {result.failures.map((f, i) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Metrics */}
          {result.metrics && Object.keys(result.metrics).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700">Metrics:</p>
              <div className="text-xs text-gray-600 space-y-1 mt-1">
                {Object.entries(result.metrics).map(([key, value]) => (
                  <p key={key}>
                    {key}: <span className="font-medium">{typeof value === 'number' ? value.toFixed(2) : value}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageQualityChecker;
