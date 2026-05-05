import React from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Specification {
  label: string;
  value: string | boolean | number;
  category: string;
  important?: boolean;
}

interface SpecificationsProps {
  listing: {
    specifications?: Record<string, string | boolean | number>;
    features?: string[];
    condition: string;
    category: string;
    subCategory?: string;
  };
}

const Specifications: React.FC<SpecificationsProps> = ({ listing }) => {
  // Default specifications if none provided
  const defaultSpecs: Specification[] = [
    { label: 'Condition', value: listing.condition, category: 'General', important: true },
    { label: 'Brand', value: 'Sony', category: 'General', important: true },
    { label: 'Model', value: 'A7III', category: 'General', important: true },
    { label: 'Year of Manufacture', value: '2022', category: 'General' },
    { label: 'Warranty', value: '3 months remaining', category: 'General' },
    { label: 'Weight', value: '1.5 kg', category: 'Physical' },
    { label: 'Dimensions', value: '12.7 x 9.6 x 7.6 cm', category: 'Physical' },
    { label: 'Material', value: 'Magnesium alloy', category: 'Physical' },
    { label: 'Sensor Type', value: 'Full-frame CMOS', category: 'Technical' },
    { label: 'Megapixels', value: '24.2 MP', category: 'Technical' },
    { label: 'ISO Range', value: '100-51200', category: 'Technical' },
    { label: 'Autofocus Points', value: '693', category: 'Technical' },
    { label: 'Video Resolution', value: '4K 30fps', category: 'Technical' },
    { label: 'Battery Life', value: '710 shots', category: 'Technical' },
    { label: 'Wi-Fi', value: true, category: 'Connectivity' },
    { label: 'Bluetooth', value: true, category: 'Connectivity' },
    { label: 'NFC', value: true, category: 'Connectivity' },
    { label: 'GPS', value: false, category: 'Connectivity' },
  ];

  const specifications = listing.specifications 
    ? Object.entries(listing.specifications)
        .filter(([label]) => !label.startsWith('__'))
        .map(([label, value]) => ({
          label,
          value,
          category: 'Custom',
          important: false,
        }))
    : defaultSpecs;

  // Group specifications by category
  const groupedSpecs: Record<string, Specification[]> = {};
  specifications.forEach(spec => {
    if (!groupedSpecs[spec.category]) {
      groupedSpecs[spec.category] = [];
    }
    groupedSpecs[spec.category].push(spec);
  });

  const renderValue = (value: string | boolean | number) => {
    if (typeof value === 'boolean') {
      return value ? (
        <span className="inline-flex items-center text-green-600">
          <CheckCircle className="h-4 w-4 mr-1" />
          Yes
        </span>
      ) : (
        <span className="inline-flex items-center text-red-600">
          <XCircle className="h-4 w-4 mr-1" />
          No
        </span>
      );
    }
    return value;
  };

  return (
    <div className="space-y-8">
      {/* Important Specifications */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-orange-500 mr-2" />
          Key Specifications
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {specifications
            .filter(spec => spec.important)
            .map((spec, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">{spec.label}</div>
                <div className="font-medium text-gray-900 text-lg">
                  {renderValue(spec.value)}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* All Specifications by Category */}
      {Object.entries(groupedSpecs).map(([category, specs]) => (
        <div key={category}>
          <h3 className="text-lg font-semibold mb-4">{category}</h3>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <tbody>
                {specs.map((spec, index) => (
                  <tr 
                    key={index} 
                    className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                  >
                    <td className="py-3 px-4 text-gray-700 font-medium border-r border-gray-200 w-1/3">
                      {spec.label}
                    </td>
                    <td className="py-3 px-4 text-gray-900">
                      {renderValue(spec.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Features List */}
      {listing.features && listing.features.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Key Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {listing.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <span className="text-gray-800">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800 mb-2">Important Note</h4>
            <p className="text-sm text-yellow-700">
              Specifications are provided by the seller. Please verify all details before renting or purchasing.
              RentVerse recommends testing the item to ensure it meets your requirements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Specifications;
